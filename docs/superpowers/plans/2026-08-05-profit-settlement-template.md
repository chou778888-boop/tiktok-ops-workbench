# 链接利润与结算模板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有链接利润演示页升级为可验证的“产品整体 → 店铺链接 → SKU → 平台结算”模板。

**Architecture:** 保留现有纯函数领域层、内存仓储、选择器和 HTML 字符串渲染边界。领域层计算成交均价与结算利润，仓储提供真实字段形状的演示数据，选择器负责产品/链接聚合，模板层只负责交互和展示；正式同步后替换仓储数据源即可。

**Tech Stack:** Vanilla JavaScript、CSS modules、Node.js `assert`/`vm` 聚焦测试、esbuild、Cloudflare Pages 构建。

## Global Constraints

- 本轮不接战斧、不发网络请求、不写 `localStorage`、`sessionStorage` 或云端状态。
- 产品成本默认统一到产品主档；广告和样品按链接与日期维护。
- 同步计划显示北京时间每天 17:00，经营日显示店铺时区。
- 默认展示近七天，更早历史收起。
- 桌面端和约 320px 窄屏均不得发生页面整体横向溢出。
- 不直接编辑 `dist/`；先跑聚焦测试，再跑完整检查、构建和浏览器回归。

---

### Task 1: 结算领域模型

**Files:**
- Modify: `src/app/workbench/61-profit-domain.js`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Produces: `calculateProfitSkuFact(fact)` 返回 `gmv`、`itemsSold`、`averageTransactionPrice`、`productCostTotal`、`contributionProfit`。
- Produces: `calculateListingContribution(skuFacts, expense, settlement)` 返回 `estimatedReceived`、`actualReceived`、`finalProfit`、`profitStatus` 和 `reconciliationDifference`。

- [ ] **Step 1: 写失败测试**

```js
assert.deepEqual(plain(api.calculateProfitSkuFact({
  gmv: 27, itemsSold: 3, productCostSnapshot: 3
})), {
  gmv: 27,
  itemsSold: 3,
  averageTransactionPrice: 9,
  productCostTotal: 9,
  contributionProfit: 18,
  completed: true
});
```

- [ ] **Step 2: 验证测试失败**

Run: `node scripts/test-profit-template.mjs`
Expected: FAIL，现有结果仍返回 `price/units/revenue`。

- [ ] **Step 3: 实现最小领域计算**

```js
function calculateProfitSkuFact(fact = {}) {
  const gmv = Math.max(0, profitNumber(fact.gmv));
  const itemsSold = Math.max(0, Math.round(profitNumber(fact.itemsSold)));
  const productCost = Math.max(0, profitNumber(fact.productCostSnapshot));
  return {
    gmv,
    itemsSold,
    averageTransactionPrice: itemsSold ? gmv / itemsSold : null,
    productCostTotal: productCost * itemsSold,
    contributionProfit: gmv - productCost * itemsSold,
    completed: fact.gmv !== null && fact.gmv !== undefined && fact.itemsSold !== null && fact.itemsSold !== undefined
  };
}
```

- [ ] **Step 4: 增加结算和预估分支测试并实现**

```js
const settlementAmount = settlement.settlementStatus === "settled"
  ? profitNumber(settlement.settlementAmount)
  : null;
const received = settlementAmount ?? estimatedReceived;
const finalProfit = received - productCostTotal - advertisingSpend - sampleSpend;
```

- [ ] **Step 5: 运行聚焦测试**

Run: `node scripts/test-profit-template.mjs`
Expected: PASS。

### Task 2: 演示仓储与统一产品成本

**Files:**
- Modify: `src/app/workbench/62-profit-repository.js`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Produces: 产品字段 `standardUnitCost`、`costEffectiveAt`。
- Produces: SKU 日事实字段 `gmv`、`itemsSold`、`grossSales`、`listingGmv`。
- Produces: 链接日结算 `dailySettlements` 与 `updateProductCost(productId, cost, effectiveAt)`。

- [ ] **Step 1: 写统一成本与结算映射失败测试**

```js
repository.updateProductCost("product-yt", 3.25, "2026-08-05");
assert.ok(repository.getListingSkus("listing-yt-main").every((row) => (
  repository.getSkuMaster(row.skuId).productId === "product-yt"
)));
assert.equal(repository.getProduct("product-yt").standardUnitCost, 3.25);
assert.equal(repository.getDailySettlement("listing-yt-main", "2026-08-04").settlementStatus, "settled");
```

- [ ] **Step 2: 验证测试失败**

Run: `node scripts/test-profit-template.mjs`
Expected: FAIL，仓储尚无统一成本和结算接口。

- [ ] **Step 3: 调整演示数据**

为 Himood 示例加入已验证的数据形状：5 个动销 SKU、链接汇总 GMV、SKU GMV 取整差异、`estimated/settled` 状态、同步时间与店铺时区；其他产品保留多店多链接演示。

