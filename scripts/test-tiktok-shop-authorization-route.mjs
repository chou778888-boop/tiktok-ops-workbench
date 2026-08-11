import assert from "node:assert/strict";
import { createAuthorizationStartHandler } from "../functions/api/tiktok-shop/authorization/start.js";
import { createAuthorizationCallbackHandler } from "../functions/api/tiktok-shop/authorization/callback.js";
import { onRequest as authMiddleware } from "../functions/_middleware.js";

const configuredEnv = {
  TIKTOK_SHOP_APP_KEY: "app-key",
  TIKTOK_SHOP_APP_SECRET: "app-secret",
  TIKTOK_SHOP_AUTHORIZATION_URL: "https://services.us.tiktokshop.com/open/authorize?service_id=service-1",
  TK_TOKEN_ENCRYPTION_KEY: "production-like-encryption-key-at-least-32-characters"
};

const memberHandler = createAuthorizationStartHandler({
  createRepository: () => ({ storeExists: async () => true })
});
const memberResponse = await memberHandler({
  request: new Request("https://workbench.example/api/tiktok-shop/authorization/start", { method: "POST", body: "{}" }),
  env: configuredEnv,
  data: { user: { id: "member-1", role: "member" } }
});
assert.equal(memberResponse.status, 403, "非管理员不得创建店铺授权会话");

let storedState = null;
const startHandler = createAuthorizationStartHandler({
  now: () => new Date("2026-08-11T15:00:00.000Z"),
  randomState: () => "raw-state-that-must-never-be-stored",
  hashState: async () => "hashed-state",
  createRepository: () => ({
    storeExists: async (storeId) => storeId === "store-dreamweave",
    createState: async (record) => { storedState = record; }
  })
});
const startResponse = await startHandler({
  request: new Request("https://workbench.example/api/tiktok-shop/authorization/start", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://workbench.example" },
    body: JSON.stringify({ storeId: "store-dreamweave" })
  }),
  env: configuredEnv,
  data: { user: { id: "admin-1", role: "admin" } }
});
const startPayload = await startResponse.json();
assert.equal(startResponse.status, 200);
assert.equal(new URL(startPayload.authorizationUrl).hostname, "services.us.tiktokshop.com");
assert.equal(new URL(startPayload.authorizationUrl).searchParams.get("state"), "raw-state-that-must-never-be-stored");
assert.equal(storedState.stateHash, "hashed-state");
assert.equal(JSON.stringify(storedState).includes("raw-state-that-must-never-be-stored"), false, "D1 只能保存 state 哈希");
assert.equal(storedState.userId, "admin-1");
assert.equal(storedState.storeId, "store-dreamweave");
assert.equal(storedState.expiresAt, "2026-08-11T15:10:00.000Z", "授权会话必须在十分钟后失效");

const missingStoreResponse = await startHandler({
  request: new Request("https://workbench.example/api/tiktok-shop/authorization/start", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://workbench.example" },
    body: JSON.stringify({ storeId: "unknown-store" })
  }),
  env: configuredEnv,
  data: { user: { id: "admin-1", role: "admin" } }
});
assert.equal(missingStoreResponse.status, 404, "授权不能绑定到不存在的工作台店铺");

let oversizedStoreLookups = 0;
const boundedStartHandler = createAuthorizationStartHandler({
  createRepository: () => ({
    storeExists: async () => { oversizedStoreLookups += 1; return false; }
  })
});
const oversizedStoreResponse = await boundedStartHandler({
  request: new Request("https://workbench.example/api/tiktok-shop/authorization/start", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://workbench.example" },
    body: JSON.stringify({ storeId: "x".repeat(4096) })
  }),
  env: configuredEnv,
  data: { user: { id: "admin-1", role: "admin" } }
});
assert.equal(oversizedStoreResponse.status, 400);
assert.equal(oversizedStoreLookups, 0, "畸形店铺 ID 必须在数据库查询前被拒绝");

