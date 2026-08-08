import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const [html, manifest, domainSource, repositorySource, selectorSource, uiSource] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("scripts/app-sources.mjs", "utf8"),
  readFile("src/app/workbench/61-profit-domain.js", "utf8"),
  readFile("src/app/workbench/62-profit-repository.js", "utf8"),
  readFile("src/app/workbench/63-profit-selectors.js", "utf8"),
  readFile("src/app/workbench/65-profit-template.js", "utf8")
]);

assert.match(html, /data-view="costing"[^>]*>利润与成本</, "主导航必须使用利润与成本");
assert.match(html, /cost-subtab active[^>]*data-cost-pane="profit-template"[^>]*>链接利润/, "利润与成本必须默认进入链接利润");
for (const id of ["profitTemplateRoot", "profitLinkDialog", "profitLinkForm", "profitSkuDialog", "profitSkuForm", "profitObservationDialog"]) {
  assert.match(html, new RegExp(`id="${id}"`), `利润工作台缺少 #${id}`);
}
assert.match(html, /name="productId"/, "新增链接必须先选择产品");
assert.match(html, /name="storeId"/, "新增链接必须选择店铺");
assert.match(html, /name="predecessorListingId"/, "新链接必须可关联承接旧链接");
assert.match(html, /name="skuId"/, "新增链接 SKU 必须关联公共 SKU");
assert.doesNotMatch(html, /name="commissionRate"/, "平台佣金必须来自结算，不得要求团队手填比例");
assert.doesNotMatch(html, /name="cost"/, "产品成本必须在产品主档统一维护，不得在链接 SKU 重复填写");
assert.match(html, /计划调价/, "价格变化必须可标记为计划调价");
assert.match(html, /数据修正/, "价格变化必须可标记为数据修正");

