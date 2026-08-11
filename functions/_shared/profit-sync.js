const SIGN_EXCLUDED_QUERY_KEYS = new Set(["sign", "access_token"]);

function finiteNumber(value, fallback = 0) {
  if (value && typeof value === "object") {
    value = value.amount ?? value.value ?? value.total ?? value.price;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function money(value) {
  return Math.round((finiteNumber(value) + Number.EPSILON) * 100) / 100;
}

function positiveMoney(value) {
  return money(Math.abs(finiteNumber(value)));
}

function lineQuantity(line) {
  return Math.max(0, Math.round(finiteNumber(
    line?.quantity ?? line?.item_quantity ?? line?.sku_quantity ?? line?.units,
    1
  )));
}

function lineUnitPrice(line) {
  return Math.max(0, finiteNumber(
    line?.sale_price
      ?? line?.salePrice
      ?? line?.original_price
      ?? line?.originalPrice
      ?? line?.sku_sale_price
      ?? line?.price
  ));
}

function lineGmv(line) {
  const explicit = line?.line_item_amount
    ?? line?.lineItemAmount
    ?? line?.total_price
    ?? line?.totalPrice;
  return explicit === null || explicit === undefined
    ? money(lineUnitPrice(line) * lineQuantity(line))
    : money(Math.max(0, finiteNumber(explicit)));
}

function orderLines(order) {
  const lines = order?.line_items ?? order?.lineItems ?? order?.items ?? order?.sku_list;
  return Array.isArray(lines) ? lines : [];
}

function transactionOrderId(transaction) {
  return String(transaction?.order_id ?? transaction?.orderId ?? transaction?.id ?? "");
}

function transactionSkuRows(transaction) {
  const rows = transaction?.sku_transactions ?? transaction?.skuTransactions ?? transaction?.sku_statement_transactions;
  return Array.isArray(rows) ? rows : [];
}

function transactionSkuId(row) {
  return String(row?.sku_id ?? row?.skuId ?? row?.seller_sku ?? row?.sellerSku ?? "");
}

function financeAmounts(record = {}) {
  return {
    revenue: money(record.revenue_amount ?? record.revenueAmount),
    shipping: positiveMoney(record.shipping_cost_amount ?? record.shippingCostAmount),
    fees: positiveMoney(record.fee_and_tax_amount ?? record.feeAndTaxAmount ?? record.fee_amount),
    received: money(record.settlement_amount ?? record.settlementAmount)
  };
}

function emptyCollections() {
  return {
    profitDailyFacts: { upserts: [], deletes: [] },
    profitDailyExpenses: { upserts: [], deletes: [] },
    profitDailySettlements: { upserts: [], deletes: [] },
    profitSyncRecords: { upserts: [], deletes: [] }
  };
}

function currentCost(state, listingSku) {
  const listing = (state.profitListings || []).find((item) => item.id === listingSku.listingId);
  const product = (state.profitProducts || []).find((item) => item.id === listing?.productId);
  return money(listingSku.storeCostOverride ?? product?.standardUnitCost ?? 0);
}

function findListingSku(state, listing, line) {
  const platformSkuId = String(line?.sku_id ?? line?.skuId ?? "");
  const sellerSku = String(line?.seller_sku ?? line?.sellerSku ?? "").trim().toLowerCase();
  const skuMasters = new Map((state.profitSkuMasters || []).map((sku) => [sku.id, sku]));
  return (state.profitListingSkus || []).find((listingSku) => {
    if (listingSku.listingId !== listing.id) return false;
    const sku = skuMasters.get(listingSku.skuId);
    return (platformSkuId && [listingSku.platformSkuId, sku?.platformSkuId].map(String).includes(platformSkuId))
      || (sellerSku && String(sku?.code || "").trim().toLowerCase() === sellerSku);
  }) || null;
}

function addFinance(target, amounts, settled) {
  target.netProductSales += amounts.revenue;
  target.shippingFee += amounts.shipping;
  target.platformFees += amounts.fees;
  target.estimatedReceived += amounts.received;
  if (settled) target.actualReceived += amounts.received;
}

function allocateFinance(orderMatch, transaction, factTotals, listingTotals, settled) {
  if (!orderMatch || !transaction) return;
  const skuRows = transactionSkuRows(transaction);
  const rowsBySku = new Map(skuRows.map((row) => [transactionSkuId(row), row]));
  const orderAmounts = financeAmounts(transaction);
  const totalGmv = orderMatch.lines.reduce((sum, item) => sum + item.gmv, 0);

  orderMatch.lines.forEach((item) => {
    const skuId = String(item.platformSkuId || item.sellerSku || "");
    const skuFinance = rowsBySku.get(skuId);
    const ratio = totalGmv > 0 ? item.gmv / totalGmv : 1 / Math.max(1, orderMatch.lines.length);
    const amounts = skuFinance
      ? financeAmounts(skuFinance)
      : {
          revenue: money(orderAmounts.revenue * ratio),
          shipping: money(orderAmounts.shipping * ratio),
          fees: money(orderAmounts.fees * ratio),
          received: money(orderAmounts.received * ratio)
        };
    addFinance(factTotals.get(item.listingSku.id), amounts, settled);
    const factTotal = factTotals.get(item.listingSku.id);
    factTotal.financeOrderIds.add(orderMatch.orderId);
    if (settled) factTotal.settledOrderIds.add(orderMatch.orderId);
  });

  addFinance(listingTotals.get(orderMatch.listing.id), orderAmounts, settled);
  const listingTotal = listingTotals.get(orderMatch.listing.id);
  listingTotal.financeOrderIds.add(orderMatch.orderId);
  if (settled) listingTotal.settledOrderIds.add(orderMatch.orderId);
}

function adListingId(state, connection, row) {
  if (row?.listingId) return String(row.listingId);
  const platformListingId = String(row?.platformListingId ?? row?.product_id ?? row?.productId ?? "");
  return (state.profitListings || []).find((listing) => (
    listing.storeId === connection.storeId && String(listing.platformListingId || "") === platformListingId
  ))?.id || "";
}

function expenseComplete(listing, expense) {
  const samplesComplete = (listing?.sampleTypes || []).every((sample) => {
    const value = expense.sampleQuantities?.[sample.id];
    return value !== null && value !== undefined && value !== "";
  });
  return samplesComplete
    && expense.advertisingSpend !== null
    && expense.advertisingSpend !== undefined
    && expense.adjustments !== null
    && expense.adjustments !== undefined;
}

export function canonicalTikTokSignInput({ path, query = {}, body = "" } = {}) {
  const queryString = Object.entries(query)
    .filter(([key, value]) => !SIGN_EXCLUDED_QUERY_KEYS.has(key) && value !== undefined && value !== null)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${Array.isArray(value) ? value.join(",") : String(value)}`)
    .join("");
  return `${String(path || "")}${queryString}${String(body || "")}`;
}

export async function signTikTokShopRequest({ appSecret, path, query = {}, body = "" } = {}) {
  const canonical = canonicalTikTokSignInput({ path, query, body });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(appSecret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${appSecret}${canonical}${appSecret}`)
  );
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createTikTokShopClient({
  appKey,
  appSecret,
  accessToken,
  shopCipher,
  baseUrl = "https://open-api.tiktokglobalshop.com",
  fetchImpl = fetch,
  now = () => Date.now()
} = {}) {
  async function request(path, { method = "GET", query = {}, body = null } = {}) {
    const timestamp = Math.floor(now() / 1000);
    const bodyText = body === null ? "" : JSON.stringify(body);
    const signedQuery = {
      ...query,
      app_key: appKey,
      timestamp
    };
    signedQuery.sign = await signTikTokShopRequest({ appSecret, path, query: signedQuery, body: bodyText });
    const url = new URL(path, baseUrl);
    Object.entries(signedQuery).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    });
    const response = await fetchImpl(new Request(url, {
      method,
      headers: {
        "content-type": "application/json",
        "x-tts-access-token": String(accessToken || "")
      },
      body: bodyText || undefined
    }));
    let payload;
    try {
      payload = await response.json();
    } catch {
      const error = new Error(`TikTok Shop 返回无效响应（HTTP ${response.status}）`);
      error.code = "TIKTOK_API_ERROR";
      throw error;
    }
    if (!response.ok || Number(payload?.code) !== 0) {
      const error = new Error(`TikTok Shop API：${payload?.message || `HTTP ${response.status}`}`);
      error.code = "TIKTOK_API_ERROR";
      error.platformCode = payload?.code ?? null;
      error.requestId = payload?.request_id || "";
      throw error;
    }
    return payload.data || {};
  }

  async function collectPages({ path, method = "GET", query = {}, body = null, recordsKey }) {
    const records = [];
    let pageToken = "";
    do {
      const data = await request(path, {
        method,
        query: { ...query, page_token: pageToken || undefined },
        body
      });
      records.push(...(Array.isArray(data[recordsKey]) ? data[recordsKey] : []));
      pageToken = String(data.next_page_token || "");
    } while (pageToken);
    return records;
  }

  async function mapLimited(values, mapper, concurrency = 4) {
    const results = new Array(values.length);
    let cursor = 0;
    async function worker() {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await mapper(values[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
    return results;
  }

  return {
    async getAuthorizedShops() {
      const data = await request("/authorization/202309/shops");
      return Array.isArray(data.shops) ? data.shops : [];
    },
    async listSettledTransactions({ startTime, endTime } = {}) {
      const statements = await collectPages({
        path: "/finance/202309/statements",
        query: {
          shop_cipher: shopCipher,
          statement_time_ge: startTime,
          statement_time_lt: endTime,
          sort_field: "statement_time",
          sort_order: "ASC",
          page_size: 100
        },
        recordsKey: "statements"
      });
      const statementTransactions = (await mapLimited(statements, (statement) => collectPages({
        path: `/finance/202501/statements/${encodeURIComponent(statement.id)}/statement_transactions`,
        query: {
          shop_cipher: shopCipher,
          sort_field: "order_create_time",
          sort_order: "ASC",
          page_size: 100
        },
        recordsKey: "transactions"
      }))).flat();
      const orderIds = [...new Set(statementTransactions.map(transactionOrderId).filter(Boolean))];
      return mapLimited(orderIds, (orderId) => request(
        `/finance/202501/orders/${encodeURIComponent(orderId)}/statement_transactions`,
        { query: { shop_cipher: shopCipher } }
      ));
    },
    async listUnsettledTransactions({ startTime, endTime } = {}) {
      return collectPages({
        path: "/finance/202507/orders/unsettled",
        query: {
          shop_cipher: shopCipher,
          search_time_ge: startTime,
          search_time_lt: endTime,
          sort_field: "order_create_time",
          sort_order: "ASC",
          page_size: 100
        },
        recordsKey: "transactions"
      });
    },
    async searchOrders({ startTime, endTime } = {}) {
      return collectPages({
        path: "/order/202309/orders/search",
        method: "POST",
        query: { shop_cipher: shopCipher, page_size: 100 },
        body: { create_time_ge: startTime, create_time_lt: endTime },
        recordsKey: "orders"
      });
    }
  };
}

export function createTikTokAdsClient({
  accessToken,
  advertiserId,
  baseUrl = "https://business-api.tiktok.com",
  fetchImpl = fetch
} = {}) {
  return {
    async loadDailyReport({ dateKey } = {}) {
      const rows = [];
      let page = 1;
      let totalPages = 1;
      do {
        const url = new URL("/open_api/v1.3/report/integrated/get/", baseUrl);
        const query = {
          advertiser_id: advertiserId,
          report_type: "BASIC",
          data_level: "AUCTION_AD",
          dimensions: JSON.stringify(["ad_id", "stat_time_day"]),
          metrics: JSON.stringify(["spend", "billed_cost", "campaign_id", "adgroup_id"]),
          start_date: dateKey,
          end_date: dateKey,
          page,
          page_size: 1000
        };
        Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, String(value)));
        const response = await fetchImpl(new Request(url, {
          headers: { "access-token": String(accessToken || "") }
        }));
        let payload;
        try {
          payload = await response.json();
        } catch {
          const error = new Error(`TikTok Ads 返回无效响应（HTTP ${response.status}）`);
          error.code = "TIKTOK_ADS_API_ERROR";
          throw error;
        }
        if (!response.ok || Number(payload?.code) !== 0) {
          const error = new Error(`TikTok Ads API：${payload?.message || `HTTP ${response.status}`}`);
          error.code = "TIKTOK_ADS_API_ERROR";
          error.platformCode = payload?.code ?? null;
          error.requestId = payload?.request_id || "";
          throw error;
        }
        rows.push(...(Array.isArray(payload?.data?.list) ? payload.data.list : []));
        totalPages = Math.max(1, Math.ceil(finiteNumber(payload?.data?.page_info?.total_page, 1)));
        page += 1;
      } while (page <= totalPages);
      return rows;
    }
  };
}

