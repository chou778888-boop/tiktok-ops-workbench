import {
  apiSecurityHeaders,
  corsHeaders,
  requestBodyWithinLimit,
  trustedMutationRequest
} from "../_shared/http.js";

const baseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...apiSecurityHeaders()
};

const arrayKeys = {
  entries: "id",
  products: "id",
  tasks: "id",
  reports: "id",
  reportAnalyses: "key",
  customCreators: "id",
  deletedCreators: "id",
  blanketRemovedCreators: "id",
  headRemovedCreators: "id",
  creatorHistory: "id",
  costProfiles: "id",
  profitStores: "id",
  profitProducts: "id",
  profitSkuMasters: "id",
  profitListings: "id",
  profitListingSkus: "id",
  profitDailyFacts: "id",
  profitDailyExpenses: "id",
  profitDailySettlements: "id",
  profitProductCostHistory: "id",
  profitSyncRecords: "id",
  profitPriceObservations: "id"
};

const reportStoreKeys = new Set([
  "DreamWeave",
  "sweet dream",
  "Dreamland",
  "Dreamdaily",
  "MoonDream",
  "Himood Smile"
].map((name) => name.trim().toLowerCase()));

const maxCostImageLength = 220000;
const costImagePattern = /^data:image\/(?:png|jpe?g|webp);base64,/i;
const costImageUrlPattern = /^(?:https:\/\/tiktok-ops-workbench\.pages\.dev)?\/api\/cost-image\?id=[a-f0-9]{64}$/i;

function validCostImage(value) {
  const image = String(value || "");
  return !image
    || costImageUrlPattern.test(image)
    || (image.length <= maxCostImageLength && costImagePattern.test(image));
}

function responseHeaders(request) {
  return { ...baseHeaders, ...corsHeaders(request) };
}

function json(status, body, request) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(request) });
}

function normalizeData(data) {
  return {
    entries: Array.isArray(data?.entries) ? data.entries : [],
    products: Array.isArray(data?.products) ? data.products : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks.map((task) => ({
      ...task,
      syncVersion: Math.max(1, Number(task?.syncVersion || 0))
    })) : [],
    reports: Array.isArray(data?.reports) ? data.reports : [],
    reportAnalyses: Array.isArray(data?.reportAnalyses) ? data.reportAnalyses : [],
    customCreators: Array.isArray(data?.customCreators) ? data.customCreators : [],
    deletedCreators: Array.isArray(data?.deletedCreators) ? data.deletedCreators : [],
    blanketRemovedCreators: Array.isArray(data?.blanketRemovedCreators) ? data.blanketRemovedCreators : [],
    headRemovedCreators: Array.isArray(data?.headRemovedCreators) ? data.headRemovedCreators : [],
    creatorEdits: data?.creatorEdits && typeof data.creatorEdits === "object" ? data.creatorEdits : {},
    creatorHistory: Array.isArray(data?.creatorHistory) ? data.creatorHistory : [],
    costProfiles: Array.isArray(data?.costProfiles) ? data.costProfiles : [],
    profitStores: Array.isArray(data?.profitStores) ? data.profitStores : [],
    profitProducts: Array.isArray(data?.profitProducts) ? data.profitProducts : [],
    profitSkuMasters: Array.isArray(data?.profitSkuMasters) ? data.profitSkuMasters : [],
    profitListings: Array.isArray(data?.profitListings) ? data.profitListings : [],
    profitListingSkus: Array.isArray(data?.profitListingSkus) ? data.profitListingSkus : [],
    profitDailyFacts: Array.isArray(data?.profitDailyFacts) ? data.profitDailyFacts : [],
    profitDailyExpenses: Array.isArray(data?.profitDailyExpenses) ? data.profitDailyExpenses : [],
    profitDailySettlements: Array.isArray(data?.profitDailySettlements) ? data.profitDailySettlements : [],
    profitProductCostHistory: Array.isArray(data?.profitProductCostHistory) ? data.profitProductCostHistory : [],
    profitSyncRecords: Array.isArray(data?.profitSyncRecords) ? data.profitSyncRecords : [],
    profitPriceObservations: Array.isArray(data?.profitPriceObservations) ? data.profitPriceObservations : []
  };
}

