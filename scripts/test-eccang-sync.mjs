import assert from "node:assert/strict";
import {
  canonicalEccangSignInput,
  createEccangClient,
  createEccangProfitSyncPatch,
  prepareEccangTrackedListings,
  signEccangRequest
} from "../functions/_shared/eccang-sync.js";

const signatureParams = {
  app_key: "app-key-12345678",
  biz_content: '{"page":1}',
  charset: "UTF-8",
  interface_method: "getOrderList",
  nonce_str: "nonce-1",
  service_id: "SERVICE1",
  sign_type: "AES",
  timestamp: "1786438800000",
  version: "V1.0.0"
};

assert.equal(
  canonicalEccangSignInput({ ...signatureParams, sign: "ignored", optional: "" }),
  'app_key=app-key-12345678&biz_content={"page":1}&charset=UTF-8&interface_method=getOrderList&nonce_str=nonce-1&service_id=SERVICE1&sign_type=AES&timestamp=1786438800000&version=V1.0.0',
  "E仓签名串必须按字段名排序，并排除 sign 和空值"
);

assert.equal(
  await signEccangRequest({ appSecret: "secret-123456789", params: signatureParams }),
  "dQsGHlHkK1VXt5RoqvXDrSyjLmWZV/KhQdQqC698FqH43N2R5ncIqhpmqQksfv3TL7t1nnimn4US2mvaamWqKeVV1+ZW429PpPH1EqiIhMSg8op8Q917v84uH+QGmPYlSe6pKgK/UqZ1aDcvcFLklPTDOzBQbfLOy+1XcAMAONmn9SP/Z1K/hST/cZvtA5eNrEiIw1stLyhF2xXlRqnDGhRXpOpkX9qNXQSQMQTNKFE1vDWhPWlv0kQgKnQPbcv3",
  "E仓 AES 签名必须使用官方 CBC、固定 IV 和 PKCS7 规则"
);

assert.throws(
  () => createEccangClient({
    appKey: "app-key-12345678",
    appSecret: "secret-123456789",
    serviceId: "SERVICE1",
    endpoint: "https://example.com/collect"
  }),
  (error) => error.code === "ECCANG_API_ERROR",
  "应用密钥只允许发送到 E仓官方域名"
);

const receivedRequests = [];
const pages = [{
  code: "200",
  message: "Success",
  biz_content: JSON.stringify({
    data: [{ order_id: "1", order_code: "TK-1", user_account: "DreamWeave", order_details: [] }],
    total: "2",
    page: 1,
    page_size: 1
  })
}, {
  code: "200",
  message: "Success",
  biz_content: JSON.stringify({
    data: [{ order_id: "2", order_code: "TK-2", user_account: "DreamWeave", order_details: [] }],
    total: "2",
    page: 2,
    page_size: 1
  })
}];
let timestamp = 1786438800000;
let nonce = 0;
const client = createEccangClient({
  appKey: "app-key-12345678",
  appSecret: "secret-123456789",
  serviceId: "SERVICE1",
  pageSize: 1,
  now: () => timestamp++,
  createNonce: () => `nonce-${++nonce}`,
  fetchImpl: async (request) => {
    receivedRequests.push(await request.clone().json());
    return new Response(JSON.stringify(pages.shift()), {
      headers: { "content-type": "application/json" }
    });
  }
});

const orders = await client.listOrders({
  startDateTime: "2026-08-10 00:00:00",
  endDateTime: "2026-08-10 23:59:59",
  userAccounts: ["DreamWeave"]
});
assert.deepEqual(Object.keys(client), ["listOrders"], "E仓客户端只能暴露 TikTok 销售订单读取能力");
assert.deepEqual(orders.map((order) => order.order_code), ["TK-1", "TK-2"], "E仓订单必须读取全部分页");
assert.equal(receivedRequests.length, 2);
assert.deepEqual(
  JSON.parse(receivedRequests[0].biz_content),
  {
    page: 1,
    page_size: 1,
    get_detail: 1,
    condition: {
      platform_paid_date_start: "2026-08-10 00:00:00",
      platform_paid_date_end: "2026-08-10 23:59:59",
      user_account_list: ["DreamWeave"]
    }
  },
  "订单查询必须按平台付款时间和已确认店铺限定范围"
);
assert.equal(receivedRequests[0].interface_method, "getOrderList");
assert.notEqual(receivedRequests[0].nonce_str, receivedRequests[1].nonce_str, "每个分页请求必须生成新的防重放随机串");
assert.notEqual(receivedRequests[0].sign, receivedRequests[1].sign, "每个分页请求必须重新签名");