export function mapTikTokAdSpend(rows = [], connection = {}, dateKey) {
  const mappings = Array.isArray(connection.adMappings) ? connection.adMappings : [];
  const totals = new Map();
  rows.forEach((row) => {
    const dimensions = row?.dimensions || {};
    const metrics = row?.metrics || {};
    const mapping = mappings.find((item) => (
      (item.adId && String(item.adId) === String(dimensions.ad_id || metrics.ad_id || ""))
      || (item.adgroupId && String(item.adgroupId) === String(metrics.adgroup_id || dimensions.adgroup_id || ""))
      || (item.campaignId && String(item.campaignId) === String(metrics.campaign_id || dimensions.campaign_id || ""))
    ));
    if (!mapping?.platformListingId && !mapping?.listingId) return;
    const billed = Number(metrics.billed_cost);
    const spend = Number.isFinite(billed) ? billed : finiteNumber(metrics.spend);
    const key = mapping.listingId ? `listing:${mapping.listingId}` : `platform:${mapping.platformListingId}`;
    const current = totals.get(key) || {
      ...(mapping.listingId ? { listingId: String(mapping.listingId) } : { platformListingId: String(mapping.platformListingId) }),
      dateKey,
      amount: 0
    };
    current.amount = money(current.amount + Math.max(0, spend));
    totals.set(key, current);
  });
  return [...totals.values()];
}

