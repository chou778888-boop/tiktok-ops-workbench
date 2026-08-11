import assert from "node:assert/strict";
import { createProfitSyncHandler } from "../functions/api/profit-sync.js";
import { onRequest as authMiddleware } from "../functions/_middleware.js";

function createDb(initialData = {}) {
  let row = {
    id: "main",
    version: "v2",
    updated_at: "2026-08-10T09:00:00.000Z",
    revision: 7,
    data: JSON.stringify(initialData)
  };
  let writes = 0;
  return {
    get row() { return row; },
    get writes() { return writes; },
    prepare(sql) {
      return {
        args: [],
        bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes("workbench_state")) return row;
          return null;
        },
        async run() {
          if (sql.includes("UPDATE workbench_state")) {
            const [version, updatedAt, revision, data, id, expectedRevision] = this.args;
            if (row && id === "main" && expectedRevision === row.revision) {
              row = { id, version, updated_at: updatedAt, revision, data };
              writes += 1;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          if (sql.includes("INSERT OR IGNORE INTO workbench_state") && !row) {
            const [id, version, updatedAt, revision, data] = this.args;
            row = { id, version, updated_at: updatedAt, revision, data };
            writes += 1;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
      };
    }
  };
}

const baseState = {
  profitDailyFacts: [],
  profitDailyExpenses: [],
  profitDailySettlements: [],
  profitSyncRecords: []
};
const connectionSecret = JSON.stringify([{
  id: "connection-1",
  storeId: "store-1",
  shopCipher: "shop-cipher",
  accessToken: "top-secret-token",
  storeTimezone: "America/Los_Angeles",
  advertiserId: "advertiser-1",
  adMappings: [{ adId: "ad-1", platformListingId: "platform-listing-1" }]
}]);

const unauthorizedDb = createDb(baseState);
const unauthorizedHandler = createProfitSyncHandler({ runSync: async () => { throw new Error("must not run"); } });
const unauthorizedResponse = await unauthorizedHandler({
  request: new Request("https://example.com/api/profit-sync", { method: "POST" }),
  env: { DB: unauthorizedDb, TIKTOK_SHOP_CONNECTIONS: connectionSecret },
  data: { user: { role: "member" } }
});
assert.equal(unauthorizedResponse.status, 403, "只有管理员或定时任务可以触发利润同步");
assert.equal(unauthorizedDb.writes, 0);

const unconfiguredDb = createDb(baseState);
const unconfiguredHandler = createProfitSyncHandler({ runSync: async () => { throw new Error("must not run"); } });
const unconfiguredResponse = await unconfiguredHandler({
  request: new Request("https://example.com/api/profit-sync", { method: "POST" }),
  env: { DB: unconfiguredDb },
  data: { user: { role: "admin" } }
});
assert.equal(unconfiguredResponse.status, 409, "未配置店铺授权时必须返回可处理状态");
assert.equal(unconfiguredDb.writes, 0, "未配置店铺授权时严禁写入空利润数据");

const syncedDb = createDb(baseState);
let receivedConnections = [];
let receivedAdSpend = [];
const syncedHandler = createProfitSyncHandler({
  now: () => new Date("2026-08-11T09:05:00.000Z"),
  createAdsClient: ({ advertiserId, accessToken }) => ({
    async loadDailyReport() {
      assert.equal(advertiserId, "advertiser-1");
      assert.equal(accessToken, "ads-secret-token");
      return [{ dimensions: { ad_id: "ad-1" }, metrics: { billed_cost: "5.25" } }];
    }
  }),
  runSync: async ({ connections, loadAdSpend }) => {
    receivedConnections = connections;
    receivedAdSpend = await loadAdSpend(connections[0], { dateKey: "2026-08-10" });
    return {
      status: "synced",
      failures: [],
      diagnostics: [{ connectionId: "connection-1", matchedOrderCount: 3 }],
      collections: {
        profitDailyFacts: {
          upserts: [{ id: "fact-1", listingId: "listing-1", listingSkuId: "listing-sku-1", dateKey: "2026-08-10", gmv: 36, itemsSold: 2 }],
          deletes: []
        },
        profitSyncRecords: {
          upserts: [{ id: "main", state: "synced", lastSyncedAt: "2026-08-11T09:05:00.000Z" }],
          deletes: []
        }
      }
    };
  }
});
const syncedResponse = await syncedHandler({
  request: new Request("https://example.com/api/profit-sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dateKey: "2026-08-10" })
  }),
  env: {
    DB: syncedDb,
    TIKTOK_SHOP_CONNECTIONS: connectionSecret,
    TIKTOK_SHOP_APP_KEY: "app-key",
    TIKTOK_SHOP_APP_SECRET: "app-secret",
    TIKTOK_ADS_ACCESS_TOKEN: "ads-secret-token"
  },
  data: { user: { role: "admin" } }
});
const syncedPayload = await syncedResponse.json();
assert.equal(syncedResponse.status, 200);
assert.equal(syncedDb.writes, 1, "成功同步必须通过 CAS 增量写回统一云端状态");
assert.equal(JSON.parse(syncedDb.row.data).profitDailyFacts[0].id, "fact-1");
assert.equal(receivedConnections.length, 1);
assert.equal(receivedConnections[0].accessToken, "top-secret-token", "同步服务必须收到店铺令牌");
assert.deepEqual(receivedAdSpend, [{ platformListingId: "platform-listing-1", dateKey: "2026-08-10", amount: 5.25 }], "路由必须把广告报表按配置映射为链接费用");
assert.equal(JSON.stringify(syncedPayload).includes("top-secret-token"), false, "API 响应不得泄漏店铺令牌");
assert.deepEqual(syncedPayload.diagnostics, [{ connectionId: "connection-1", matchedOrderCount: 3 }]);

let middlewareNext = 0;
const automationRequest = new Request("https://example.com/api/profit-sync", {
  method: "POST",
  headers: { authorization: "Bearer scheduler-secret" }
});
const middlewareResult = await authMiddleware({
  request: automationRequest,
  env: { TK_SYNC_SECRET: "scheduler-secret" },
  data: {},
  next: async () => { middlewareNext += 1; return new Response("next"); }
});
assert.equal(middlewareNext, 1, "正确的定时任务密钥必须通过 API 中间件");
assert.equal(await middlewareResult.text(), "next");

let rejectedNext = 0;
const rejectedAutomation = await authMiddleware({
  request: new Request("https://example.com/api/profit-sync", {
    method: "POST",
    headers: { authorization: "Bearer wrong-secret" }
  }),
  env: { TK_SYNC_SECRET: "scheduler-secret", DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } },
  data: {},
  next: async () => { rejectedNext += 1; return new Response("next"); }
});
assert.equal(rejectedAutomation.status, 401, "错误定时任务密钥不能绕过登录认证");
assert.equal(rejectedNext, 0);

console.log(JSON.stringify({ passed: 17, phase: "profit-sync-route" }));
