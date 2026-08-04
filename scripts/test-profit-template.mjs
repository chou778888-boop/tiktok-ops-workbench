import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const html = await readFile("index.html", "utf8");

assert.match(
  html,
  /data-cost-pane="profit-template"[^>]*>\s*利润中心/,
  "成本测算必须提供利润中心模板页签"
);
assert.match(
  html,
  /data-cost-pane-content="profit-template"/,
  "利润中心模板必须有对应内容面板"
);

for (const id of ["profitTemplateRoot", "profitLinkDialog", "profitLinkForm", "profitSkuDialog", "profitSkuForm"]) {
  assert.match(html, new RegExp(`id="${id}"`), `利润中心模板缺少 #${id}`);
}

const [appManifest, source] = await Promise.all([
  readFile("scripts/app-sources.mjs", "utf8"),
  readFile("src/app/workbench/65-profit-template.js", "utf8").catch(() => "")
]);

assert.match(
  appManifest,
  /src\/app\/workbench\/65-profit-template\.js/,
  "利润中心模板模块必须进入生产构建清单"
);
assert.ok(source, "利润中心模板必须提供可执行的生产模块");
assert.doesNotMatch(
  source,
  /\bsaveState\s*\(|\blocalStorage\b|\bsessionStorage\b|\bfetch\s*\(/,
  "利润中心模板不得调用任何持久化或网络接口"
);

let nextId = 0;
const context = vm.createContext({
  URL,
  crypto: { randomUUID: () => `test-${nextId += 1}` }
});
vm.runInContext(source, context, { filename: "65-profit-template.js" });
const production = vm.runInContext(`({
  createProfitTemplateData,
  profitTemplateVisibleDates: typeof profitTemplateVisibleDates === "function" ? profitTemplateVisibleDates : undefined,
  calculateProfitTemplateSkuDay: typeof calculateProfitTemplateSkuDay === "function" ? calculateProfitTemplateSkuDay : undefined,
  calculateProfitTemplateListingDay: typeof calculateProfitTemplateListingDay === "function" ? calculateProfitTemplateListingDay : undefined,
  calculateProfitTemplateSku,
  profitTemplateSummary,
  validateProfitTemplateLink,
  validateProfitTemplateSku,
  toggleProfitTemplateSku
})`, context);
const plain = (value) => JSON.parse(JSON.stringify(value));

assert.equal(typeof production.calculateProfitTemplateSkuDay, "function", "必须提供 SKU 日利润计算函数");
assert.equal(typeof production.calculateProfitTemplateListingDay, "function", "必须提供链接日利润汇总函数");
assert.equal(typeof production.profitTemplateVisibleDates, "function", "必须提供近七天日期窗口函数");

const dailyListing = {
  id: "listing-a",
  sampleTypes: [{ id: "sample-standard", name: "标准寄样", unitCost: 12 }],
  daily: {
    "2026-08-04": {
      sampleQuantities: { "sample-standard": 2 },
      marketingSpend: 10,
      adjustments: 5
    }
  },
  skus: [{
    id: "sku-a",
    active: true,
    cost: 12,
    commissionRate: 20,
    daily: { "2026-08-04": { units: 10, price: 20 } }
  }]
};

assert.deepEqual(
  plain(production.calculateProfitTemplateSkuDay(dailyListing.skus[0], "2026-08-04")),
  { units: 10, price: 20, gmv: 200, unitProfit: 4, grossProfit: 40 },
  "SKU 日利润必须由当日售价、销量和档案成本计算"
);
assert.deepEqual(
  plain(production.calculateProfitTemplateListingDay(dailyListing, "2026-08-04")),
  {
    units: 10,
    gmv: 200,
    grossProfit: 40,
    sampleCost: 24,
    marketingSpend: 10,
    adjustments: 5,
    netProfit: 1,
    margin: 0.005
  },
  "链接净利润必须扣除寄样、广告营销和调整费用"
);
assert.deepEqual(
  plain(production.profitTemplateVisibleDates("2026-08-04")),
  ["2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"],
  "默认时间窗口必须包含选择日期及前六天"
);

assert.deepEqual(
  plain(production.calculateProfitTemplateSku({
    units: 10,
    price: 20,
    cost: 12,
    commissionRate: 20,
    sampleCost: 5,
    adSpend: 10,
    active: true
  })),
  { gmv: 200, unitProfit: 4, actualProfit: 25, margin: 0.125 },
  "SKU 利润必须按手算口径返回 GMV、单件利润和实际利润"
);

const listings = [{
  id: "listing-a",
  skus: [
    { id: "active", units: 10, price: 20, cost: 12, commissionRate: 20, sampleCost: 5, adSpend: 10, active: true },
    { id: "inactive", units: 99, price: 99, cost: 0, commissionRate: 0, sampleCost: 0, adSpend: 0, active: false }
  ]
}];
assert.deepEqual(
  plain(production.profitTemplateSummary(listings)),
  { units: 10, gmv: 200, sampleCost: 5, adSpend: 10, actualProfit: 25, margin: 0.125 },
  "汇总必须排除停用 SKU"
);
assert.equal(production.toggleProfitTemplateSku(listings, "active"), false, "启用 SKU 应可停用");
assert.equal(listings[0].skus.length, 2, "停用 SKU 不得被删除");
assert.equal(production.toggleProfitTemplateSku(listings, "active"), true, "停用 SKU 应可恢复");

assert.equal(production.validateProfitTemplateLink({ store: "", product: "JZZ", url: "https://example.com" }), "请选择所属店铺");
assert.equal(production.validateProfitTemplateLink({ store: "DreamWeave", product: "", url: "https://example.com" }), "请输入产品名称");
assert.equal(production.validateProfitTemplateLink({ store: "DreamWeave", product: "JZZ", url: "ftp://example.com" }), "请输入以 http:// 或 https:// 开头的商品链接");
assert.equal(production.validateProfitTemplateLink({ store: "DreamWeave", product: "JZZ", url: "https://example.com" }), "");
assert.equal(production.validateProfitTemplateSku({ name: "Blue", price: -1, cost: 12, commissionRate: 20 }), "售价不能小于 0");
assert.equal(production.validateProfitTemplateSku({ name: "Blue", price: 20, cost: -1, commissionRate: 20 }), "单件成本不能小于 0");
assert.equal(production.validateProfitTemplateSku({ name: "Blue", price: 20, cost: 12, commissionRate: 101 }), "佣金率必须在 0–100% 之间");
assert.equal(production.validateProfitTemplateSku({ name: "Blue", price: 20, cost: 12, commissionRate: 20 }), "");

const demo = production.createProfitTemplateData("2026-08-04");
assert.deepEqual(
  plain(demo.map((item) => item.product)),
  ["JZZ", "JDZ", "NHZ", "YG", "ZG", "YT"],
  "模板必须生成与利润表一致的六条示例链接"
);
assert.equal(Object.keys(demo[0].skus[0].daily).length, 30, "每个 SKU 必须提供最近 30 天演示记录");
assert.equal(Object.keys(demo[0].daily).length, 30, "每条链接必须提供最近 30 天费用记录");
assert.equal(demo.find((item) => item.product === "JDZ").sampleTypes.length, 2, "JDZ 必须演示多寄样类型");

const [styleManifest, profitStyles] = await Promise.all([
  readFile("src/styles/workbench.css", "utf8"),
  readFile("src/styles/modules/18-profit-template.css", "utf8").catch(() => "")
]);
assert.ok(profitStyles, "利润中心模板必须提供独立样式模块");
const costingStyleIndex = styleManifest.indexOf("./modules/03-costing.css");
const profitStyleIndex = styleManifest.indexOf("./modules/18-profit-template.css");
const finalResponsiveIndex = styleManifest.indexOf("./modules/17-final-responsive.css");
assert.ok(
  costingStyleIndex >= 0 && profitStyleIndex > costingStyleIndex && finalResponsiveIndex > profitStyleIndex,
  "利润模板样式必须位于成本样式之后、最终响应式样式之前"
);
for (const selector of [".profit-template-kpis", ".profit-listing-grid", ".profit-table-wrap", ".profit-dialog"]) {
  assert.match(profitStyles, new RegExp(selector.replace(".", "\\.")), `利润模板样式缺少 ${selector}`);
}
for (const breakpoint of ["1439px", "899px", "419px"]) {
  assert.match(profitStyles, new RegExp(`@media \\(max-width: ${breakpoint.replace("px", "px")}`), `利润模板缺少 ${breakpoint} 响应式断点`);
}
assert.match(profitStyles, /\.profit-table-wrap\s*\{[^}]*overflow-x:\s*auto/s, "利润表必须在自身容器内横向滚动");

console.log(JSON.stringify({ passed: 34, phase: "profit-template-complete" }));
