import { sha256Hex } from "../../../_shared/auth.js";
import { apiSecurityHeaders, trustedMutationRequest } from "../../../_shared/http.js";
import {
  buildTikTokSellerAuthorizationUrl
} from "../../../_shared/tiktok-shop-authorization.js";
import { createTikTokShopConnectionRepository } from "../../../_shared/tiktok-shop-connection-store.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...apiSecurityHeaders()
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers });
}

function secureRandomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createAuthorizationStartHandler({
  now = () => new Date(),
  randomState = secureRandomState,
  hashState = sha256Hex,
  createRepository = createTikTokShopConnectionRepository
} = {}) {
  return async function handleAuthorizationStart({ request, env, data = {} }) {
    if (data?.user?.role !== "admin") return json(403, { error: "仅管理员可连接 TikTok 店铺" });
    if (!trustedMutationRequest(request)) return json(403, { error: "Cross-site write request blocked" });
    if (!env?.TIKTOK_SHOP_APP_KEY || !env?.TIKTOK_SHOP_APP_SECRET || !env?.TIKTOK_SHOP_AUTHORIZATION_URL || !env?.TK_TOKEN_ENCRYPTION_KEY) {
      return json(409, { error: "TikTok Shop 授权服务尚未配置", code: "TIKTOK_AUTH_UNCONFIGURED" });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "授权店铺参数无效" });
    }
    const storeId = String(body?.storeId || "");
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(storeId)) {
      return json(400, { error: "授权店铺参数无效" });
    }
    const repository = createRepository(env.DB);
    if (!await repository.storeExists(storeId)) {
      return json(404, { error: "工作台中不存在该利润店铺", code: "PROFIT_STORE_NOT_FOUND" });
    }
    const state = randomState();
    const createdAt = now();
    await repository.createState({
      stateHash: await hashState(state),
      userId: String(data.user.id || ""),
      storeId,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + 10 * 60 * 1000).toISOString()
    });
    return json(200, {
      authorizationUrl: buildTikTokSellerAuthorizationUrl({
        authorizationUrl: env.TIKTOK_SHOP_AUTHORIZATION_URL,
        state
      })
    });
  };
}

export const onRequestPost = createAuthorizationStartHandler();

export async function onRequest(context) {
  if (context.request.method === "POST") return onRequestPost(context);
  return json(405, { error: "Method not allowed" });
}
