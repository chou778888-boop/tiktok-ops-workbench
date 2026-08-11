import assert from "node:assert/strict";
import {
  buildTikTokSellerAuthorizationUrl,
  decryptTikTokCredential,
  encryptTikTokCredential,
  exchangeTikTokAuthorizationCode,
  refreshTikTokAuthorizationToken
} from "../functions/_shared/tiktok-shop-authorization.js";

const encryptionKey = "test-encryption-key-with-at-least-32-characters";
const fixedIv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
const ciphertext = await encryptTikTokCredential("TTP_sensitive_token", encryptionKey, {
  randomBytes: () => fixedIv,
  context: "store-dreamweave:access"
});
assert.notEqual(ciphertext, "TTP_sensitive_token");
assert.equal(ciphertext.includes("TTP_sensitive_token"), false, "D1 中不得出现令牌明文");
assert.equal(await decryptTikTokCredential(ciphertext, encryptionKey, { context: "store-dreamweave:access" }), "TTP_sensitive_token");
await assert.rejects(
  decryptTikTokCredential(ciphertext, "different-encryption-key-with-32-characters", { context: "store-dreamweave:access" }),
  /无法解密/,
  "错误密钥必须拒绝读取授权令牌"
);
await assert.rejects(
  decryptTikTokCredential(ciphertext, encryptionKey, { context: "store-other:access" }),
  /无法解密/,
  "令牌密文必须与店铺和用途绑定，禁止在连接行之间调换"
);

assert.equal(
  buildTikTokSellerAuthorizationUrl({
    authorizationUrl: "https://services.us.tiktokshop.com/open/authorize?service_id=service-1",
    state: "oauth-state-1"
  }),
  "https://services.us.tiktokshop.com/open/authorize?service_id=service-1&state=oauth-state-1",
  "授权必须发生在配置的 TikTok 官方链接并携带防重放 state"
);
assert.throws(
  () => buildTikTokSellerAuthorizationUrl({ authorizationUrl: "https://example.com/open/authorize", state: "oauth-state-1" }),
  /官方授权地址/,
  "非 TikTok 域名禁止接收授权码"
);

let exchangeUrl = "";
const exchanged = await exchangeTikTokAuthorizationCode({
  appKey: "app-key",
  appSecret: "app-secret",
  authCode: "one-time-code",
  fetchImpl: async (url) => {
    exchangeUrl = String(url);
    return new Response(JSON.stringify({
      code: 0,
      data: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        access_token_expire_in: 1787000000,
        refresh_token_expire_in: 1790000000,
        granted_scopes: ["SHOP_AUTHORIZED_INFORMATION", "ORDER_SEARCH"]
      }
    }), { status: 200 });
  }
});
const parsedExchange = new URL(exchangeUrl);
assert.equal(parsedExchange.origin, "https://auth.tiktok-shops.com");
assert.equal(parsedExchange.pathname, "/api/v2/token/get");
assert.equal(parsedExchange.searchParams.get("auth_code"), "one-time-code");
assert.equal(parsedExchange.searchParams.get("grant_type"), "authorized_code");
assert.equal(exchanged.accessToken, "access-token");
assert.equal(exchanged.refreshToken, "refresh-token");
assert.deepEqual(exchanged.grantedScopes, ["SHOP_AUTHORIZED_INFORMATION", "ORDER_SEARCH"]);

let refreshUrl = "";
const refreshed = await refreshTikTokAuthorizationToken({
  appKey: "app-key",
  appSecret: "app-secret",
  refreshToken: "refresh-token",
  fetchImpl: async (url) => {
    refreshUrl = String(url);
    return new Response(JSON.stringify({
      code: 0,
      data: { access_token: "fresh-access", refresh_token: "fresh-refresh", access_token_expire_in: 1788000000 }
    }), { status: 200 });
  }
});
assert.equal(new URL(refreshUrl).pathname, "/api/v2/token/refresh");
assert.equal(new URL(refreshUrl).searchParams.get("grant_type"), "refresh_token");
assert.equal(refreshed.accessToken, "fresh-access");

await assert.rejects(
  exchangeTikTokAuthorizationCode({
    appKey: "app-key",
    appSecret: "app-secret",
    authCode: "bad-code",
    fetchImpl: async () => new Response(JSON.stringify({ code: 105001, message: "invalid code" }), { status: 200 })
  }),
  (error) => error.code === "TIKTOK_AUTH_ERROR" && !error.message.includes("app-secret"),
  "平台拒绝授权时必须返回安全错误且不能泄漏密钥"
);

console.log(JSON.stringify({ passed: 21, phase: "tiktok-shop-authorization" }));
