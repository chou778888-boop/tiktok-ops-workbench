import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { applyPatch, normalizeData, normalizePatch } from "../functions/api/state.js";

const profitCollections = [
  "profitStores",
  "profitProducts",
  "profitSkuMasters",
  "profitListings",
  "profitListingSkus",
  "profitDailyFacts",
  "profitDailyExpenses",
  "profitDailySettlements",
  "profitProductCostHistory",
  "profitSyncRecords",
  "profitPriceObservations"
];

const cloudProduct = {
  id: "product-cloud",
  code: "CLOUD",
  name: "云端产品",
  standardUnitCost: 8,
  status: "active"
};
const normalizedCloud = normalizeData({ profitProducts: [cloudProduct] });
assert.deepEqual(normalizedCloud.profitProducts, [cloudProduct], "云端标准化不得丢失利润产品");
profitCollections.forEach((name) => assert.ok(Array.isArray(normalizedCloud[name]), `${name} 必须始终标准化为数组`));

const cloudPatch = normalizePatch({
  patch: {
    collections: {
      profitProducts: { upserts: [cloudProduct], deletes: [] },
      profitListings: {
        upserts: [{ id: "listing-cloud", productId: cloudProduct.id, lifecycleStatus: "active" }],
        deletes: []
      }
    }
  }
});
const patchedCloud = applyPatch(null, cloudPatch);
assert.equal(patchedCloud.profitProducts[0].id, cloudProduct.id, "利润产品必须支持云端增量写入");
assert.equal(patchedCloud.profitListings[0].lifecycleStatus, "active", "链接生命周期必须支持云端增量写入");

const [runtimeSource, domainSource, repositorySource] = await Promise.all([
  readFile("src/app/workbench/00-runtime.js", "utf8"),
  readFile("src/app/workbench/61-profit-domain.js", "utf8"),
  readFile("src/app/workbench/62-profit-repository.js", "utf8")
]);

const runtimeStart = runtimeSource.indexOf("const defaultData =");
const runtimeEnd = runtimeSource.indexOf("function taskStatusRank", runtimeStart);
assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart, "必须能载入客户端状态与增量同步逻辑");
const runtimeContext = vm.createContext({
  localStorage: { getItem: () => null, setItem() {} },
  storeKey: "test",
  today: "2026-08-07",
  structuredClone,
  scheduleCloudSave() {}
});
vm.runInContext(`${runtimeSource.slice(runtimeStart, runtimeEnd)}\nthis.runtimeApi = { normalizeState, buildCloudPatch };`, runtimeContext);
const localNormalized = runtimeContext.runtimeApi.normalizeState({ profitProducts: [cloudProduct] });
assert.deepEqual(JSON.parse(JSON.stringify(localNormalized.profitProducts)), [cloudProduct], "客户端标准化不得丢失利润产品");
const localPatch = runtimeContext.runtimeApi.buildCloudPatch(
  runtimeContext.runtimeApi.normalizeState(null),
  localNormalized
);
assert.deepEqual(
  JSON.parse(JSON.stringify(localPatch.collections.profitProducts.upserts)),
  [cloudProduct],
  "客户端必须为利润产品生成增量补丁"
);

let id = 0;
const repositoryContext = vm.createContext({
  URL,
  console,
  crypto: { randomUUID: () => `persist-id-${id += 1}` }
});
vm.runInContext(`${domainSource}\n${repositorySource}`, repositoryContext, { filename: "profit-persistence-bundle.js" });
const repositoryApi = vm.runInContext(`({ createProfitRepository, serializeProfitRepositoryState })`, repositoryContext);