const failingClient = createEccangClient({
  appKey: "app-key-12345678",
  appSecret: "top-secret-value",
  serviceId: "SERVICE1",
  fetchImpl: async () => new Response(JSON.stringify({
    code: "300",
    message: "验签失败",
    error: [{ error_code: "common.error.code.0028", error_msg: "验签失败" }]
  }))
});
await assert.rejects(
  failingClient.listOrders({ startDateTime: "2026-08-10 00:00:00", endDateTime: "2026-08-10 23:59:59" }),
  (error) => error.code === "ECCANG_API_ERROR" && !error.message.includes("top-secret-value"),
  "E仓接口错误不得回显应用密钥"
);

const state = {
  profitStores: [{ id: "store-1", name: "DreamWeave" }],
  profitProducts: [{ id: "product-1", code: "JZZ", name: "颈椎枕", standardUnitCost: 12 }],
  profitSkuMasters: [{ id: "sku-1", productId: "product-1", code: "JZZ-GREY", name: "灰色" }],
  profitListings: [{
    id: "listing-1",
    productId: "product-1",
    storeId: "store-1",
    platformListingId: "1729384756",
    displayName: "JZZ 主链接",
    sampleTypes: []
  }],
  profitListingSkus: [{ id: "listing-sku-1", listingId: "listing-1", skuId: "sku-1", platformSkuId: "TK-SKU-1", active: true }],
  profitDailyFacts: [],
  profitDailyExpenses: [],
  profitDailySettlements: [],
  profitSyncRecords: []
};

const patch = createEccangProfitSyncPatch({
  state,
  connection: { id: "eccang-dreamweave", storeId: "store-1", userAccount: "DreamWeave" },
  dateKey: "2026-08-10",
  orders: [{
    order_id: "ERP-1",
    order_code: "TK-ORDER-1",
    user_account: "DreamWeave",
    amountpaid: "36.00",
    cost_ship_fee: "4.00",
    platform_fee_total: "1.20",
    finalvalue_fee_total: "0.80",
    other_fee: "0",
    order_details: [{
      platform_sku: "TK-SKU-1",
      product_sku_org: "JZZ-GREY",
      product_url: "https://shop.tiktok.com/view/product/1729384756",
      unit_price: "18.00",
      qty: "2"
    }]
  }],
  syncedAt: "2026-08-11T09:05:00.000Z"
});

assert.equal(patch.status, "synced");
assert.equal(patch.diagnostics.matchedOrderCount, 1);
assert.deepEqual(
  patch.collections.profitDailyFacts.upserts.map((fact) => ({
    listingSkuId: fact.listingSkuId,
    gmv: fact.gmv,
    units: fact.units,
    actualReceived: fact.actualReceived,
    shippingFee: fact.shippingFee,
    platformFees: fact.platformFees,
    source: fact.source
  })),
  [{
    listingSkuId: "listing-sku-1",
    gmv: 36,
    units: 2,
    actualReceived: null,
    shippingFee: 0,
    platformFees: 0,
    source: "E仓 Open API"
  }],
  "E仓只读取销售订单，并通过店铺、链接和 SKU 映射销售事实"
);
assert.equal(patch.collections.profitDailySettlements.upserts[0].settlementAmount, null, "销售只读同步不得伪装成结算数据");
assert.equal(patch.collections.profitDailySettlements.upserts[0].source, "E仓 Open API");

