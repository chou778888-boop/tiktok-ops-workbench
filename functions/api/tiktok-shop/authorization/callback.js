import { sha256Hex } from "../../../_shared/auth.js";
import { apiSecurityHeaders } from "../../../_shared/http.js";
import { createTikTokShopClient } from "../../../_shared/profit-sync.js";
import {
  encryptTikTokCredential,
  exchangeTikTokAuthorizationCode
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

function shopValue(shop, ...keys) {
  for (const key of keys) {
    if (shop?.[key] !== undefined && shop?.[key] !== null) return String(shop[key]);
  }
  return "";
}

export function createAuthorizationCallbackHandler({
  now = () => new Date(),
  hashState = sha256Hex,
  createRepository = createTikTokShopConnectionRepository,
  exchangeCode = exchangeTikTokAuthorizationCode,
  createShopClient = createTikTokShopClient,
  encryptCredential = encryptTikTokCredential
} = {}) {
  return async function handleAuthorizationCallback({ request, env }) {
    const url = new URL(request.url);
    const state = String(url.searchParams.get("state") || "");
    const code = String(url.searchParams.get("code") || "");
    if (url.searchParams.get("error") || !state || !code) {
      return json(400, { error: "TikTok 店铺授权未完成，请返回工作台重试" });
    }
    if (!/^[a-f0-9]{64}$/i.test(state) || !/^[A-Za-z0-9._~-]{1,512}$/.test(code)) {
      return json(400, { error: "TikTok 店铺授权参数无效，请重新发起授权" });
    }
    if (!env?.TIKTOK_SHOP_APP_KEY || !env?.TIKTOK_SHOP_APP_SECRET || !env?.TK_TOKEN_ENCRYPTION_KEY) {
      return json(409, { error: "TikTok Shop 授权服务尚未配置" });
    }
    const repository = createRepository(env.DB);
    const currentTime = now();
    const authorization = await repository.consumeState({
      stateHash: await hashState(state),
      consumedAt: currentTime.toISOString()
    });
    if (!authorization) return json(400, { error: "授权会话已过期或已使用，请重新发起授权" });

    try {
      const token = await exchangeCode({
        appKey: env.TIKTOK_SHOP_APP_KEY,
        appSecret: env.TIKTOK_SHOP_APP_SECRET,
        authCode: code
      });
      const client = createShopClient({
        appKey: env.TIKTOK_SHOP_APP_KEY,
        appSecret: env.TIKTOK_SHOP_APP_SECRET,
        accessToken: token.accessToken
      });
      const shops = await client.getAuthorizedShops();
      if (shops.length !== 1) {
        return json(409, {
          error: shops.length
            ? "该卖家账号包含多个店铺，必须先配置 Shop ID 后再绑定，系统不会自动猜测"
            : "授权账户未返回可连接的 TikTok 店铺"
        });
      }
      const shop = shops[0];
      const shopId = shopValue(shop, "id", "shop_id", "shopId");
      const shopCipher = shopValue(shop, "cipher", "shop_cipher", "shopCipher");
      if (!shopId || !shopCipher) return json(409, { error: "TikTok 授权店铺缺少 Shop ID 或 Shop Cipher" });
      const storeId = String(authorization.storeId ?? authorization.store_id);
      await repository.saveConnection({
        storeId,
        shopId,
        shopCipher,
        shopName: shopValue(shop, "name", "shop_name", "shopName"),
        shopRegion: shopValue(shop, "region", "shop_region", "shopRegion"),
        accessTokenCipher: await encryptCredential(token.accessToken, env.TK_TOKEN_ENCRYPTION_KEY, {
          context: `${storeId}:access`
        }),
        refreshTokenCipher: await encryptCredential(token.refreshToken, env.TK_TOKEN_ENCRYPTION_KEY, {
          context: `${storeId}:refresh`
        }),
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        grantedScopes: token.grantedScopes,
        authorizedBy: String(authorization.userId ?? authorization.user_id),
        createdAt: currentTime.toISOString(),
        updatedAt: currentTime.toISOString()
      });
      return Response.redirect(`${url.origin}/?tiktok_shop=connected`, 302);
    } catch (error) {
      return json(502, {
        error: "TikTok 店铺授权失败，请返回工作台重新连接",
        code: error?.code || "TIKTOK_AUTH_FAILED"
      });
    }
  };
}

export const onRequestGet = createAuthorizationCallbackHandler();

export async function onRequest(context) {
  if (context.request.method === "GET") return onRequestGet(context);
  return json(405, { error: "Method not allowed" });
}