function normalizePatch(payload) {
  const source = payload?.patch || {};
  const collections = {};
  Object.keys(arrayKeys).forEach((name) => {
    const operations = source?.collections?.[name] || {};
    collections[name] = {
      upserts: Array.isArray(operations.upserts) ? operations.upserts : [],
      deletes: name === "tasks"
        ? []
        : Array.isArray(operations.deletes) ? operations.deletes.map(String) : []
    };
  });
  return {
    collections,
    creatorEdits: {
      upserts: source?.creatorEdits?.upserts && typeof source.creatorEdits.upserts === "object"
        ? source.creatorEdits.upserts
        : {},
      deletes: Array.isArray(source?.creatorEdits?.deletes)
        ? source.creatorEdits.deletes.map(String)
        : []
    }
  };
}

function taskStatusRank(status) {
  return ({ "待处理": 1, "处理中": 2, "待复盘": 3, "已完成": 4, "已作废": 4 })[String(status || "")] || 0;
}

function mergeTaskTransition(previous, incoming, syncVersion) {
  const next = { ...previous };
  [
    "status", "startedAt", "result", "evidence", "reviewAt", "resultSubmittedAt",
    "reviewResult", "reviewedAt", "completedAt", "voidCategory", "voidReason",
    "voidedAt", "voidedBy", "updatedAt", "updatedBy"
  ].forEach((key) => {
    if (Object.hasOwn(incoming, key)) next[key] = incoming[key];
  });
  next.syncVersion = syncVersion;
  return next;
}

function mergeTaskRecord(previous, incoming) {
  if (!previous) return {
    ...incoming,
    syncVersion: Math.max(1, Number(incoming?.syncVersion || 0))
  };
  const previousStatus = String(previous?.status || "");
  const incomingStatus = String(incoming?.status || "");
  if (["已完成", "已作废"].includes(previousStatus) && incomingStatus !== previousStatus) return previous;

  const previousRank = taskStatusRank(previousStatus);
  const incomingRank = taskStatusRank(incomingStatus);
  if (previousRank && incomingRank && incomingRank < previousRank) return previous;

  const previousVersion = Number(previous?.syncVersion || 0);
  const incomingVersion = Number(incoming?.syncVersion || 0);
  if (incomingRank > previousRank) {
    const nextVersion = Math.max(previousVersion + 1, incomingVersion, 1);
    return incomingVersion > previousVersion
      ? { ...previous, ...incoming, syncVersion: nextVersion }
      : mergeTaskTransition(previous, incoming, nextVersion);
  }
  if (incomingVersion !== previousVersion) return incomingVersion > previousVersion
    ? { ...previous, ...incoming, syncVersion: Math.max(1, incomingVersion) }
    : previous;

  const previousTime = Date.parse(previous?.updatedAt || previous?.voidedAt || previous?.resultSubmittedAt || previous?.startedAt || "");
  const incomingTime = Date.parse(incoming?.updatedAt || incoming?.voidedAt || incoming?.resultSubmittedAt || incoming?.startedAt || "");
  if (Number.isFinite(previousTime) && !Number.isFinite(incomingTime)) return previous;
  if (Number.isFinite(previousTime) && Number.isFinite(incomingTime) && incomingTime < previousTime) return previous;
  return { ...previous, ...incoming, syncVersion: Math.max(previousVersion, incomingVersion, 1) };
}