const trackedState = {
  profitStores: [{ id: "store-example", name: "Example Store" }],
  profitProducts: [],
  profitSkuMasters: [],
  profitListings: [],
  profitListingSkus: [],
  profitProductCostHistory: [],
  profitDailyFacts: [],
  profitDailyExpenses: [],
  profitDailySettlements: [],
  profitSyncRecords: []
};
const trackedConnection = {
  id: "eccang-example-store",
  storeId: "store-example",
  userAccount: "ExampleAccount",
  storeTimezone: "America/Los_Angeles"
};
const trackedManifest = [{
  connectionId: "eccang-example-store",
  id: "listing-example-product",
  productId: "product-example",
  productCode: "EXAMPLE",
  productName: "Example Product",
  standardUnitCost: 10,
  costEffectiveAt: "2026-08-05",
  platformListingId: "1234567890123456789",
  launchedAt: "2026-08-05",
  skus: [{
    skuId: "product-example-sku-white",
    listingSkuId: "listing-example-product-sku-white",
    sellerSku: "EXAMPLE-WHITE",
    platformSkuId: "1234567890123456790",
    name: "White",
    standardCost: 10
  }]
}];
const preparedTracked = prepareEccangTrackedListings({
  state: trackedState,
  connection: trackedConnection,
  trackedListings: trackedManifest
});
assert.equal(preparedTracked.diagnostics.provisionedListingCount, 1, "明确允许的链接可由后台增量建立映射");
assert.equal(preparedTracked.diagnostics.provisionedSkuCount, 1);
assert.equal(preparedTracked.collections.profitListings.upserts[0].platformListingId, "1234567890123456789");
assert.equal(preparedTracked.collections.profitListingSkus.upserts[0].sellerSku, "EXAMPLE-WHITE");
assert.equal(preparedTracked.collections.profitListingSkus.deletes.length, 0, "后台建档不得删除已有数据");

const preparedWithNewStore = prepareEccangTrackedListings({
  state: { ...trackedState, profitStores: [] },
  connection: trackedConnection,
  trackedListings: [{ ...trackedManifest[0], storeName: "Example Store" }]
});
assert.deepEqual(
  preparedWithNewStore.collections.profitStores.upserts,
  [{ id: "store-example", name: "Example Store", accountName: "", status: "active" }],
  "明确店铺 ID 与名称时可在后台增量建立利润店铺"
);
assert.equal(preparedWithNewStore.collections.profitStores.deletes.length, 0);

const trackedSalesPatch = createEccangProfitSyncPatch({
  state: preparedTracked.state,
  connection: trackedConnection,
  dateKey: "2026-08-11",
  orders: [{
    order_id: "ERP-MT-1",
    order_code: "TK-MT-1",
    user_account: "ExampleAccount",
    order_details: [{
      product_id: "1234567890123456789",
      product_sku_org: "EXAMPLE-WHITE",
      unit_price: "11.99",
      qty: "2"
    }]
  }],
  syncedAt: "2026-08-12T09:05:00.000Z"
});
assert.equal(trackedSalesPatch.diagnostics.matchedOrderCount, 1, "E仓 Seller SKU 必须匹配后台显式映射");
assert.deepEqual(
  trackedSalesPatch.collections.profitDailyFacts.upserts.map((fact) => ({ gmv: fact.gmv, itemsSold: fact.itemsSold })),
  [{ gmv: 23.98, itemsSold: 2 }]
);

const missingStoreTracked = prepareEccangTrackedListings({
  state: { ...trackedState, profitStores: [] },
  connection: trackedConnection,
  trackedListings: trackedManifest
});
assert.equal(missingStoreTracked.collections.profitListings.upserts.length, 0, "找不到精确店铺 ID 时禁止自动猜测建档");
assert.equal(missingStoreTracked.diagnostics.skippedTrackedListings[0].reason, "store_not_found");

console.log(JSON.stringify({ passed: 29, phase: "eccang-profit-sync" }));
