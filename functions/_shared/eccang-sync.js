import { createProfitSyncPatch, defaultProfitSyncDate } from "./profit-sync.js";

const ECCANG_DEFAULT_ENDPOINT = "https://openapi-web.eccang.com/openApi/api/unity";
const ECCANG_AES_IV = "1234500000054321";
const ECCANG_SOURCE = "E仓 Open API";

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function money(value) {
  return Math.round((finiteNumber(value) + Number.EPSILON) * 100) / 100;
}

function decodeBase64(bytes) {
  let binary = "";
  const view = new Uint8Array(bytes);
  for (let index = 0; index < view.length; index += 1) binary += String.fromCharCode(view[index]);
  return btoa(binary);
}

function parseJsonObject(value, fallback = {}) {
  if (value && typeof value === "object") return value;
  try {
    const parsed = JSON.parse(String(value || ""));
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function eccangError(message, details = {}) {
  const error = new Error(String(message || "E仓接口请求失败").slice(0, 200));
  error.code = "ECCANG_API_ERROR";
  error.retryable = Boolean(details.retryable);
  error.providerCode = String(details.providerCode || "").slice(0, 80);
  return error;
}

export function canonicalEccangSignInput(params = {}) {
  return Object.entries(params)
    .filter(([key, value]) => key !== "sign" && value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("&");
}

export async function signEccangRequest({ appSecret, params } = {}) {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(String(appSecret || ""));
  if (![16, 24, 32].includes(secretBytes.byteLength)) {
    throw eccangError("E仓应用密钥长度无效");
  }
  const key = await crypto.subtle.importKey("raw", secretBytes, { name: "AES-CBC" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-CBC",
    iv: encoder.encode(ECCANG_AES_IV)
  }, key, encoder.encode(canonicalEccangSignInput(params)));
  return decodeBase64(encrypted);
}

function responseRows(content) {
  if (Array.isArray(content)) return content;
  if (Array.isArray(content?.data)) return content.data;
  if (Array.isArray(content?.data?.data)) return content.data.data;
  if (Array.isArray(content?.records)) return content.records;
  if (Array.isArray(content?.page?.records)) return content.page.records;
  return [];
}

function responseTotal(content, rows) {
  return Math.max(0, finiteNumber(
    content?.total
      ?? content?.total_count
      ?? content?.data?.total
      ?? content?.data?.total_count
      ?? content?.page?.total,
    rows.length
  ));
}

export function createEccangClient({
  appKey,
  appSecret,
  serviceId,
  endpoint = ECCANG_DEFAULT_ENDPOINT,
  pageSize = 100,
  fetchImpl = fetch,
  now = () => Date.now(),
  createNonce = () => crypto.randomUUID().replaceAll("-", "").slice(0, 16)
} = {}) {
  if (!appKey || !appSecret || !serviceId) throw eccangError("E仓应用配置不完整");
  let apiUrl;
  try {
    apiUrl = new URL(endpoint);
  } catch {
    throw eccangError("E仓 API 地址无效");
  }
  if (apiUrl.protocol !== "https:") throw eccangError("E仓 API 必须使用 HTTPS");
  if (apiUrl.hostname !== "eccang.com" && !apiUrl.hostname.endsWith(".eccang.com")) {
    throw eccangError("E仓 API 必须使用官方域名");
  }

  async function request(interfaceMethod, bizContent, { version = "V1.0.0" } = {}) {
    const params = {
      app_key: String(appKey),
      biz_content: JSON.stringify(bizContent || {}),
      charset: "UTF-8",
      interface_method: String(interfaceMethod),
      nonce_str: String(createNonce()),
      service_id: String(serviceId),
      sign_type: "AES",
      timestamp: String(now()),
      version: String(version)
    };
    params.sign = await signEccangRequest({ appSecret, params });
    let response;
    try {
      response = await fetchImpl(new Request(apiUrl, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(params)
      }));
    } catch {
      throw eccangError("E仓网络请求失败", { retryable: true });
    }
    let payload;
    try {
      payload = await response.json();
    } catch {
      throw eccangError(`E仓返回无效响应（HTTP ${response.status}）`, { retryable: response.status >= 500 });
    }
    if (!response.ok || String(payload?.code) !== "200") {
      const providerError = Array.isArray(payload?.error) ? payload.error[0] : null;
      throw eccangError(payload?.message || providerError?.error_msg || `HTTP ${response.status}`, {
        providerCode: providerError?.error_code || payload?.code,
        retryable: response.status === 429 || response.status >= 500
      });
    }
    return parseJsonObject(payload.biz_content, {});
  }

  async function listOrders({ startDateTime, endDateTime, userAccounts = [] } = {}) {
    const all = [];
    const safePageSize = Math.min(100, Math.max(1, Math.round(finiteNumber(pageSize, 100))));
    for (let page = 1; page <= 1000; page += 1) {
      const condition = {
        platform_paid_date_start: String(startDateTime || ""),
        platform_paid_date_end: String(endDateTime || "")
      };
      if (userAccounts.length) condition.user_account_list = [...new Set(userAccounts.map(String).filter(Boolean))];
      const content = await request("getOrderList", {
        page,
        page_size: safePageSize,
        get_detail: 1,
        condition
      });
      const rows = responseRows(content);
      all.push(...rows);
      if (!rows.length || all.length >= responseTotal(content, rows) || rows.length < safePageSize) break;
    }
    return all;
  }

  return { listOrders };
}

function listValue(value) {
  if (Array.isArray(value)) return value;
  const parsed = parseJsonObject(value, null);
  if (Array.isArray(parsed)) return parsed;
  return [];
}

function orderDetails(order) {
  return listValue(order?.order_details ?? order?.orderDetails ?? order?.details);
}

function listingIdFromLine(line) {
  const explicit = String(line?.product_id ?? line?.productId ?? line?.op_ref_item_id ?? "").trim();
  if (explicit) return explicit;
  const url = String(line?.product_url ?? line?.productUrl ?? "");
  const match = url.match(/(?:product|item)[^0-9]*([0-9]{6,})/i) || url.match(/([0-9]{8,})/);
  return match?.[1] || "";
}

function lineSkuValues(line) {
  return [...new Set([
    line?.platform_sku,
    line?.platformSku,
    line?.product_sku_org,
    line?.seller_sku,
    line?.sellerSku,
    line?.product_sku_list
  ].map((value) => String(value || "").trim()).filter(Boolean))];
}

function buildStoreIndex(state, storeId) {
  const listings = (state.profitListings || []).filter((listing) => listing.storeId === storeId);
  const listingById = new Map(listings.map((listing) => [String(listing.platformListingId || ""), listing]));
  const masters = new Map((state.profitSkuMasters || []).map((sku) => [sku.id, sku]));
  const candidates = (state.profitListingSkus || []).flatMap((listingSku) => {
    const listing = listings.find((item) => item.id === listingSku.listingId);
    if (!listing) return [];
    const master = masters.get(listingSku.skuId);
    const values = [
      listingSku.platformSkuId,
      listingSku.sellerSku,
      master?.platformSkuId,
      master?.sellerSku,
      master?.code
    ]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    return [{ listing, listingSku, values }];
  });
  return { listings, listingById, candidates };
}

function emptyTrackedCollections() {
  return {
    profitStores: { upserts: [], deletes: [] },
    profitProducts: { upserts: [], deletes: [] },
    profitSkuMasters: { upserts: [], deletes: [] },
    profitListings: { upserts: [], deletes: [] },
    profitListingSkus: { upserts: [], deletes: [] },
    profitProductCostHistory: { upserts: [], deletes: [] }
  };
}

function pushTrackedRecord(state, collections, collectionName, record) {
  const records = state[collectionName] || (state[collectionName] = []);
  records.push(record);
  collections[collectionName].upserts.push(record);
}

function trackedText(value) {
  return String(value || "").trim();
}

export function prepareEccangTrackedListings({
  state = {},
  connection,
  trackedListings = []
} = {}) {
  const prepared = {
    ...state,
    profitStores: [...(state.profitStores || [])],
    profitProducts: [...(state.profitProducts || [])],
    profitSkuMasters: [...(state.profitSkuMasters || [])],
    profitListings: [...(state.profitListings || [])],
    profitListingSkus: [...(state.profitListingSkus || [])],
    profitProductCostHistory: [...(state.profitProductCostHistory || [])]
  };
  const collections = emptyTrackedCollections();
  const diagnostics = {
    provisionedListingCount: 0,
    provisionedSkuCount: 0,
    skippedTrackedListings: [],
    skippedTrackedSkus: []
  };
  const storeId = trackedText(connection?.storeId);
  const connectionId = trackedText(connection?.id);
  let storeExists = prepared.profitStores.some((store) => trackedText(store?.id) === storeId);
  const scopedListings = (Array.isArray(trackedListings) ? trackedListings : []).filter((listing) => (
    trackedText(listing?.connectionId) === connectionId
  ));

  for (const tracked of scopedListings) {
    const trackedId = trackedText(tracked?.id);
    const productId = trackedText(tracked?.productId);
    const platformListingId = trackedText(tracked?.platformListingId);
    if (!storeExists) {
      const storeName = trackedText(tracked?.storeName);
      const storeByName = prepared.profitStores.find((store) => trackedText(store?.name) === storeName);
      if (storeByName && trackedText(storeByName.id) !== storeId) {
        diagnostics.skippedTrackedListings.push({ id: trackedId || platformListingId || "unknown", reason: "store_name_conflict" });
        continue;
      }
      if (storeName) {
        pushTrackedRecord(prepared, collections, "profitStores", {
          id: storeId,
          name: storeName,
          accountName: trackedText(tracked?.storeAccountName),
          status: "active"
        });
        storeExists = true;
      }
    }
    if (!storeExists || !trackedId || !productId || !platformListingId || !Array.isArray(tracked?.skus)) {
      diagnostics.skippedTrackedListings.push({
        id: trackedId || platformListingId || "unknown",
        reason: storeExists ? "invalid_manifest" : "store_not_found"
      });
      continue;
    }

    const listingById = prepared.profitListings.find((listing) => trackedText(listing?.id) === trackedId);
    const listingByPlatformId = prepared.profitListings.find((listing) => (
      trackedText(listing?.storeId) === storeId
      && trackedText(listing?.platformListingId) === platformListingId
    ));
    if (listingById && (
      trackedText(listingById.storeId) !== storeId
      || trackedText(listingById.platformListingId) !== platformListingId
    )) {
      diagnostics.skippedTrackedListings.push({ id: trackedId, reason: "listing_id_conflict" });
      continue;
    }
    if (listingById && listingByPlatformId && listingById.id !== listingByPlatformId.id) {
      diagnostics.skippedTrackedListings.push({ id: trackedId, reason: "platform_listing_conflict" });
      continue;
    }

    let product = prepared.profitProducts.find((item) => trackedText(item?.id) === productId);
    const listing = listingById || listingByPlatformId;
    if (listing && trackedText(listing.productId) !== productId) {
      diagnostics.skippedTrackedListings.push({ id: trackedId, reason: "product_mapping_conflict" });
      continue;
    }
    if (!product) {
      product = {
        id: productId,
        code: trackedText(tracked?.productCode),
        name: trackedText(tracked?.productName),
        category: trackedText(tracked?.category || "寝具"),
        standardUnitCost: money(tracked?.standardUnitCost),
        costEffectiveAt: trackedText(tracked?.costEffectiveAt),
        status: "active"
      };
      if (!product.code || !product.name) {
        diagnostics.skippedTrackedListings.push({ id: trackedId, reason: "invalid_product" });
        continue;
      }
      pushTrackedRecord(prepared, collections, "profitProducts", product);
      if (product.costEffectiveAt) {
        pushTrackedRecord(prepared, collections, "profitProductCostHistory", {
          id: `${productId}-cost-${product.costEffectiveAt}`,
          productId,
          standardUnitCost: product.standardUnitCost,
          effectiveAt: product.costEffectiveAt
        });
      }
    }

    let resolvedListing = listing;
    if (!resolvedListing) {
      resolvedListing = {
        id: trackedId,
        productId,
        storeId,
        platformListingId,
        url: trackedText(tracked?.url),
        displayName: trackedText(tracked?.displayName || tracked?.productName),
        currency: trackedText(tracked?.currency || "USD"),
        timezone: trackedText(tracked?.timezone || connection?.storeTimezone || "America/Los_Angeles"),
        lifecycleStatus: "active",
        launchedAt: trackedText(tracked?.launchedAt),
        delistedAt: null,
        sampleTypes: Array.isArray(tracked?.sampleTypes) ? tracked.sampleTypes : []
      };
      pushTrackedRecord(prepared, collections, "profitListings", resolvedListing);
      diagnostics.provisionedListingCount += 1;
    }

    for (const sku of tracked.skus) {
      const skuId = trackedText(sku?.skuId);
      const listingSkuId = trackedText(sku?.listingSkuId);
      const sellerSku = trackedText(sku?.sellerSku);
      const platformSkuId = trackedText(sku?.platformSkuId);
      if (!skuId || !listingSkuId || !sellerSku) continue;
      let master = prepared.profitSkuMasters.find((item) => trackedText(item?.id) === skuId);
      if (master && (
        trackedText(master.productId) !== productId
        || ![trackedText(master.sellerSku), trackedText(master.code)].filter(Boolean).some((value) => value.toLowerCase() === sellerSku.toLowerCase())
      )) {
        diagnostics.skippedTrackedSkus.push({ id: listingSkuId, reason: "sku_master_conflict" });
        continue;
      }
      if (!master) {
        master = {
          id: skuId,
          productId,
          code: sellerSku,
          sellerSku,
          name: trackedText(sku?.name || sellerSku),
          specification: trackedText(sku?.specification || sku?.name),
          platformSkuId,
          standardCost: money(sku?.standardCost ?? product.standardUnitCost),
          currency: trackedText(tracked?.currency || "USD"),
          status: sku?.active === false ? "inactive" : "active"
        };
        pushTrackedRecord(prepared, collections, "profitSkuMasters", master);
      }
      const listingSkuById = prepared.profitListingSkus.find((item) => trackedText(item?.id) === listingSkuId);
      if (listingSkuById && (
        trackedText(listingSkuById.listingId) !== resolvedListing.id
        || trackedText(listingSkuById.skuId) !== skuId
      )) {
        diagnostics.skippedTrackedSkus.push({ id: listingSkuId, reason: "listing_sku_id_conflict" });
        continue;
      }
      const existingListingSku = listingSkuById || prepared.profitListingSkus.find((item) => (
        trackedText(item?.listingId) === resolvedListing.id
        && sellerSku.toLowerCase() === trackedText(item?.sellerSku).toLowerCase()
      ));
      if (existingListingSku) continue;
      pushTrackedRecord(prepared, collections, "profitListingSkus", {
        id: listingSkuId,
        listingId: resolvedListing.id,
        skuId,
        platformSkuId,
        sellerSku,
        active: sku?.active !== false,
        storeCostOverride: money(sku?.standardCost ?? product.standardUnitCost),
        commissionRateOverride: sku?.commissionRateOverride ?? null,
        activatedAt: trackedText(tracked?.launchedAt),
        deactivatedAt: null
      });
      diagnostics.provisionedSkuCount += 1;
    }
  }
  return { state: prepared, collections, diagnostics };
}

function matchLine(index, line) {
  const platformListingId = listingIdFromLine(line);
  const directListing = index.listingById.get(platformListingId);
  const skuValues = lineSkuValues(line).map((value) => value.toLowerCase());
  const matches = index.candidates.filter((candidate) => (
    (!directListing || candidate.listing.id === directListing.id)
      && skuValues.some((value) => candidate.values.includes(value))
  ));
  if (matches.length === 1) return matches[0];
  if (directListing) {
    const listingCandidates = index.candidates.filter((candidate) => candidate.listing.id === directListing.id);
    if (listingCandidates.length === 1) return listingCandidates[0];
  }
  return null;
}

function orderCode(order) {
  return String(order?.order_code ?? order?.orderCode ?? order?.reference_no ?? order?.order_id ?? order?.id ?? "");
}

function relabelEccangPatch(patch, dateKey) {
  const unmatchedOrderCount = Number(patch.diagnostics?.unmatchedOrderCount || 0);
  const salesStatus = unmatchedOrderCount > 0 ? "partial" : "synced";
  patch.status = salesStatus;
  if (patch.diagnostics) {
    patch.diagnostics.salesSummaryCount = patch.diagnostics.settlementCount || 0;
    patch.diagnostics.settlementCount = 0;
  }
  (patch.collections?.profitDailyFacts?.upserts || []).forEach((record) => {
    record.source = ECCANG_SOURCE;
  });
  (patch.collections?.profitDailySettlements?.upserts || []).forEach((record) => {
    record.source = ECCANG_SOURCE;
  });
  (patch.collections?.profitSyncRecords?.upserts || []).forEach((record) => {
    record.state = salesStatus;
    record.source = ECCANG_SOURCE;
    record.message = unmatchedOrderCount
      ? `${dateKey} E仓 TikTok 销售订单已同步，${unmatchedOrderCount} 个订单待建立链接映射`
      : `${dateKey} E仓 TikTok 销售订单已同步`;
  });
  return patch;
}

export function createEccangProfitSyncPatch({
  state = {},
  connection,
  dateKey,
  orders = [],
  syncedAt = new Date().toISOString()
} = {}) {
  if (!connection?.storeId || !connection?.userAccount) {
    return { status: "unconfigured", collections: {}, diagnostics: { reason: "eccang_store_not_mapped" } };
  }
  const account = String(connection.userAccount).trim().toLowerCase();
  const storeOrders = orders.filter((order) => String(order?.user_account ?? order?.userAccount ?? "").trim().toLowerCase() === account);
  const index = buildStoreIndex(state, connection.storeId);
  const normalizedOrders = storeOrders.map((order) => {
    const lines = orderDetails(order).map((line) => {
      const match = matchLine(index, line);
      const quantity = Math.max(0, Math.round(finiteNumber(line?.qty ?? line?.quantity ?? line?.product_sku_org_qty, 1)));
      const unitPrice = money(line?.unit_price ?? line?.original_unit_price ?? line?.item_price);
      return {
        product_id: match?.listing?.platformListingId || listingIdFromLine(line) || "eccang-unmapped",
        sku_id: match?.listingSku?.platformSkuId || line?.platform_sku || "eccang-unmapped",
        seller_sku: line?.product_sku_org || line?.platform_sku || line?.product_sku_list || "",
        quantity,
        sale_price: unitPrice,
        total_price: money(unitPrice * quantity)
      };
    });
    return { id: orderCode(order), line_items: lines };
  });
  const patch = createProfitSyncPatch({
    state,
    connection: {
      ...connection,
      shopCipher: "eccang-server-side-source",
      storeTimezone: connection.storeTimezone || "America/Los_Angeles"
    },
    dateKey,
    orders: normalizedOrders,
    settledTransactions: [],
    unsettledTransactions: [],
    adSpend: [],
    syncedAt
  });
  return relabelEccangPatch(patch, dateKey);
}

function dateTimeRange(dateKey) {
  return {
    startDateTime: `${dateKey} 00:00:00`,
    endDateTime: `${dateKey} 23:59:59`
  };
}

export async function runEccangAutomaticSync({
  state = {},
  connections = [],
  trackedListings = [],
  dateKey,
  syncedAt = new Date().toISOString(),
  client,
  now = () => new Date()
} = {}) {
  const active = connections.filter((connection) => connection?.status !== "disabled" && connection?.storeId && connection?.userAccount);
  if (!active.length || !client) return { status: "unconfigured", collections: {}, failures: [], diagnostics: [] };
  const syncDate = dateKey || defaultProfitSyncDate(now(), active[0].storeTimezone || "America/Los_Angeles");
  const orders = await client.listOrders({
    ...dateTimeRange(syncDate),
    userAccounts: active.map((connection) => connection.userAccount)
  });
  const collections = {};
  const diagnostics = [];
  let partial = false;
  for (const connection of active) {
    const prepared = prepareEccangTrackedListings({ state, connection, trackedListings });
    const patch = createEccangProfitSyncPatch({ state: prepared.state, connection, dateKey: syncDate, orders, syncedAt });
    Object.entries({ ...prepared.collections, ...(patch.collections || {}) }).forEach(([name, operations]) => {
      if (!collections[name]) collections[name] = { upserts: [], deletes: [] };
      const byId = new Map(collections[name].upserts.map((record) => [String(record.id), record]));
      (operations.upserts || []).forEach((record) => byId.set(String(record.id), record));
      collections[name].upserts = [...byId.values()];
      collections[name].deletes = [...new Set([...(collections[name].deletes || []), ...(operations.deletes || [])])];
    });
    diagnostics.push({ connectionId: connection.id, ...prepared.diagnostics, ...patch.diagnostics });
    if (patch.status !== "synced") partial = true;
  }
  collections.profitSyncRecords = {
    upserts: [{
      id: "main",
      state: partial ? "partial" : "synced",
      lastSyncedAt: syncedAt,
      nextScheduledAt: new Date(Date.parse(syncedAt) + 24 * 60 * 60 * 1000).toISOString(),
      scheduleTimezone: "Asia/Shanghai",
      storeTimezone: "America/Los_Angeles",
      source: ECCANG_SOURCE,
      message: `${active.length} 家店铺的 E仓订单数据已同步`
    }],
    deletes: []
  };
  return { status: partial ? "partial" : "synced", collections, failures: [], diagnostics };
}

export { ECCANG_DEFAULT_ENDPOINT, ECCANG_SOURCE };
