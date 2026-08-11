import assert from "node:assert/strict";
import { loadTikTokShopConnections } from "../functions/api/profit-sync.js";

const baseEnv = {
  DB: {},
  TIKTOK_SHOP_APP_KEY: "app-key",
  TIKTOK_SHOP_APP_SECRET: "app-secret",
  TK_TOKEN_ENCRYPTION_KEY: "encryption-key-with-at-least-thirty-two-characters",
  TIKTOK_SHOP_CONNECTIONS: JSON.stringify([{
    storeId: "store-dreamweave",
    storeTimezone: "America/Los_Angeles",
    advertiserId: "advertiser-1",
    adMappings: [{ adId: "ad-1", platformListingId: "listing-platform-1" }]
  }])
};

let tokenUpdates = [];
let decryptContexts = [];
const repository = {
  async listActiveConnections() {
    return [{
      store_id: "store-dreamweave",
      shop_id: "shop-1",
      shop_cipher: "cipher-1",
      access_token_cipher: "encrypted-access",
      refresh_token_cipher: "encrypted-refresh",
      access_token_expires_at: 1787000000,
      refresh_token_expires_at: 1790000000,
      granted_scopes: '["ORDER_SEARCH","FINANCE_STATEMENTS"]',
      status: "active"
    }];
  },
  async updateTokens(storeId, token) { tokenUpdates.push({ storeId, token }); }
};

const loaded = await loadTikTokShopConnections(baseEnv, {
  now: () => new Date("2026-08-11T15:00:00.000Z"),
  createRepository: () => repository,
  decryptCredential: async (value, _key, options) => {
    decryptContexts.push(options?.context || "");
    return ({
      "encrypted-access": "plain-access",
      "encrypted-refresh": "plain-refresh"
    })[value];
  },
  refreshToken: async () => { throw new Error("not due"); }
});
assert.equal(loaded.length, 1);
assert.equal(loaded[0].storeId, "store-dreamweave");
assert.equal(loaded[0].shopCipher, "cipher-1");
assert.equal(loaded[0].accessToken, "plain-access");
assert.equal(loaded[0].refreshToken, "plain-refresh");
assert.equal(loaded[0].advertiserId, "advertiser-1", "广告映射配置必须与加密店铺授权合并");
assert.deepEqual(loaded[0].adMappings, [{
  adId: "ad-1",
  adgroupId: "",
  campaignId: "",
  listingId: "",
  platformListingId: "listing-platform-1"
}]);
assert.equal(tokenUpdates.length, 0, "未临近过期的令牌不得无意义刷新");
assert.deepEqual(decryptContexts, ["store-dreamweave:access", "store-dreamweave:refresh"], "解密必须绑定店铺和令牌用途");

tokenUpdates = [];
const expiringRepository = {
  ...repository,
  async listActiveConnections() {
    return [{
      store_id: "store-dreamweave",
      shop_id: "shop-1",
      shop_cipher: "cipher-1",
      access_token_cipher: "encrypted-access",
      refresh_token_cipher: "encrypted-refresh",
      access_token_expires_at: 1786460500,
      refresh_token_expires_at: 1790000000,
      granted_scopes: "[]",
      status: "active"
    }];
  }
};
let refreshInput = null;
let encryptContexts = [];
const refreshed = await loadTikTokShopConnections(baseEnv, {
  now: () => new Date(1786460400 * 1000),
  createRepository: () => expiringRepository,
  decryptCredential: async (value) => value === "encrypted-access" ? "old-access" : "plain-refresh",
  refreshToken: async (input) => {
    refreshInput = input;
    return {
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
      accessTokenExpiresAt: 1787065200,
      refreshTokenExpiresAt: 1790000000,
      grantedScopes: ["ORDER_SEARCH"]
    };
  },
  encryptCredential: async (value, _key, options) => {
    encryptContexts.push(options?.context || "");
    return `encrypted:${value}`;
  }
});
assert.equal(refreshInput.refreshToken, "plain-refresh");
assert.equal(refreshInput.appSecret, "app-secret");
assert.equal(refreshed[0].accessToken, "fresh-access", "临近过期必须在同步前使用新令牌");
assert.equal(tokenUpdates.length, 1);
assert.equal(tokenUpdates[0].storeId, "store-dreamweave");
assert.equal(tokenUpdates[0].token.accessTokenCipher, "encrypted:fresh-access", "刷新后的令牌仍必须加密写回 D1");
assert.equal(JSON.stringify(tokenUpdates).includes('"accessToken":"fresh-access"'), false, "D1 更新对象不得带明文令牌字段");
assert.deepEqual(encryptContexts, ["store-dreamweave:access", "store-dreamweave:refresh"], "刷新后加密必须继续绑定店铺和令牌用途");

await assert.rejects(
  loadTikTokShopConnections(baseEnv, {
    createRepository: () => repository,
    decryptCredential: async () => { throw new Error("无法解密 TikTok 授权令牌"); }
  }),
  /无法解密/,
  "令牌损坏时必须安全失败，不能回退为未知或空令牌"
);

console.log(JSON.stringify({ passed: 23, phase: "tiktok-shop-connection-loader" }));