function dateKeyInTimezone(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftUtcDateKey(dateKey, days) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "";
}

function zonedMidnightTimestamp(dateKey, timezone) {
  const [year, month, day] = String(dateKey).split("-").map(Number);
  const nominalUtc = Date.UTC(year, month - 1, day);
  let timestamp = nominalUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    const offset = representedAsUtc - timestamp;
    timestamp = nominalUtc - offset;
  }
  return timestamp;
}

export function defaultProfitSyncDate(now = new Date(), timezone = "America/Los_Angeles") {
  return shiftUtcDateKey(dateKeyInTimezone(now, timezone), -1);
}

export function profitDateUtcWindow(dateKey, timezone = "America/Los_Angeles") {
  return {
    startTime: Math.floor(zonedMidnightTimestamp(dateKey, timezone) / 1000),
    endTime: Math.floor(zonedMidnightTimestamp(shiftUtcDateKey(dateKey, 1), timezone) / 1000)
  };
}

function mergeSyncCollections(target, source) {
  Object.entries(source || {}).forEach(([name, operations]) => {
    if (name === "profitSyncRecords") return;
    if (!target[name]) target[name] = { upserts: [], deletes: [] };
    const byId = new Map(target[name].upserts.map((record) => [String(record.id), record]));
    (operations.upserts || []).forEach((record) => byId.set(String(record.id), record));
    target[name].upserts = [...byId.values()];
    target[name].deletes = [...new Set([...(target[name].deletes || []), ...(operations.deletes || [])])];
  });
}

