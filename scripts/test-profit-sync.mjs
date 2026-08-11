import assert from "node:assert/strict";
import {
  canonicalTikTokSignInput,
  createTikTokAdsClient,
  createTikTokShopClient,
  defaultProfitSyncDate,
  profitDateUtcWindow,
  runProfitAutomaticSync,
  mapTikTokAdSpend,
  signTikTokShopRequest,
  createProfitSyncPatch
} from "../functions/_shared/profit-sync.js";

assert.equal(
  canonicalTikTokSignInput({
    path: "/authorization/202309/shops",
    query: {
      timestamp: 1623812664,
      sign: "ignored",
      app_key: "29a39d",
      access_token: "ignored"
    }
  }),
  "/authorization/202309/shopsapp_key29a39dtimestamp1623812664",
  "签名输入必须按参数名排序，并排除 sign 与 access_token"
);

assert.equal(
  canonicalTikTokSignInput({
    path: "/order/202309/orders/search",
    query: { timestamp: 2, shop_cipher: "shop-cipher", app_key: "app-key" },
    body: '{"create_time_ge":1}'
  }),
  "/order/202309/orders/searchapp_keyapp-keyshop_ciphershop-ciphertimestamp2{\"create_time_ge\":1}",
  "POST 请求签名必须覆盖原始 JSON 请求体"
);

assert.equal(
  await signTikTokShopRequest({
    appSecret: "secret",
    path: "/authorization/202309/shops",
    query: { timestamp: 1623812664, app_key: "29a39d" }
  }),
  "f60f22f4c75fd029672257ff358e8ccb377ec4a125904a70f0c8e67ffa6110f8",
  "请求签名必须使用官方 HMAC-SHA256 包裹算法"
);

