import { automationAuthorized } from "../_shared/automation-auth.js";
import { apiSecurityHeaders, trustedMutationRequest } from "../_shared/http.js";
import {
  createTikTokAdsClient,
  mapTikTokAdSpend,
  runProfitAutomaticSync
} from "../_shared/profit-sync.js";
import { applyPatch, normalizeData, normalizePatch } from "./state.js";

const responseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...apiSecurityHeaders()
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function configuredConnections(env) {
  let source;
  try {
    source = JSON.parse(String(env?.TIKTOK_SHOP_CONNECTIONS || "[]"));
  } catch {
    return [];
  }
  return (Array.isArray(source) ? source : []).filter((connection) => (
    connection
      && typeof connection === "object"
      && String(connection.storeId || "")
      && String(connection.shopCipher || "")
      && String(connection.accessToken || "")
  )).map((connection, index) => ({
    id: String(connection.id || `connection-${index + 1}`),
    storeId: String(connection.storeId),
    shopId: String(connection.shopId || ""),
    shopCipher: String(connection.shopCipher),
    accessToken: String(connection.accessToken),
    refreshToken: String(connection.refreshToken || ""),
    storeTimezone: String(connection.storeTimezone || "America/Los_Angeles"),
    advertiserId: String(connection.advertiserId || ""),
    adMappings: (Array.isArray(connection.adMappings) ? connection.adMappings : []).map((mapping) => ({
      adId: String(mapping?.adId || ""),
      adgroupId: String(mapping?.adgroupId || ""),
      campaignId: String(mapping?.campaignId || ""),
      listingId: String(mapping?.listingId || ""),
      platformListingId: String(mapping?.platformListingId || "")
    })).filter((mapping) => (
      (mapping.adId || mapping.adgroupId || mapping.campaignId)
      && (mapping.listingId || mapping.platformListingId)
    )),
    status: connection.status === "disabled" ? "disabled" : "active"
  }));
}

async function readWorkbenchState(db) {
  const row = await db.prepare(
    "SELECT version, updated_at, revision, data FROM workbench_state WHERE id = ?"
  ).bind("main").first();
  return row ? {
    version: row.version || "v2",
    updatedAt: row.updated_at || null,
    revision: Number(row.revision || 0),
    data: normalizeData(JSON.parse(row.data))
  } : null;
}

async function commitProfitCollections(db, collections, now, maxAttempts = 12) {
  const patch = normalizePatch({ patch: { collections } });
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await readWorkbenchState(db);
    const nextData = applyPatch(current?.data || null, patch);
    const updatedAt = now.toISOString();
    if (current && JSON.stringify(nextData) === JSON.stringify(current.data)) return current;
    if (!current) {
      const inserted = await db.prepare(
        "INSERT OR IGNORE INTO workbench_state (id, version, updated_at, revision, data) VALUES (?, ?, ?, ?, ?)"
      ).bind("main", "v2", updatedAt, 1, JSON.stringify(nextData)).run();
      if (inserted.meta?.changes === 1) return { version: "v2", updatedAt, revision: 1, data: nextData };
      continue;
    }
    const revision = current.revision + 1;
    const updated = await db.prepare(
      "UPDATE workbench_state SET version = ?, updated_at = ?, revision = ?, data = ? WHERE id = ? AND revision = ?"
    ).bind("v2", updatedAt, revision, JSON.stringify(nextData), "main", current.revision).run();
    if (updated.meta?.changes === 1) return { version: "v2", updatedAt, revision, data: nextData };
  }
  throw Object.assign(new Error("云端状态正在并发更新，请稍后重试"), { code: "SYNC_CONFLICT" });
}

export function createProfitSyncHandler({
  runSync = runProfitAutomaticSync,
  now = () => new Date(),
  createAdsClient = createTikTokAdsClient
} = {}) {
  return async function handleProfitSync({ request, env, data = {} }) {
    const automation = automationAuthorized(request, env);
    if (!automation && data?.user?.role !== "admin") return json(403, { error: "仅管理员可触发利润同步" });
    if (!trustedMutationRequest(request)) return json(403, { error: "Cross-site write request blocked" });
    const connections = configuredConnections(env);
    if (!connections.length) {
      return json(409, {
        error: "尚未配置 TikTok Shop 店铺授权",
        code: "PROFIT_SYNC_UNCONFIGURED"
      });
    }
    if (!env?.TIKTOK_SHOP_APP_KEY || !env?.TIKTOK_SHOP_APP_SECRET) {
      return json(409, {
        error: "尚未配置 TikTok Shop 应用密钥",
        code: "PROFIT_SYNC_APP_UNCONFIGURED"
      });
    }
    let body = {};
    try {
      if (request.headers.get("content-length") !== "0") body = await request.json();
    } catch {
      body = {};
    }
    const requestedDate = String(body?.dateKey || "");
    if (requestedDate && !/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return json(400, { error: "经营日期格式无效" });
    }
    const startedAt = now();
    const current = await readWorkbenchState(env.DB);
    try {
      const loadAdSpend = async (connection, { dateKey }) => {
        if (!env?.TIKTOK_ADS_ACCESS_TOKEN || !connection?.advertiserId || !connection?.adMappings?.length) {
          return [];
        }
        const client = createAdsClient({
          accessToken: env.TIKTOK_ADS_ACCESS_TOKEN,
          advertiserId: connection.advertiserId
        });
        const report = await client.loadDailyReport({ dateKey });
        return mapTikTokAdSpend(report, connection, dateKey);
      };
      const result = await runSync({
        state: current?.data || normalizeData(null),
        connections,
        dateKey: requestedDate || undefined,
        syncedAt: startedAt.toISOString(),
        appKey: env.TIKTOK_SHOP_APP_KEY,
        appSecret: env.TIKTOK_SHOP_APP_SECRET,
        loadAdSpend
      });
      if (result.status === "unconfigured" || !Object.keys(result.collections || {}).length) {
        return json(409, { error: "尚未配置可用店铺授权", code: "PROFIT_SYNC_UNCONFIGURED" });
      }
      const committed = await commitProfitCollections(env.DB, result.collections, startedAt);
      return json(200, {
        status: result.status,
        revision: committed.revision,
        updatedAt: committed.updatedAt,
        failures: result.failures || [],
        diagnostics: result.diagnostics || []
      });
    } catch (error) {
      const retryable = ["SYNC_CONFLICT", "TIKTOK_API_ERROR"].includes(error?.code);
      return json(retryable ? 503 : 500, {
        error: String(error?.message || "利润同步失败").slice(0, 240),
        code: error?.code || "PROFIT_SYNC_FAILED",
        retryable
      });
    }
  };
}

export const onRequestPost = createProfitSyncHandler();

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed" });
}

export { commitProfitCollections, configuredConnections };