const persistedWorkspace = {
  profitStores: [{ id: "store-1", name: "DreamWeave" }],
  profitProducts: [{ id: "product-1", code: "JZZ", name: "颈椎枕", standardUnitCost: 12, status: "active" }],
  profitSkuMasters: [{ id: "sku-1", productId: "product-1", code: "JZZ-GREY", name: "灰色", standardCost: 12, status: "active" }],
  profitListings: [{ id: "listing-1", productId: "product-1", storeId: "store-1", displayName: "JZZ 主链接", lifecycleStatus: "active", sampleTypes: [] }],
  profitListingSkus: [{ id: "listing-sku-1", listingId: "listing-1", skuId: "sku-1", active: true }],
  profitDailyFacts: [{ id: "fact-1", listingId: "listing-1", listingSkuId: "listing-sku-1", dateKey: "2026-08-06", gmv: 18, itemsSold: 1, productCostSnapshot: 12 }],
  profitDailyExpenses: [],
  profitDailySettlements: [],
  profitProductCostHistory: [],
  profitSyncRecords: [{ id: "main", state: "synced", lastSyncedAt: "2026-08-06T17:00:00+08:00", nextScheduledAt: "2026-08-07T17:00:00+08:00", scheduleTimezone: "Asia/Shanghai", storeTimezone: "America/Los_Angeles", source: "TikTok Shop", message: "已同步" }],
  profitPriceObservations: []
};
const savedSnapshots = [];
const repository = repositoryApi.createProfitRepository("2026-08-07", {
  initialState: persistedWorkspace,
  seedDemo: false,
  onChange: (snapshot) => savedSnapshots.push(JSON.parse(JSON.stringify(snapshot)))
});
assert.equal(repository.getState().products.length, 1, "已有云端利润数据时不得重新注入演示产品");
assert.equal(repository.getState().products[0].id, "product-1");

repository.setListingLifecycle("listing-1", "delisted", "2026-08-07");
assert.equal(savedSnapshots.at(-1).profitListings[0].lifecycleStatus, "delisted", "链接下架必须立即进入持久化快照");
assert.equal(savedSnapshots.at(-1).profitListings[0].delistedAt, "2026-08-07");

repository.updateDailyFact("listing-sku-1", "2026-08-07", { price: 19, units: 2 });
const persistedFact = savedSnapshots.at(-1).profitDailyFacts.find((item) => item.dateKey === "2026-08-07");
assert.equal(persistedFact.gmv, 38, "SKU 当日成交均价和销量必须持久化为 GMV");
assert.equal(persistedFact.itemsSold, 2);

repository.updateProductCost("product-1", 12.5, "2026-08-07");
const costHistory = savedSnapshots.at(-1).profitProductCostHistory;
assert.equal(costHistory.length, 1, "统一产品成本变更必须保留生效历史");
assert.ok(costHistory[0].id, "产品成本历史必须有稳定主键以支持增量同步");

const serialized = repositoryApi.serializeProfitRepositoryState(repository.getState());
const rehydrated = repositoryApi.createProfitRepository("2026-08-07", { initialState: serialized, seedDemo: false });
assert.equal(rehydrated.getListing("listing-1").lifecycleStatus, "delisted", "刷新后必须恢复链接生命周期");
assert.equal(rehydrated.getDailyFact("listing-sku-1", "2026-08-07").gmv, 38, "刷新后必须恢复 SKU 当日经营数据");

const legacyCloudSnapshots = [];
const legacyMigrationRepository = repositoryApi.createProfitRepository("2026-08-03", {
  onChange: (snapshot) => legacyCloudSnapshots.push(JSON.parse(JSON.stringify(snapshot)))
});
legacyMigrationRepository.hydrate({ profitProducts: [], profitSyncRecords: [] });
assert.equal(legacyMigrationRepository.getState().products.length, 1, "旧云端尚未初始化利润集合时必须保留已核对的迁移样本");
assert.equal(legacyCloudSnapshots.at(-1).profitSyncRecords[0].id, "main", "首次迁移必须写入初始化标记，避免后续误判");

console.log(JSON.stringify({ passed: 19, phase: "profit-cloud-persistence" }));