for (const file of ["61-profit-domain.js", "62-profit-repository.js", "63-profit-selectors.js", "65-profit-template.js"]) {
  assert.match(manifest, new RegExp(file.replaceAll(".", "\\.")), `${file} 必须进入生产构建清单`);
}
assert.ok(manifest.indexOf("61-profit-domain.js") < manifest.indexOf("65-profit-template.js"), "领域模块必须先于页面控制器载入");
assert.doesNotMatch(`${domainSource}\n${repositorySource}\n${selectorSource}\n${uiSource}`, /\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(/, "演示利润工作台不得读写存储或网络");

let id = 0;
const context = vm.createContext({
  URL,
  console,
  crypto: { randomUUID: () => `test-id-${id += 1}` }
});
vm.runInContext(`${domainSource}\n${repositorySource}\n${selectorSource}\n${uiSource}`, context, { filename: "profit-workspace-bundle.js" });
const api = vm.runInContext(`({
  profitDateWindow,
  calculateProfitSkuFact,
  calculateListingContribution,
  aggregateProductContribution,
  prepareProfitDailyEntry,
  createPriceObservation,
  evaluatePriceObservation,
  validateProfitProduct,
  validateProfitListing,
  validateProfitListingSku,
  createProfitRepository,
  selectListingProfitResult,
  selectProductProfitRows,
  selectProfitWorkspaceSummary,
  selectListingSkuTrend,
  classifyProfitHealth,
  selectProfitAttentionItems,
  createProfitWorkspaceState,
  profitChartModel,
  renderProfitTrendChart,
  renderProfitProductOverview,
  renderProfitProductDetail,
  renderProfitListingDetail,
  renderProfitTemplateShell,
  applyProfitWorkspaceAction
})`, context);
const plain = (value) => JSON.parse(JSON.stringify(value));

const chartFixture = [
  { dateKey: "2026-08-01", averageTransactionPrice: 18, itemsSold: 10 },
  { dateKey: "2026-08-02", averageTransactionPrice: 20, itemsSold: 20 },
  { dateKey: "2026-08-03", averageTransactionPrice: null, itemsSold: null }
];
const chartModel = api.profitChartModel(chartFixture);
assert.equal(chartModel.points.length, 3, "图表模型必须保留完整日期窗口");
assert.equal(chartModel.maxUnits, 20, "销量比例尺必须使用窗口最大销量");
assert.equal(chartModel.averagePrice, 19, "成交均价摘要必须忽略待同步日期");
assert.match(chartModel.pricePath, /^M /, "成交均价折线必须从首个有效数据点开始");
const chartHtml = api.renderProfitTrendChart(chartFixture, { title: "测试趋势" });
assert.match(chartHtml, /class="profit-trend-chart"/);
assert.match(chartHtml, /aria-label="测试趋势"/);
assert.match(chartHtml, /preserveAspectRatio="xMidYMid meet"/, "响应式缩放不得把折线数据点拉伸成椭圆");
assert.equal((chartHtml.match(/class="profit-trend-bar/g) || []).length, 3, "每个经营日必须保留一个销量柱位置");

assert.deepEqual(plain(api.profitDateWindow("2026-08-05", 7)), ["2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-08-05"]);
const completedSkuFact = api.calculateProfitSkuFact({
  gmv: 27,
  itemsSold: 3,
  grossSales: 48,
  productCostSnapshot: 3,
  estimatedShippingFee: 2,
  estimatedPlatformFees: 2.7
});
assert.equal(completedSkuFact.gmv, 27, "SKU GMV 必须保留平台经营口径");
assert.equal(completedSkuFact.itemsSold, 3);
assert.equal(completedSkuFact.averageTransactionPrice, 9, "成交均价必须由 GMV ÷ 售出件数得出");
assert.equal(completedSkuFact.productCostTotal, 9, "产品成本必须按统一单价乘销量");
assert.equal(completedSkuFact.estimatedReceived, 22.3, "预估到手只扣平台费用与运费");
assert.equal(completedSkuFact.contributionProfit, 13.3, "SKU 贡献利润不得扣链接共同广告和样品费");
assert.equal(completedSkuFact.completed, true);
assert.equal(api.calculateProfitSkuFact({ gmv: 0, itemsSold: 0, productCostSnapshot: 3 }).averageTransactionPrice, null, "零销量不得显示虚假成交均价");

const settledListing = api.calculateListingContribution(
  [
    { gmv: 14, itemsSold: 1, productCostSnapshot: 3, estimatedShippingFee: 1, estimatedPlatformFees: 1.4 },
    { gmv: 13, itemsSold: 2, productCostSnapshot: 3, estimatedShippingFee: 1, estimatedPlatformFees: 1.3 }
  ],
  { sampleCost: 2, advertisingSpend: 5, adjustments: 0 },
  { listingGmv: 27.72, settlementStatus: "settled", settlementAmount: 20.95, shippingFee: 2, platformFees: 2.7 }
);
assert.equal(settledListing.gmv, 27.72, "链接汇总 GMV 必须以平台链接口径为准");
assert.equal(settledListing.sumSkuGmv, 27);
assert.equal(settledListing.reconciliationDifference, 0.72, "必须保留链接与 SKU 汇总差异");
assert.equal(settledListing.actualReceived, 20.95, "已结算链接必须使用平台最终结算金额");
assert.equal(settledListing.receivedAmount, 20.95);
assert.equal(settledListing.productCostTotal, 9);
assert.equal(settledListing.finalProfit, 4.95);
assert.equal(settledListing.profitStatus, "settled");

const verifiedActualListing = api.calculateListingContribution(
  [
    { gmv: 356.79, itemsSold: 21, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 },
    { gmv: 181.80, itemsSold: 11, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 },
    { gmv: 56.97, itemsSold: 3, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 },
    { gmv: 41.98, itemsSold: 2, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 },
    { gmv: 37.98, itemsSold: 2, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 },
    { gmv: 0, itemsSold: 0, productCostSnapshot: 12, estimatedShippingFee: 0, estimatedPlatformFees: 0 }
  ],
  { sampleCost: null, advertisingSpend: null, adjustments: null, entryStatus: "pending" },
  {
    listingGmv: 675.52,
    netProductSales: 697.60,
    platformDiscounts: 5.09,
    platformFees: 66.13,
    settlementAmount: 631.47,
    settlementStatus: "settled"
  }
);
assert.equal(verifiedActualListing.netProductSales, 697.60, "必须保留 Earnings Analytics 的平台确认销售额");
assert.equal(verifiedActualListing.financialReconciliationDifference, 22.08, "经营 GMV 与平台确认销售额必须独立对账");
assert.equal(verifiedActualListing.platformDiscounts, 5.09, "平台优惠只作说明，不得重复扣减");
assert.equal(verifiedActualListing.productCostTotal, 468);
assert.equal(verifiedActualListing.skuGrossProfit, 207.52, "SKU 层只计算 GMV 减产品成本的商品毛利");
assert.equal(verifiedActualListing.provisionalProfit, 163.47);
assert.equal(verifiedActualListing.finalProfit, 163.47);
assert.equal(verifiedActualListing.profitCompleteness, "provisional", "内部费用缺失时不得伪装成最终利润");

const estimatedListing = api.calculateListingContribution(
  [{ gmv: 20, itemsSold: 2, productCostSnapshot: 3, estimatedShippingFee: 1, estimatedPlatformFees: 2 }],
  { sampleCost: 0, advertisingSpend: 4, adjustments: 0 },
  { listingGmv: 20, settlementStatus: "processing" }
);
assert.equal(estimatedListing.actualReceived, null);
assert.equal(estimatedListing.receivedAmount, 17);
assert.equal(estimatedListing.finalProfit, 7);
assert.equal(estimatedListing.profitStatus, "estimated");
const productContribution = api.aggregateProductContribution([settledListing, estimatedListing]);
assert.equal(productContribution.gmv, 47.72);
assert.equal(productContribution.itemsSold, 5);
assert.equal(productContribution.actualReceived, 20.95);
assert.equal(productContribution.receivedAmount, 37.95);
assert.equal(productContribution.finalProfit, 11.95);
assert.equal(productContribution.settledListingCount, 1);
assert.equal(productContribution.estimatedListingCount, 1);

assert.deepEqual(plain(api.prepareProfitDailyEntry([
  { dateKey: "2026-08-03", price: 18.5, units: 12 },
  { dateKey: "2026-08-04", price: 19.2, units: 9 }
], "2026-08-05")), { dateKey: "2026-08-05", price: 19.2, units: null, entryStatus: "pending" }, "今日只继承售价，不继承销量");

const observation = api.createPriceObservation({
  productId: "product-jzz",
  listingId: "listing-jzz-a",
  listingSkuId: "listing-sku-grey",
  oldPrice: 19.99,
  newPrice: 18.99,
  startedAt: "2026-08-05",
  changeKind: "planned"
});
assert.equal(observation.status, "observing");
assert.equal(observation.observationEnd, "2026-08-11");
assert.equal(api.createPriceObservation({ changeKind: "correction" }), null);
const evaluated = api.evaluatePriceObservation(observation, {
  baselineTargetUnits: [10, 10, 10, 10, 10, 10, 10],
  observedTargetUnits: [12, 12, 11, 12, 11, 12, 12],
  baselineProductUnits: [100, 100, 100, 100, 100, 100, 100],
  observedProductUnits: [106, 106, 106, 106, 106, 106, 106],
  baselineContributionProfit: 100,
  observedContributionProfit: 105
});
assert.equal(evaluated.decision, "improved");
assert.ok(evaluated.targetUnitLift >= 0.1);

assert.equal(api.validateProfitProduct({ code: "", name: "JZZ" }), "请输入产品简称");
assert.equal(api.validateProfitListing({ productId: "", storeId: "s", url: "https://example.com", lifecycleStatus: "active" }), "请选择所属产品");
assert.equal(api.validateProfitListing({ productId: "p", storeId: "s", url: "https://example.com", lifecycleStatus: "unknown" }), "链接状态无效");
assert.equal(api.validateProfitListingSku({ listingId: "l", skuId: "", cost: 12, commissionRate: 20 }), "请选择公共 SKU");
assert.equal(api.validateProfitListingSku({ listingId: "l", skuId: "s" }), "", "新增链接 SKU 不应再要求成本与佣金率");

const actualRepository = api.createProfitRepository("2026-08-03");
const actualState = actualRepository.getState();
assert.equal(actualState.syncStatus.scheduleTimezone, "Asia/Shanghai");
assert.equal(actualState.syncStatus.nextScheduledAt, "2026-08-04T17:00:00+08:00");
assert.equal(actualState.products.length, 1, "真实验证版只载入已核对的产品");
assert.equal(actualState.listings.length, 1, "未取得财务结算的链接不得混入真实样本");
const actualProduct = actualState.products[0];
const actualListing = actualState.listings[0];
assert.equal(actualProduct.code, "JZZ");
assert.equal(actualProduct.standardUnitCost, 12);
assert.equal(actualListing.platformListingId, "1731776510060368401");
const actualSkus = actualRepository.getListingSkus(actualListing.id);
assert.equal(actualSkus.length, 6);
const actualFacts = actualSkus.map((item) => actualRepository.getDailyFact(item.id, "2026-08-03"));
assert.equal(Number(actualFacts.reduce((sum, fact) => sum + fact.gmv, 0).toFixed(2)), 675.52);
assert.equal(actualFacts.reduce((sum, fact) => sum + fact.itemsSold, 0), 39);
assert.equal(actualFacts.reduce((sum, fact) => sum + fact.orderCount, 0), 37);
const actualSettlement = actualRepository.getDailySettlement(actualListing.id, "2026-08-03");
assert.deepEqual(plain({
  listingGmv: actualSettlement.listingGmv,
  netProductSales: actualSettlement.netProductSales,
  platformDiscounts: actualSettlement.platformDiscounts,
  platformFees: actualSettlement.platformFees,
  settlementAmount: actualSettlement.settlementAmount
}), { listingGmv: 675.52, netProductSales: 697.6, platformDiscounts: 5.09, platformFees: 66.13, settlementAmount: 631.47 });
const actualExpense = actualRepository.getDailyExpense(actualListing.id, "2026-08-03");
assert.equal(actualExpense.sampleCost, null);
assert.equal(actualExpense.advertisingSpend, null);
assert.equal(actualExpense.entryStatus, "pending");
const sampleTypeId = actualListing.sampleTypes[0].id;
actualRepository.updateDailyExpense(actualListing.id, "2026-08-03", { sampleQuantities: { [sampleTypeId]: 0 } });
actualRepository.updateDailyExpense(actualListing.id, "2026-08-03", { advertisingSpend: 0 });
assert.equal(actualRepository.updateDailyExpense(actualListing.id, "2026-08-03", { adjustments: 0 }).entryStatus, "completed", "明确填写 0 后费用才算完整");
assert.equal(api.selectListingProfitResult(actualRepository, actualListing.id, "2026-08-03").result.profitCompleteness, "complete");
actualRepository.updateDailyExpense(actualListing.id, "2026-08-03", { sampleQuantities: { [sampleTypeId]: null }, advertisingSpend: null, adjustments: null });
assert.notEqual(actualRepository.getDailyExpense(actualListing.id, "2026-08-03").entryStatus, "completed", "清空费用后必须恢复待补状态");
const actualListingResult = api.selectListingProfitResult(actualRepository, actualListing.id, "2026-08-03");
assert.equal(actualListingResult.result.gmv, 675.52);
assert.equal(actualListingResult.result.netProductSales, 697.6);
assert.equal(actualListingResult.result.actualReceived, 631.47);
assert.equal(actualListingResult.result.productCostTotal, 468);
assert.equal(actualListingResult.result.provisionalProfit, 163.47);
assert.equal(actualListingResult.result.profitCompleteness, "provisional");
assert.equal(actualListingResult.sevenDay.days.length, 7);
assert.equal(actualListingResult.sevenDay.days.filter((day) => day.result.gmv > 0).length, 1, "只有一个真实经营日，不得补造趋势");
actualRepository.updateProductCost(actualProduct.id, 12.5, "2026-08-03");
assert.equal(actualRepository.getDailyFact(actualSkus[0].id, "2026-08-03").productCostSnapshot, 12.5, "统一产品成本必须批量作用到生效日后的全部链接 SKU");
assert.equal(api.selectListingProfitResult(actualRepository, actualListing.id, "2026-08-03").result.productCostTotal, 487.5);
actualRepository.updateProductCost(actualProduct.id, 12, "2026-08-03");

const actualProductRows = api.selectProductProfitRows(actualRepository, "2026-08-03");
const actualWorkspaceSummary = api.selectProfitWorkspaceSummary(actualProductRows);
assert.equal(actualWorkspaceSummary.productCount, 1);
assert.equal(actualWorkspaceSummary.listingCount, 1);
assert.equal(actualWorkspaceSummary.gmv, 675.52);
assert.equal(actualWorkspaceSummary.profitCompleteness, "provisional");
assert.ok(api.selectProfitAttentionItems(actualProductRows).some((item) => item.kind === "expense_pending"), "待补内部费用必须进入今日动作");

const secondListing = actualRepository.addListing({ productId: actualProduct.id, storeId: actualState.stores[0].id, url: "https://example.com/second-link", displayName: "JZZ 新链接", lifecycleStatus: "active" });
const sharedSku = actualRepository.addListingSku({ listingId: secondListing.id, skuId: actualSkus[0].skuId, price: 18.55 });
assert.equal(sharedSku.skuId, actualSkus[0].skuId, "新增链接必须复用公共 SKU 身份");
const originalPrice = actualRepository.getDailyFact(actualSkus[0].id, "2026-08-03").price;
actualRepository.updateDailyFact(sharedSku.id, "2026-08-03", { price: 19.25 });
assert.equal(actualRepository.getDailyFact(actualSkus[0].id, "2026-08-03").price, originalPrice, "跨链接售价必须独立");
actualRepository.setListingLifecycle(actualListing.id, "delisted", "2026-08-03");
assert.ok(actualRepository.getDailyFact(actualSkus[0].id, "2026-08-03"), "链接下架不得删除历史");
actualRepository.setListingLifecycle(actualListing.id, "active");

const actualWorkspace = api.createProfitWorkspaceState("2026-08-03");
const actualOverviewHtml = api.renderProfitProductOverview(actualWorkspace);
assert.match(api.renderProfitTemplateShell(actualWorkspace), /真实店铺样本/);
assert.doesNotMatch(actualOverviewHtml, /数据为演示口径/);
assert.match(actualOverviewHtml, /\$675\.52/);
assert.equal(api.applyProfitWorkspaceAction(actualWorkspace, { type: "openProduct", productId: "product-jzz" }), true);
const productCostHtml = api.renderProfitProductDetail(actualWorkspace, "product-jzz");
assert.match(productCostHtml, /data-profit-apply-product-cost/, "统一产品成本必须提供明确应用动作");
assert.equal(api.applyProfitWorkspaceAction(actualWorkspace, { type: "updateProductCost", productId: "product-jzz", value: 12.6, effectiveAt: "2026-08-03" }), true);
assert.equal(actualWorkspace.repository.getProduct("product-jzz").standardUnitCost, 12.6, "应用成本动作必须更新产品主档");
api.applyProfitWorkspaceAction(actualWorkspace, { type: "backOverview" });
assert.equal(api.applyProfitWorkspaceAction(actualWorkspace, { type: "openListing", listingId: "listing-jzz-main" }), true);
let actualListingHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
for (const label of ["经营 GMV", "平台确认销售额", "经营与财务口径差异", "平台订单成本", "实际到手", "产品成本", "广告、样品与调整", "暂算利润"]) {
  assert.match(actualListingHtml, new RegExp(label), `真实利润桥缺少 ${label}`);
}
assert.match(actualListingHtml, /\+\$22\.08/);
assert.match(actualListingHtml, /广告、样品待补/);
assert.match(actualListingHtml, /value="" placeholder="待补"/, "未取得的内部费用输入框必须保持空白");
assert.ok((actualListingHtml.match(/待同步/g) || []).length >= 6, "缺失经营日必须显示待同步，不得伪装成 0 销量");
assert.match(actualListingHtml, /SKU 商品毛利/);
assert.doesNotMatch(actualListingHtml, /SKU 贡献利润/);
assert.doesNotMatch(actualListingHtml, /<span>最终利润<\/span>/);
api.applyProfitWorkspaceAction(actualWorkspace, { type: "toggleSkuTrend", listingSkuId: "listing-jzz-main-sku-grey" });
actualListingHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
assert.match(actualListingHtml, /最近 7 天成交均价与动销/);

const [styleManifest, profitStyles] = await Promise.all([
  readFile("src/styles/workbench.css", "utf8"),
  readFile("src/styles/modules/18-profit-template.css", "utf8")
]);
assert.ok(styleManifest.indexOf("./modules/03-costing.css") < styleManifest.indexOf("./modules/18-profit-template.css"));
assert.ok(styleManifest.indexOf("./modules/18-profit-template.css") < styleManifest.indexOf("./modules/17-final-responsive.css"));
for (const selector of [
  ".profit-workspace-head",
  ".profit-sync-card",
  ".profit-overview-layout",
  ".profit-summary-band",
  ".profit-product-table-wrap",
  ".profit-attention-panel",
  ".profit-listing-grid",
  ".profit-entry-table-wrap",
  ".profit-sku-trend",
  ".profit-trend-chart",
  ".profit-settlement-panel",
  ".profit-settlement-primary",
  ".profit-settlement-status",
  ".profit-product-cost-control",
  ".profit-expense-grid",
  ".profit-management-drawer",
  ".profit-price-change-choices",
  ".profit-mobile-entry-list"
]) {
  assert.match(profitStyles, new RegExp(selector.replace(".", "\\.")), `利润工作台样式缺少 ${selector}`);
}
assert.match(profitStyles, /\.profit-product-table-wrap\s*\{[^}]*overflow-x:\s*auto/s, "产品表只允许在自身容器内横向滚动");
assert.match(profitStyles, /\.profit-entry-table-wrap\s*\{[^}]*overflow-x:\s*auto/s, "SKU 表只允许在自身容器内横向滚动");
assert.match(profitStyles, /\.profit-num\s*\{[^}]*text-align:\s*right/s, "金额和销量必须按数字语义右对齐");
assert.match(profitStyles, /\.profit-row-action[\s\S]*?white-space:\s*nowrap/s, "表格动作文字不得拆成孤字");
assert.match(profitStyles, /--profit-ink-green:/, "专业运营驾驶舱必须拥有模块级深墨绿视觉令牌");
assert.match(profitStyles, /\.profit-template-shell\s*\{[^}]*background:/s, "利润工作台必须建立独立暖灰页面底色");
for (const breakpoint of ["1180px", "900px", "640px", "420px"]) {
  assert.match(profitStyles, new RegExp(`@media \\(max-width: ${breakpoint.replace("px", "px")}`), `利润工作台缺少 ${breakpoint} 响应式断点`);
}
assert.match(profitStyles, /@media \(max-width: 640px\)[\s\S]*?\.profit-entry-table-wrap\s*\{[^}]*display:\s*none/s, "手机端必须切换为易填写的 SKU 卡片");
assert.match(profitStyles, /@media \(max-width: 640px\)[\s\S]*?\.profit-mobile-entry-list\s*\{[^}]*display:\s*grid/s, "手机端必须显示 SKU 填写卡片");
assert.match(profitStyles, /@media \(max-width: 640px\)[\s\S]*?\.profit-sync-card\s*\{[^}]*grid-template-columns:\s*42px minmax\(0, 1fr\)/s, "手机端同步状态不得挤压文字和按钮");
assert.match(profitStyles, /@media \(max-width: 420px\)[\s\S]*?\.profit-settlement-grid\s*\{[^}]*grid-template-columns:\s*1fr/s, "窄屏结算数字必须单列居中展示");

console.log(JSON.stringify({ passed: 48, phase: "product-listing-profit-redesign" }));