- [ ] **Step 4: 实现仓储接口**

```js
function updateProductCost(productId, standardUnitCost, effectiveAt = anchorDate) {
  const product = getProduct(productId);
  if (!product) return null;
  product.standardUnitCost = Math.max(0, profitNumber(standardUnitCost));
  product.costEffectiveAt = effectiveAt;
  return product;
}
```

- [ ] **Step 5: 运行聚焦测试**

Run: `node scripts/test-profit-template.mjs`
Expected: PASS。

### Task 3: 产品、链接和 SKU 选择器

**Files:**
- Modify: `src/app/workbench/63-profit-selectors.js`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: Task 1 领域结果和 Task 2 仓储接口。
- Produces: `selectListingProfitResult` 的七天经营、结算和费用摘要。
- Produces: 产品总盘的七天 GMV、实际/预估利润、结算覆盖率、动销 SKU 数和同步状态。

- [ ] **Step 1: 写失败测试**

```js
assert.equal(jzzRow.sevenDay.days.length, 7);
assert.ok(jzzRow.settlement.settledListingCount >= 0);
assert.ok(Object.hasOwn(jzzRow.result, "actualReceived"));
```

- [ ] **Step 2: 验证测试失败**

Run: `node scripts/test-profit-template.mjs`
Expected: FAIL，选择器尚未输出七天结算摘要。

- [ ] **Step 3: 实现七天聚合与状态分类**

健康状态顺序固定为：数据缺失 → 贡献亏损 → 低利润 → 结算处理中 → 调价观察 → 正常。

- [ ] **Step 4: 运行聚焦测试**

Run: `node scripts/test-profit-template.mjs`
Expected: PASS。

### Task 4: 模板层级与交互

**Files:**
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `index.html`（仅在现有对话框需要补产品成本表单时）
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: Task 3 选择器结果。
- Produces: 产品总盘、产品详情、链接详情和产品成本抽屉 HTML。

- [ ] **Step 1: 写页面语义失败测试**

```js
assert.match(overviewHtml, /近 7 天产品利润总盘/);
assert.match(overviewHtml, /预计下次同步/);
assert.match(listingHtml, /成交均价/);
assert.match(listingHtml, /实际到手|预估到手/);
assert.match(listingHtml, /平台结算/);
assert.doesNotMatch(listingHtml, /佣金率/);
```

- [ ] **Step 2: 验证测试失败**

Run: `node scripts/test-profit-template.mjs`
Expected: FAIL，现有模板仍以手填售价和佣金率为主。

- [ ] **Step 3: 重构三层页面**

产品总盘以七天结果和异常队列为主；产品详情横向比较链接；链接详情把经营、结算、SKU 和链接费用分成四个清晰区块。

- [ ] **Step 4: 增加产品成本批量编辑与链接费用编辑**

成本只写产品主档；广告和样品仍调用链接日费用接口。保存后重新渲染，不改变导航层级。

- [ ] **Step 5: 运行聚焦测试**

Run: `node scripts/test-profit-template.mjs`
Expected: PASS。

### Task 5: 精美排版与窄屏适配

**Files:**
- Modify: `src/styles/modules/18-profit-template.css`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: Task 4 类名。
- Produces: 桌面表格、链接卡片、结算状态、七天趋势和移动卡片布局。

- [ ] **Step 1: 增加样式边界失败测试**

```js
assert.match(profitStyles, /\.profit-settlement-status/);
assert.match(profitStyles, /\.profit-sync-card/);
assert.match(profitStyles, /\.profit-seven-day-strip/);
assert.match(profitStyles, /@media \(max-width: 420px\)/);
```

- [ ] **Step 2: 验证测试失败**

Run: `node scripts/test-profit-template.mjs`
Expected: FAIL，新增模板类名尚无样式。

- [ ] **Step 3: 实现桌面与移动布局**

使用现有设计令牌；数字右对齐、表头和状态垂直居中、按钮不换行、表格容器独立滚动，320px 页面无整体横向溢出。

- [ ] **Step 4: 运行聚焦测试**

Run: `node scripts/test-profit-template.mjs`
Expected: PASS。

### Task 6: 完整验证与本地预览

**Files:**
- Verify only: source files and generated `dist/`

**Interfaces:**
- Consumes: Tasks 1–5 的完成结果。
- Produces: 可在 `http://127.0.0.1:8797/` 查看并交互的模板。

- [ ] **Step 1: 运行完整检查**

Run: `pnpm check`
Expected: PASS。

- [ ] **Step 2: 构建生产文件**

Run: `pnpm build`
Expected: PASS，且源清单与样式清单无遗漏。

- [ ] **Step 3: 浏览器回归**

桌面检查产品总盘、产品详情和链接详情；320px 检查无整体横向溢出、SKU 改为卡片、按钮文案完整。

- [ ] **Step 4: 交付预览**

确认本地服务稳定监听 8797，向用户说明模板入口和本轮未包含的自动同步范围。