function mergeCollection(current, operations, keyField, collectionName) {
  const deleted = new Set(operations.deletes);
  const records = new Map();

  current.forEach((record, index) => {
    const key = String(record?.[keyField] || `legacy:${index}:${JSON.stringify(record)}`);
    if (!deleted.has(key)) records.set(key, record);
  });

  operations.upserts.forEach((record, index) => {
    const key = String(record?.[keyField] || `incoming:${index}:${JSON.stringify(record)}`);
    if (deleted.has(key)) return;
    if (collectionName === "costProfiles") {
      const previous = records.get(key);
      records.set(key, {
        ...record,
        image: String(record?.image || previous?.image || "")
      });
      return;
    }
    if (collectionName === "tasks") {
      const previous = records.get(key);
      records.set(key, mergeTaskRecord(previous, record));
      return;
    }
    records.set(key, record);
  });

  return [...records.values()];
}

function applyPatch(currentData, patch) {
  const current = normalizeData(currentData);
  const next = { ...current };

  Object.entries(arrayKeys).forEach(([name, keyField]) => {
    next[name] = mergeCollection(current[name], patch.collections[name], keyField, name);
  });

  next.creatorEdits = { ...current.creatorEdits, ...patch.creatorEdits.upserts };
  patch.creatorEdits.deletes.forEach((key) => delete next.creatorEdits[key]);
  return next;
}

function normalizedAuthor(value) {
  return String(value || "").trim().toLowerCase();
}

function reportSlotAuthor(role, author) {
  return ["售后组", "店铺维护"].includes(role) ? "团队汇总" : normalizedAuthor(author);
}

function validateGuard(currentData, rawGuard) {
  const guard = rawGuard && typeof rawGuard === "object" ? rawGuard : null;
  if (!guard?.type) return "";
  const current = normalizeData(currentData);

  if (guard.type === "new-report") {
    const slot = guard.slot || {};
    const duplicate = current.reports.some((report) =>
      report.date === slot.date
      && report.role === slot.role
      && reportSlotAuthor(report.role, report.author) === reportSlotAuthor(slot.role, slot.author)
    );
    return duplicate ? "云端已经存在这份日报，请刷新后编辑" : "";
  }

  if (guard.type === "edit-report") {
    const report = current.reports.find((item) => item.id === guard.reportId);
    if (!report) return "云端未找到原日报，请刷新后重新操作";
    if (String(report.updatedAt || "") !== String(guard.expectedUpdatedAt || "")) {
      return "云端日报已经更新，旧页面不能覆盖新内容";
    }
    const expectedTasks = new Map((guard.taskSnapshots || []).map((item) => [String(item.id), String(item.snapshot || "")]));
    const currentTasks = current.tasks.filter((task) => task.sourceReport === guard.reportId);
    if (currentTasks.length !== expectedTasks.size) return "关联任务数量已经变化，旧页面不能覆盖新状态";
    const changedTask = currentTasks.some((task) => expectedTasks.get(String(task.id)) !== JSON.stringify(task));
    return changedTask ? "关联任务已经更新，旧页面不能覆盖新状态" : "";
  }

  return "不支持的保存校验类型";
}

async function readState(db) {
  const row = await db.prepare(
    "SELECT version, updated_at, revision, data FROM workbench_state WHERE id = ?"
  ).bind("main").first();
  if (!row) return null;
  return {
    version: row.version,
    updatedAt: row.updated_at,
    revision: Number(row.revision || 0),
    data: normalizeData(JSON.parse(row.data))
  };
}

function buildEntrySummary(data, date) {
  const current = normalizeData(data);
  const coreRoles = new Set(["售后组", "BD", "店铺维护", "店群运营"]);
  const reportsBySlot = new Map();
  current.reports.forEach((report) => {
    if (report?.status !== "已提交" || report?.date !== date) return;
    const slot = `${report.role}|${reportSlotAuthor(report.role, report.author)}`;
    reportsBySlot.set(slot, report);
  });
  const reports = [...reportsBySlot.values()];
  const roles = new Set(reports.map((report) => report.role).filter((role) => coreRoles.has(role)));
  const stores = new Set(reports.flatMap((report) =>
    (Array.isArray(report.roleMetrics) ? report.roleMetrics : [])
      .map((row) => String(row?.store || "").trim().toLowerCase())
      .filter((store) => reportStoreKeys.has(store))
  ));
  const openTasks = current.tasks.filter((task) =>
    !["已完成", "已作废"].includes(String(task?.status || ""))
  );
  return {
    date,
    reports: reports.length,
    roles: roles.size,
    roleTarget: coreRoles.size,
    stores: stores.size,
    storeTarget: reportStoreKeys.size,
    openTasks: openTasks.length
  };
}