const apiRequests = [];
const apiPages = [{
  code: 0,
  message: "Success",
  data: { orders: [{ id: "order-page-1" }], next_page_token: "next-page" }
}, {
  code: 0,
  message: "Success",
  data: { orders: [{ id: "order-page-2" }], next_page_token: "" }
}];
const client = createTikTokShopClient({
  appKey: "app-key",
  appSecret: "app-secret",
  accessToken: "access-token",
  shopCipher: "shop-cipher",
  now: () => 1786438800000,
  fetchImpl: async (request) => {
    apiRequests.push({
      url: request.url,
      method: request.method,
      accessToken: request.headers.get("x-tts-access-token"),
      body: await request.clone().text()
    });
    return new Response(JSON.stringify(apiPages.shift()), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
});
const pagedOrders = await client.searchOrders({ startTime: 1786352400, endTime: 1786438800 });
assert.deepEqual(pagedOrders.map((order) => order.id), ["order-page-1", "order-page-2"], "订单同步必须读取全部分页");
assert.equal(apiRequests.length, 2, "存在 next_page_token 时必须继续请求下一页");
assert.equal(apiRequests[0].method, "POST");
assert.equal(apiRequests[0].accessToken, "access-token", "访问令牌必须只通过安全请求头发送");
assert.deepEqual(
  JSON.parse(apiRequests[0].body),
  { create_time_ge: 1786352400, create_time_lt: 1786438800 },
  "订单查询必须使用明确的闭开时间窗口"
);
assert.equal(new URL(apiRequests[1].url).searchParams.get("page_token"), "next-page", "分页令牌必须进入下一次签名请求");
assert.equal(new URL(apiRequests[0].url).searchParams.has("access_token"), false, "访问令牌不得泄漏到 URL");

const failingClient = createTikTokShopClient({
  appKey: "app-key",
  appSecret: "app-secret",
  accessToken: "secret-token",
  shopCipher: "shop-cipher",
  fetchImpl: async () => new Response(JSON.stringify({ code: 36009004, message: "Invalid timestamp" }), { status: 200 })
});
await assert.rejects(
  failingClient.searchOrders({ startTime: 1, endTime: 2 }),
  (error) => error.code === "TIKTOK_API_ERROR" && !error.message.includes("secret-token"),
  "平台错误必须结构化抛出且不得泄漏访问令牌"
);

const financeRequests = [];
const financeClient = createTikTokShopClient({
  appKey: "app-key",
  appSecret: "app-secret",
  accessToken: "access-token",
  shopCipher: "shop-cipher",
  now: () => 1786438800000,
  fetchImpl: async (request) => {
    const url = new URL(request.url);
    financeRequests.push(url.pathname + url.search);
    let data;
    if (url.pathname === "/authorization/202309/shops") {
      data = { shops: [{ id: "shop-1", cipher: "shop-cipher", name: "DreamWeave" }] };
    } else if (url.pathname === "/finance/202309/statements") {
      data = { statements: [{ id: "statement-1" }], next_page_token: "" };
    } else if (url.pathname === "/finance/202501/statements/statement-1/statement_transactions") {
      data = { transactions: [{ order_id: "order-1" }], next_page_token: "" };
    } else if (url.pathname === "/finance/202501/orders/order-1/statement_transactions") {
      data = { order_id: "order-1", settlement_amount: "30.00", sku_transactions: [] };
    } else if (url.pathname === "/finance/202507/orders/unsettled") {
      const secondPage = url.searchParams.get("page_token") === "unsettled-next";
      data = secondPage
        ? { transactions: [{ order_id: "order-u2" }], next_page_token: "" }
        : { transactions: [{ order_id: "order-u1" }], next_page_token: "unsettled-next" };
    } else throw new Error(`unexpected test request ${url.pathname}`);
    return new Response(JSON.stringify({ code: 0, message: "Success", data }), {
      headers: { "content-type": "application/json" }
    });
  }
});

assert.deepEqual(
  await financeClient.getAuthorizedShops(),
  [{ id: "shop-1", cipher: "shop-cipher", name: "DreamWeave" }],
  "授权完成后必须通过官方接口确认店铺 cipher"
);
const settledFinance = await financeClient.listSettledTransactions({ startTime: 1786352400, endTime: 1786438800 });
assert.deepEqual(settledFinance.map((row) => row.order_id), ["order-1"], "已结算同步必须下钻到订单和 SKU 财务明细");
assert.ok(
  financeRequests.some((url) => url.startsWith("/finance/202501/orders/order-1/statement_transactions")),
  "SKU 结算必须使用未废弃的 Finance v202501"
);
const unsettledFinance = await financeClient.listUnsettledTransactions({ startTime: 1786352400, endTime: 1786438800 });
assert.deepEqual(unsettledFinance.map((row) => row.order_id), ["order-u1", "order-u2"], "未结算预估也必须读取全部分页");
assert.equal(
  financeRequests.filter((url) => url.startsWith("/finance/202507/orders/unsettled")).length,
  2,
  "未结算接口存在分页令牌时必须继续读取"
);

const adRequests = [];
const adsClient = createTikTokAdsClient({
  accessToken: "ads-token",
  advertiserId: "advertiser-1",
  fetchImpl: async (request) => {
    const url = new URL(request.url);
    adRequests.push({ url, token: request.headers.get("access-token") });
    const page = Number(url.searchParams.get("page"));
    const list = page === 1
      ? [{ dimensions: { ad_id: "ad-1", stat_time_day: "2026-08-10" }, metrics: { billed_cost: "8.50", spend: "9.00", campaign_id: "campaign-1" } }]
      : [{ dimensions: { ad_id: "ad-2", stat_time_day: "2026-08-10" }, metrics: { billed_cost: "-", spend: "4.25", campaign_id: "campaign-2" } }];
    return new Response(JSON.stringify({ code: 0, message: "OK", data: { list, page_info: { total_page: 2 } } }), {
      headers: { "content-type": "application/json" }
    });
  }
});
const adRows = await adsClient.loadDailyReport({ dateKey: "2026-08-10" });
assert.equal(adRows.length, 2, "广告报表必须读取全部分页");
assert.equal(adRequests.length, 2);
assert.equal(adRequests[0].token, "ads-token", "广告令牌必须只通过请求头发送");
assert.deepEqual(
  JSON.parse(adRequests[0].url.searchParams.get("dimensions")),
  ["ad_id", "stat_time_day"],
  "广告花费必须按广告与自然日获取，才能稳定映射到链接"
);
assert.equal(adRequests[0].url.searchParams.has("access_token"), false, "广告令牌不得泄漏到 URL");
assert.deepEqual(
  mapTikTokAdSpend(adRows, {
    adMappings: [
      { adId: "ad-1", platformListingId: "platform-listing-1" },
      { campaignId: "campaign-2", platformListingId: "platform-listing-1" }
    ]
  }, "2026-08-10"),
  [{ platformListingId: "platform-listing-1", dateKey: "2026-08-10", amount: 12.75 }],
  "广告净花费必须优先取 billed_cost，并按已确认映射汇总到链接"
);

const state = {
  profitStores: [{ id: "store-1", name: "DreamWeave", platformShopId: "shop-1" }],
  profitProducts: [{ id: "product-1", code: "JZZ", name: "颈椎枕", standardUnitCost: 12 }],
  profitSkuMasters: [{ id: "sku-1", productId: "product-1", code: "JZZ-GREY", name: "灰色", platformSkuId: "platform-sku-1" }],
  profitListings: [{ id: "listing-1", productId: "product-1", storeId: "store-1", platformListingId: "platform-listing-1", sampleTypes: [{ id: "sample", unitCost: 12 }] }],
  profitListingSkus: [{ id: "listing-sku-1", listingId: "listing-1", skuId: "sku-1", platformSkuId: "platform-sku-1", commissionRateOverride: 5, active: true }],
  profitDailyFacts: [],
  profitDailyExpenses: [{
    id: "listing-1-expense-2026-08-10",
    listingId: "listing-1",
    dateKey: "2026-08-10",
    sampleQuantities: { sample: 1 },
    advertisingSpend: null,
    marketingSpend: null,
    adjustments: 3,
    entryStatus: "completed"
  }],
  profitDailySettlements: [],
  profitSyncRecords: []
};

const connection = {
  id: "connection-1",
  storeId: "store-1",
  shopId: "shop-1",
  shopCipher: "shop-cipher",
  storeTimezone: "America/Los_Angeles"
};

const orders = [{
  id: "order-1",
  create_time: 1786352400,
  status: "COMPLETED",
  line_items: [{
    product_id: "platform-listing-1",
    sku_id: "platform-sku-1",
    seller_sku: "JZZ-GREY",
    quantity: 2,
    sale_price: "18.00"
  }]
}, {
  id: "order-unmapped",
  create_time: 1786352400,
  status: "COMPLETED",
  line_items: [{ product_id: "unknown", sku_id: "unknown", quantity: 1, sale_price: "99.00" }]
}];

const settledTransactions = [{
  order_id: "order-1",
  revenue_amount: "36.00",
  shipping_cost_amount: "-4.00",
  fee_and_tax_amount: "-2.00",
  settlement_amount: "30.00",
  sku_transactions: [{
    sku_id: "platform-sku-1",
    revenue_amount: "36.00",
    shipping_cost_amount: "-4.00",
    fee_and_tax_amount: "-2.00",
    settlement_amount: "30.00"
  }]
}];

const syncedAt = "2026-08-11T09:05:00.000Z";
const settled = createProfitSyncPatch({
  state,
  connection,
  dateKey: "2026-08-10",
  orders,
  settledTransactions,
  unsettledTransactions: [],
  adSpend: [{ platformListingId: "platform-listing-1", dateKey: "2026-08-10", amount: 12.34 }],
  syncedAt
});

assert.equal(settled.diagnostics.matchedOrderCount, 1, "只应汇总已映射到工作台链接的订单");
assert.equal(settled.diagnostics.unmatchedOrderCount, 1, "未知链接必须进入诊断而不是自动创建错误产品");

const settledFact = settled.collections.profitDailyFacts.upserts[0];
assert.deepEqual(
  {
    id: settledFact.id,
    listingId: settledFact.listingId,
    listingSkuId: settledFact.listingSkuId,
    dateKey: settledFact.dateKey,
    gmv: settledFact.gmv,
    itemsSold: settledFact.itemsSold,
    orderCount: settledFact.orderCount,
    actualReceived: settledFact.actualReceived,
    shippingFee: settledFact.shippingFee,
    platformFees: settledFact.platformFees,
    source: settledFact.source
  },
  {
    id: "listing-sku-1-2026-08-10",
    listingId: "listing-1",
    listingSkuId: "listing-sku-1",
    dateKey: "2026-08-10",
    gmv: 36,
    itemsSold: 2,
    orderCount: 1,
    actualReceived: 30,
    shippingFee: 4,
    platformFees: 2,
    source: "TikTok Shop Open API"
  },
  "订单与 SKU 结算必须聚合为稳定且可重复覆盖的当日事实"
);

assert.deepEqual(
  settled.collections.profitDailySettlements.upserts[0],
  {
    id: "listing-1-settlement-2026-08-10",
    listingId: "listing-1",
    dateKey: "2026-08-10",
    listingGmv: 36,
    sumSkuGmv: 36,
    orderCount: 1,
    itemsSold: 2,
    netProductSales: 36,
    platformDiscounts: 0,
    shippingFee: 4,
    platformFees: 2,
    totalOrderCost: 6,
    estimatedReceived: 30,
    settlementAmount: 30,
    settlementStatus: "settled",
    statementDate: "2026-08-10",
    source: "TikTok Shop Finance API v202501",
    sourceUpdatedAt: syncedAt
  },
  "已结算财务交易才能写入实际到手"
);

assert.deepEqual(
  settled.collections.profitDailyExpenses.upserts[0],
  {
    ...state.profitDailyExpenses[0],
    advertisingSpend: 12.34,
    marketingSpend: 12.34,
    source: "TikTok Marketing API",
    sourceUpdatedAt: syncedAt
  },
  "广告同步只能更新广告费，不能覆盖寄样和内部调整"
);

const estimated = createProfitSyncPatch({
  state,
  connection,
  dateKey: "2026-08-10",
  orders: [orders[0]],
  settledTransactions: [],
  unsettledTransactions: [{
    order_id: "order-1",
    revenue_amount: "36.00",
    shipping_cost_amount: "-4.00",
    fee_and_tax_amount: "-2.00",
    settlement_amount: "30.00",
    sku_transactions: settledTransactions[0].sku_transactions
  }],
  adSpend: [],
  syncedAt
});

const estimatedSettlement = estimated.collections.profitDailySettlements.upserts[0];
assert.equal(estimatedSettlement.settlementStatus, "estimated", "未结算交易必须明确标为预估");
assert.equal(estimatedSettlement.settlementAmount, null, "未结算交易禁止写入实际到手");
assert.equal(estimatedSettlement.estimatedReceived, 30, "未结算交易可以保留预估到手供经营参考");
assert.equal(estimated.collections.profitDailyExpenses.upserts.length, 0, "广告源无数据时不得用零覆盖人工费用");

const zeroSettlement = createProfitSyncPatch({
  state,
  connection,
  dateKey: "2026-08-10",
  orders: [orders[0]],
  settledTransactions: [{
    order_id: "order-1",
    revenue_amount: "0.00",
    shipping_cost_amount: "0.00",
    fee_and_tax_amount: "0.00",
    settlement_amount: "0.00",
    sku_transactions: [{ sku_id: "platform-sku-1", settlement_amount: "0.00" }]
  }],
  unsettledTransactions: [],
  adSpend: [],
  syncedAt
});
assert.equal(zeroSettlement.collections.profitDailyFacts.upserts[0].actualReceived, 0, "已结算为零必须保留为实际值，不能误判成未结算");

const noConnection = createProfitSyncPatch({
  state,
  connection: null,
  dateKey: "2026-08-10",
  orders: [],
  settledTransactions: [],
  unsettledTransactions: [],
  adSpend: [],
  syncedAt
});
assert.equal(noConnection.status, "unconfigured", "未授权店铺必须显式返回未配置状态");
assert.deepEqual(noConnection.collections, {}, "未授权状态不得生成任何覆盖云端数据的补丁");

assert.equal(
  defaultProfitSyncDate(new Date("2026-08-11T09:00:00.000Z"), "America/Los_Angeles"),
  "2026-08-10",
  "北京时间 17 点同步时必须默认拉取店铺时区的前一个完整自然日"
);
assert.deepEqual(
  profitDateUtcWindow("2026-08-10", "America/Los_Angeles"),
  { startTime: 1786345200, endTime: 1786431600 },
  "API 查询窗口必须正确换算店铺时区的本地自然日"
);

const syncClients = new Map([
  ["connection-1", {
    searchOrders: async () => [orders[0]],
    listSettledTransactions: async () => settledTransactions,
    listUnsettledTransactions: async () => []
  }],
  ["connection-failed", {
    searchOrders: async () => { throw Object.assign(new Error("rate limited"), { code: "TIKTOK_API_ERROR" }); },
    listSettledTransactions: async () => [],
    listUnsettledTransactions: async () => []
  }]
]);
const automatic = await runProfitAutomaticSync({
  state,
  connections: [connection, { ...connection, id: "connection-failed", storeId: "store-2" }],
  dateKey: "2026-08-10",
  syncedAt,
  clientFactory: (current) => syncClients.get(current.id),
  loadAdSpend: async (current) => current.id === "connection-1"
    ? [{ platformListingId: "platform-listing-1", dateKey: "2026-08-10", amount: 12.34 }]
    : []
});
assert.equal(automatic.status, "partial", "单店失败不能丢弃其他店铺已成功同步的数据");
assert.equal(automatic.collections.profitDailyFacts.upserts.length, 1, "成功店铺数据必须继续生成云端补丁");
assert.equal(automatic.failures.length, 1, "失败店铺必须进入可见诊断");
assert.equal(automatic.failures[0].connectionId, "connection-failed");
assert.equal(automatic.collections.profitSyncRecords.upserts[0].state, "partial", "总同步状态必须反映部分失败");

const adsFailure = await runProfitAutomaticSync({
  state,
  connections: [connection],
  dateKey: "2026-08-10",
  syncedAt,
  clientFactory: () => syncClients.get("connection-1"),
  loadAdSpend: async () => { throw Object.assign(new Error("ads timeout"), { code: "ADS_API_ERROR" }); }
});
assert.equal(adsFailure.status, "partial", "广告接口失败时同步状态必须提示部分失败");
assert.equal(adsFailure.collections.profitDailyFacts.upserts.length, 1, "广告接口失败不得丢弃已抓取的订单和结算");
assert.equal(adsFailure.failures[0].provider, "tiktok_ads", "广告失败必须可被准确诊断和重试");

const automaticUnconfigured = await runProfitAutomaticSync({ state, connections: [], dateKey: "2026-08-10", syncedAt });
assert.equal(automaticUnconfigured.status, "unconfigured");
assert.deepEqual(automaticUnconfigured.collections, {}, "没有任何店铺授权时严禁生成空数据覆盖补丁");

console.log(JSON.stringify({ passed: 51, phase: "profit-automatic-sync" }));