export async function runProfitAutomaticSync({
  state = {},
  connections = [],
  dateKey,
  syncedAt = new Date().toISOString(),
  appKey,
  appSecret,
  fetchImpl = fetch,
  now = () => Date.now(),
  clientFactory = (connection) => createTikTokShopClient({
    appKey,
    appSecret,
    accessToken: connection.accessToken,
    shopCipher: connection.shopCipher,
    fetchImpl,
    now
  }),
  loadAdSpend = async () => []
} = {}) {
  const activeConnections = connections.filter((connection) => connection?.status !== "disabled");
  if (!activeConnections.length) {
    return { status: "unconfigured", collections: {}, failures: [], diagnostics: [] };
  }

  const collections = emptyCollections();
  collections.profitSyncRecords.upserts = [];
  const failures = [];
  const diagnostics = [];
  let partial = false;
  for (const connection of activeConnections) {
    const connectionDate = dateKey || defaultProfitSyncDate(new Date(now()), connection.storeTimezone || "America/Los_Angeles");
    const window = profitDateUtcWindow(connectionDate, connection.storeTimezone || "America/Los_Angeles");
    try {
      const client = clientFactory(connection);
      const [orders, settledTransactions, unsettledTransactions] = await Promise.all([
        client.searchOrders(window),
        client.listSettledTransactions(window),
        client.listUnsettledTransactions(window)
      ]);
      let adSpend = [];
      try {
        adSpend = await loadAdSpend(connection, { dateKey: connectionDate, ...window });
      } catch (error) {
        partial = true;
        failures.push({
          connectionId: connection.id || connection.storeId || "unknown",
          storeId: connection.storeId || "",
          provider: "tiktok_ads",
          code: error?.code || "ADS_SYNC_FAILED",
          message: String(error?.message || "广告费用同步失败").slice(0, 240)
        });
      }
      const patch = createProfitSyncPatch({
        state,
        connection,
        dateKey: connectionDate,
        orders,
        settledTransactions,
        unsettledTransactions,
        adSpend,
        syncedAt
      });
      mergeSyncCollections(collections, patch.collections);
      diagnostics.push({ connectionId: connection.id, status: patch.status, ...patch.diagnostics });
      if (patch.status !== "synced") partial = true;
    } catch (error) {
      partial = true;
      failures.push({
        connectionId: connection.id || connection.storeId || "unknown",
        storeId: connection.storeId || "",
        provider: "tiktok_shop",
        code: error?.code || "SYNC_FAILED",
        message: String(error?.message || "同步失败").slice(0, 240)
      });
    }
  }

  const status = partial ? "partial" : "synced";
  const failedShopConnections = new Set(
    failures.filter((failure) => failure.provider === "tiktok_shop").map((failure) => failure.connectionId)
  );
  const successCount = activeConnections.length - failedShopConnections.size;
  collections.profitSyncRecords.upserts = [{
    id: "main",
    state: status,
    lastSyncedAt: syncedAt,
    nextScheduledAt: new Date(Date.parse(syncedAt) + 24 * 60 * 60 * 1000).toISOString(),
    scheduleTimezone: "Asia/Shanghai",
    storeTimezone: "America/Los_Angeles",
    source: "TikTok Shop Open API · TikTok Marketing API",
    message: status === "synced"
      ? `${successCount} 家店铺订单、结算与广告数据已自动同步`
      : `${successCount}/${activeConnections.length} 家店铺经营数据已同步，${failures.length} 个数据源待重试`
  }];
  return { status, collections, failures, diagnostics };
}