let savedConnection = null;
const validState = "a".repeat(64);
const callbackHandler = createAuthorizationCallbackHandler({
  now: () => new Date("2026-08-11T15:02:00.000Z"),
  hashState: async (state) => state === validState ? "valid-state-hash" : "invalid-state-hash",
  createRepository: () => ({
    consumeState: async ({ stateHash }) => stateHash === "valid-state-hash"
      ? { storeId: "store-dreamweave", userId: "admin-1" }
      : null,
    saveConnection: async (connection) => { savedConnection = connection; }
  }),
  exchangeCode: async ({ authCode }) => {
    assert.equal(authCode, "one-time-code");
    return {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessTokenExpiresAt: 1787000000,
      refreshTokenExpiresAt: 1790000000,
      grantedScopes: ["ORDER_SEARCH", "FINANCE_STATEMENTS"]
    };
  },
  createShopClient: ({ accessToken }) => ({
    async getAuthorizedShops() {
      assert.equal(accessToken, "access-token");
      return [{ id: "shop-1", cipher: "shop-cipher-1", name: "Ufist-DreamWeave", region: "US" }];
    }
  }),
  encryptCredential: async (value) => `encrypted:${value}`
});
const callbackResponse = await callbackHandler({
  request: new Request(`https://workbench.example/api/tiktok-shop/authorization/callback?code=one-time-code&state=${validState}`),
  env: configuredEnv
});
assert.equal(callbackResponse.status, 302);
assert.equal(callbackResponse.headers.get("location"), "https://workbench.example/?tiktok_shop=connected");
assert.equal(savedConnection.storeId, "store-dreamweave");
assert.equal(savedConnection.shopId, "shop-1");
assert.equal(savedConnection.shopCipher, "shop-cipher-1");
assert.equal(savedConnection.accessTokenCipher, "encrypted:access-token");
assert.equal(savedConnection.refreshTokenCipher, "encrypted:refresh-token");
assert.equal(JSON.stringify(savedConnection).includes('"accessToken":"access-token"'), false, "连接表不得保存访问令牌明文字段");

const replayResponse = await callbackHandler({
  request: new Request(`https://workbench.example/api/tiktok-shop/authorization/callback?code=one-time-code&state=${"b".repeat(64)}`),
  env: configuredEnv
});
assert.equal(replayResponse.status, 400, "失效或重放的 state 必须在换 token 前被拒绝");

let multiShopSaved = 0;
const multipleShopHandler = createAuthorizationCallbackHandler({
  hashState: async () => "valid-state-hash",
  createRepository: () => ({
    consumeState: async () => ({ storeId: "store-dreamweave", userId: "admin-1" }),
    saveConnection: async () => { multiShopSaved += 1; }
  }),
  exchangeCode: async () => ({ accessToken: "a", refreshToken: "r", grantedScopes: [] }),
  createShopClient: () => ({ getAuthorizedShops: async () => [
    { id: "shop-1", cipher: "cipher-1" },
    { id: "shop-2", cipher: "cipher-2" }
  ] }),
  encryptCredential: async (value) => `encrypted:${value}`
});
const multipleShopResponse = await multipleShopHandler({
  request: new Request(`https://workbench.example/api/tiktok-shop/authorization/callback?code=one-time-code&state=${validState}`),
  env: configuredEnv
});
assert.equal(multipleShopResponse.status, 409, "一个授权返回多个平台店铺时禁止猜测映射");
assert.equal(multiShopSaved, 0);

let maliciousStateConsumed = 0;
const boundedCallbackHandler = createAuthorizationCallbackHandler({
  createRepository: () => ({
    consumeState: async () => { maliciousStateConsumed += 1; return null; }
  })
});
const maliciousStateResponse = await boundedCallbackHandler({
  request: new Request(`https://workbench.example/api/tiktok-shop/authorization/callback?code=one-time-code&state=${"x".repeat(4096)}`),
  env: configuredEnv
});
assert.equal(maliciousStateResponse.status, 400);
assert.equal(maliciousStateConsumed, 0, "畸形 state 必须在哈希和数据库访问前被拒绝");

const secretErrorHandler = createAuthorizationCallbackHandler({
  hashState: async () => "valid-state-hash",
  createRepository: () => ({ consumeState: async () => ({ storeId: "store-dreamweave", userId: "admin-1" }) }),
  exchangeCode: async () => { throw new Error("failed one-time-code with app-secret"); }
});
const secretErrorResponse = await secretErrorHandler({
  request: new Request(`https://workbench.example/api/tiktok-shop/authorization/callback?code=one-time-code&state=${validState}`),
  env: configuredEnv
});
const secretErrorPayload = await secretErrorResponse.json();
assert.equal(secretErrorResponse.status, 502);
assert.equal(JSON.stringify(secretErrorPayload).includes("one-time-code"), false, "回调错误不得回显一次性授权码");
assert.equal(JSON.stringify(secretErrorPayload).includes("app-secret"), false, "回调错误不得回显 App Secret");

let publicCallbackNext = 0;
const publicCallbackResponse = await authMiddleware({
  request: new Request("https://workbench.example/api/tiktok-shop/authorization/callback?code=x&state=y"),
  env: {},
  data: {},
  next: async () => { publicCallbackNext += 1; return new Response("next"); }
});
assert.equal(publicCallbackNext, 1, "TikTok 外部回跳不能依赖 SameSite 登录 Cookie");
assert.equal(await publicCallbackResponse.text(), "next");

console.log(JSON.stringify({ passed: 34, phase: "tiktok-shop-authorization-route" }));