async function handleGet(request, env) {
  const url = new URL(request.url);
  if (url.searchParams.get("summary") === "1") {
    const state = await readState(env.DB);
    const date = String(url.searchParams.get("date") || new Date().toISOString().slice(0, 10));
    return json(200, {
      version: state?.version || "v2",
      updatedAt: state?.updatedAt || null,
      revision: Number(state?.revision || 0),
      summary: buildEntrySummary(state?.data || null, date)
    }, request);
  }
  if (url.searchParams.get("meta") === "1") {
    const row = await env.DB.prepare(
      "SELECT version, updated_at, revision FROM workbench_state WHERE id = ?"
    ).bind("main").first();
    return json(200, {
      version: row?.version || "v2",
      updatedAt: row?.updated_at || null,
      revision: Number(row?.revision || 0)
    }, request);
  }
  const state = await readState(env.DB);
  if (!state) return json(200, { version: "v2", updatedAt: null, revision: 0, data: null }, request);
  return json(200, state, request);
}

async function handlePost(request, env) {
  if (!trustedMutationRequest(request)) {
    return json(403, { error: "Cross-site write request blocked" }, request);
  }
  if (!requestBodyWithinLimit(request, 2_000_000)) {
    return json(413, { error: "Payload too large" }, request);
  }
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON payload" }, request);
  }

  const patch = normalizePatch(payload);
  const invalidCostImage = patch.collections.costProfiles.upserts.some((profile) =>
    !validCostImage(profile?.image)
  );
  if (invalidCostImage) {
    return json(413, { error: "SKU 图片格式无效或压缩后仍然过大" }, request);
  }
  const maxAttempts = 24;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const current = await readState(env.DB);
    const guardError = validateGuard(current?.data || null, payload?.guard);
    if (guardError) {
      return json(409, {
        error: guardError,
        retryable: false,
        data: normalizeData(current?.data || null)
      }, request);
    }
    const nextData = applyPatch(current?.data || null, patch);
    const updatedAt = new Date().toISOString();

    if (current && JSON.stringify(nextData) === JSON.stringify(current.data)) {
      return json(200, {
        version: current.version || "v2",
        updatedAt: current.updatedAt,
        revision: current.revision,
        data: current.data
      }, request);
    }

    if (!current) {
      const inserted = await env.DB.prepare(
        "INSERT OR IGNORE INTO workbench_state (id, version, updated_at, revision, data) VALUES (?, ?, ?, ?, ?)"
      ).bind("main", "v2", updatedAt, 1, JSON.stringify(nextData)).run();
      if (inserted.meta?.changes === 1) {
        return json(200, { version: "v2", updatedAt, revision: 1, data: nextData }, request);
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(5 + attempt * 2, 35)));
      continue;
    }

    const nextRevision = current.revision + 1;
    const updated = await env.DB.prepare(
      "UPDATE workbench_state SET version = ?, updated_at = ?, revision = ?, data = ? WHERE id = ? AND revision = ?"
    ).bind("v2", updatedAt, nextRevision, JSON.stringify(nextData), "main", current.revision).run();

    if (updated.meta?.changes === 1) {
      return json(200, {
        version: "v2",
        updatedAt,
        revision: nextRevision,
        data: nextData
      }, request);
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(5 + attempt * 2, 35)));
  }

  return json(409, {
    error: "Concurrent update conflict. Please retry.",
    retryable: true
  }, request);
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }
  if (request.method === "GET") return handleGet(request, env);
  if (request.method === "POST") return handlePost(request, env);
  return json(405, { error: "Method not allowed" }, request);
}

export { applyPatch, buildEntrySummary, mergeTaskRecord, normalizeData, normalizePatch };