export function createProfitSyncPatch({
  state = {},
  connection,
  dateKey,
  orders = [],
  settledTransactions = [],
  unsettledTransactions = [],
  adSpend = [],
  syncedAt = new Date().toISOString()
} = {}) {
  if (!connection?.storeId || !connection?.shopCipher) {
    return { status: "unconfigured", collections: {}, diagnostics: { reason: "shop_not_authorized" } };
  }

  const collections = emptyCollections();
  const listings = (state.profitListings || []).filter((listing) => listing.storeId === connection.storeId);
  const listingsByPlatformId = new Map(listings.map((listing) => [String(listing.platformListingId || ""), listing]));
  const factTotals = new Map();
  const listingTotals = new Map();
  const orderMatches = new Map();
  let unmatchedOrderCount = 0;

  orders.forEach((order) => {
    const orderId = String(order?.id ?? order?.order_id ?? order?.orderId ?? "");
    const matches = [];
    orderLines(order).forEach((line) => {
      const platformListingId = String(line?.product_id ?? line?.productId ?? "");
      const listing = listingsByPlatformId.get(platformListingId);
      const listingSku = listing ? findListingSku(state, listing, line) : null;
      if (!listing || !listingSku) return;
      const gmv = lineGmv(line);
      const units = lineQuantity(line);
      const key = listingSku.id;
      if (!factTotals.has(key)) {
        factTotals.set(key, {
          listing,
          listingSku,
          gmv: 0,
          itemsSold: 0,
          orderIds: new Set(),
          financeOrderIds: new Set(),
          settledOrderIds: new Set(),
          netProductSales: 0,
          shippingFee: 0,
          platformFees: 0,
          estimatedReceived: 0,
          actualReceived: 0
        });
      }
      if (!listingTotals.has(listing.id)) {
        listingTotals.set(listing.id, {
          listing,
          gmv: 0,
          itemsSold: 0,
          orderIds: new Set(),
          financeOrderIds: new Set(),
          settledOrderIds: new Set(),
          netProductSales: 0,
          shippingFee: 0,
          platformFees: 0,
          estimatedReceived: 0,
          actualReceived: 0
        });
      }
      const fact = factTotals.get(key);
      fact.gmv += gmv;
      fact.itemsSold += units;
      fact.orderIds.add(orderId);
      const listingTotal = listingTotals.get(listing.id);
      listingTotal.gmv += gmv;
      listingTotal.itemsSold += units;
      listingTotal.orderIds.add(orderId);
      matches.push({ listing, listingSku, gmv, platformSkuId: String(line?.sku_id ?? line?.skuId ?? ""), sellerSku: String(line?.seller_sku ?? line?.sellerSku ?? "") });
    });
    if (matches.length) {
      const grouped = new Map();
      matches.forEach((item) => {
        const group = grouped.get(item.listing.id) || { orderId, listing: item.listing, lines: [] };
        group.lines.push(item);
        grouped.set(item.listing.id, group);
      });
      orderMatches.set(orderId, [...grouped.values()]);
    } else if (orderLines(order).length) unmatchedOrderCount += 1;
  });

  const settledByOrder = new Map(settledTransactions.map((row) => [transactionOrderId(row), row]));
  const unsettledByOrder = new Map(unsettledTransactions.map((row) => [transactionOrderId(row), row]));
  orderMatches.forEach((groups, orderId) => {
    const settled = settledByOrder.get(orderId);
    const unsettled = settled ? null : unsettledByOrder.get(orderId);
    groups.forEach((group) => allocateFinance(group, settled || unsettled, factTotals, listingTotals, Boolean(settled)));
  });

  factTotals.forEach((total) => {
    const financeKnown = total.financeOrderIds.size > 0;
    const commissionRate = Math.max(0, finiteNumber(total.listingSku.commissionRateOverride));
    const estimatedPlatformFees = financeKnown ? money(total.platformFees) : money(total.gmv * commissionRate / 100);
    const estimatedReceived = financeKnown ? money(total.estimatedReceived) : money(total.gmv - estimatedPlatformFees);
    const actualReceived = total.settledOrderIds.size > 0 ? money(total.actualReceived) : null;
    collections.profitDailyFacts.upserts.push({
      id: `${total.listingSku.id}-${dateKey}`,
      listingId: total.listing.id,
      listingSkuId: total.listingSku.id,
      dateKey,
      price: total.itemsSold ? money(total.gmv / total.itemsSold) : null,
      units: total.itemsSold,
      gmv: money(total.gmv),
      itemsSold: total.itemsSold,
      orderCount: total.orderIds.size,
      grossSales: financeKnown ? money(total.netProductSales) : null,
      estimatedShippingFee: money(total.shippingFee),
      estimatedPlatformFees,
      estimatedReceived,
      actualReceived,
      shippingFee: money(total.shippingFee),
      platformFees: money(total.platformFees),
      productCostSnapshot: currentCost(state, total.listingSku),
      costSnapshot: currentCost(state, total.listingSku),
      commissionSnapshot: total.listingSku.commissionRateOverride ?? null,
      entryStatus: "completed",
      source: "TikTok Shop Open API",
      sourceUpdatedAt: syncedAt
    });
  });

  listingTotals.forEach((total) => {
    const fullySettled = total.orderIds.size > 0 && total.settledOrderIds.size === total.orderIds.size;
    const financeKnown = total.financeOrderIds.size > 0;
    const estimatedReceived = financeKnown ? money(total.estimatedReceived) : null;
    collections.profitDailySettlements.upserts.push({
      id: `${total.listing.id}-settlement-${dateKey}`,
      listingId: total.listing.id,
      dateKey,
      listingGmv: money(total.gmv),
      sumSkuGmv: money(total.gmv),
      orderCount: total.orderIds.size,
      itemsSold: total.itemsSold,
      netProductSales: financeKnown ? money(total.netProductSales) : money(total.gmv),
      platformDiscounts: 0,
      shippingFee: money(total.shippingFee),
      platformFees: money(total.platformFees),
      totalOrderCost: money(total.shippingFee + total.platformFees),
      estimatedReceived,
      settlementAmount: fullySettled ? money(total.actualReceived) : null,
      settlementStatus: fullySettled ? "settled" : "estimated",
      statementDate: dateKey,
      source: fullySettled ? "TikTok Shop Finance API v202501" : "TikTok Shop Finance API v202507",
      sourceUpdatedAt: syncedAt
    });
  });

  const existingExpenses = new Map((state.profitDailyExpenses || []).map((expense) => [`${expense.listingId}|${expense.dateKey}`, expense]));
  adSpend.forEach((row) => {
    if (row?.dateKey && row.dateKey !== dateKey) return;
    const listingId = adListingId(state, connection, row);
    const listing = listings.find((item) => item.id === listingId);
    if (!listing) return;
    const existing = existingExpenses.get(`${listingId}|${dateKey}`) || {
      id: `${listingId}-expense-${dateKey}`,
      listingId,
      dateKey,
      sampleQuantities: {},
      advertisingSpend: null,
      marketingSpend: null,
      adjustments: null,
      entryStatus: "pending"
    };
    const amount = money(Math.max(0, finiteNumber(row.amount ?? row.spend ?? row.billed_cost)));
    const expense = {
      ...existing,
      advertisingSpend: amount,
      marketingSpend: amount,
      source: "TikTok Marketing API",
      sourceUpdatedAt: syncedAt
    };
    expense.entryStatus = expenseComplete(listing, expense) ? "completed" : existing.entryStatus;
    collections.profitDailyExpenses.upserts.push(expense);
  });

  const matchedOrderCount = new Set([...orderMatches.keys()]).size;
  const partial = unmatchedOrderCount > 0 || [...listingTotals.values()].some((total) => total.financeOrderIds.size < total.orderIds.size);
  collections.profitSyncRecords.upserts.push({
    id: "main",
    state: partial ? "partial" : "synced",
    lastSyncedAt: syncedAt,
    nextScheduledAt: new Date(Date.parse(syncedAt) + 24 * 60 * 60 * 1000).toISOString(),
    scheduleTimezone: "Asia/Shanghai",
    storeTimezone: connection.storeTimezone || "America/Los_Angeles",
    source: "TikTok Shop Open API · TikTok Marketing API",
    message: partial
      ? `${dateKey} 已同步，${unmatchedOrderCount} 个订单待建立链接映射`
      : `${dateKey} 订单、结算与广告数据已自动同步`
  });

  return {
    status: partial ? "partial" : "synced",
    collections,
    diagnostics: {
      matchedOrderCount,
      unmatchedOrderCount,
      matchedSkuFactCount: factTotals.size,
      settlementCount: collections.profitDailySettlements.upserts.length,
      adSpendCount: collections.profitDailyExpenses.upserts.length
    }
  };
}
