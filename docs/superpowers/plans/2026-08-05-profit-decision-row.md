# 链接趋势与利润拆解双栏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单条链接详情页的七日趋势与当日利润拆解组合成桌面等宽双栏，并移除重复的整行平台结算模块。

**Architecture:** 保留现有趋势图渲染函数，新增独立的利润拆解渲染函数，再由决策区组合函数统一输出左右两栏。所有金额继续读取现有 selector 结果；CSS 只负责双栏、账本行与窄屏堆叠，不引入新依赖。

**Tech Stack:** 原生 JavaScript 模板、CSS Grid、Node.js `assert` 回归测试、Codex 内置浏览器。

## Global Constraints

- 宽度大于 900px 时使用等宽双栏，左右栏间距为 12px。
- 左栏使用正常比例的七日成交均价折线与销量柱形图，不使用 156px 强制扁平画布。
- 右栏按 GMV、运费、平台费、到手、产品成本、链接费用、最终利润顺序展示。
- 实际/预估到手使用 `receivedAmount`，最终利润使用 `finalProfit`，利润率使用 `contributionMargin`。
- 不新增字段、不更改公式、不增加团队填写项。
- 宽度不大于 900px 时上下排列，趋势在上、利润拆解在下。
- 当前工作树包含用户其他未提交改动；只修改计划列出的文件，不提交或合并。

---

### Task 1: 锁定双栏与利润拆解语义

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `renderProfitListingDetail(state, listingId): string`。
- Produces: 对决策区、利润拆解步骤、平台结算去重和移动语义的回归断言。

- [ ] **Step 1: 写入失败测试**

在链接详情断言中加入：

```js
assert.match(listingHtml, /class="profit-decision-grid"/, "趋势和利润拆解必须组合为同一经营判断区");
assert.match(listingHtml, /class="profit-profit-breakdown"/, "链接详情必须提供当日利润拆解");
for (const label of ["链接 GMV", "TikTok Shop 运费", "平台各项费用", "预估到手", "产品成本", "广告、样品及调整", "最终利润"]) {
  assert.match(listingHtml, new RegExp(label), `利润拆解缺少 ${label}`);
}
assert.match(listingHtml, /profit-breakdown-result/, "最终利润必须拥有独立结果语义");
assert.doesNotMatch(listingHtml, /class="profit-settlement-panel"/, "平台结算不得在双栏下方重复出现");
```

删除已经过时的 `.profit-settlement-primary` 必须存在断言；保留成交均价、七日图表、结算状态和最终利润断言。

- [ ] **Step 2: 运行测试确认失败**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL，提示缺少 `profit-decision-grid`。

### Task 2: 实现模块化利润决策区

**Files:**
- Modify: `src/app/workbench/65-profit-template.js`
- Test: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `listingResult.result`、`listingResult.settlement`、`listingResult.listing` 与 `state.activeDate`。
- Produces: `renderProfitBreakdown(state, listingResult): string`、`renderProfitDecisionRow(state, listingResult): string`。

- [ ] **Step 1: 新增利润拆解渲染函数**

实现 `renderProfitBreakdown(state, listingResult)`：

```js
function renderProfitBreakdown(state, listingResult) {
  const result = listingResult.result;
  const linkExpenses = result.sampleCost + result.advertisingSpend + result.adjustments;
  const receivedLabel = result.profitStatus === "settled" ? "实际到手" : "预估到手";
  const difference = Math.abs(result.reconciliationDifference) >= 0.01
    ? `<em>SKU 汇总差异 ${profitUiMoney(result.reconciliationDifference)}</em>`
    : "";
  return `<section class="profit-profit-breakdown">
    <div class="profit-block-title profit-breakdown-head"><div><h3>当日利润拆解</h3><p>从平台成交到最终经营利润，逐项核对扣减。</p></div>${profitSettlementBadge(result)}</div>
    <div class="profit-breakdown-ledger">
      <div class="profit-breakdown-row"><span>链接 GMV</span><b>${profitUiMoney(result.gmv)}</b></div>
      <div class="profit-breakdown-row deduction"><span>TikTok Shop 运费</span><b>− ${profitUiMoney(result.shippingFee)}</b></div>
      <div class="profit-breakdown-row deduction"><span>平台各项费用</span><b>− ${profitUiMoney(result.platformFees)}</b></div>
      <div class="profit-breakdown-row subtotal"><span>${receivedLabel}</span><b>${profitUiMoney(result.receivedAmount)}</b></div>
      <div class="profit-breakdown-row deduction"><span>产品成本</span><b>− ${profitUiMoney(result.productCostTotal)}</b></div>
      <div class="profit-breakdown-row deduction"><span>广告、样品及调整</span><b>− ${profitUiMoney(linkExpenses)}</b></div>
    </div>
    <div class="profit-breakdown-result ${result.finalProfit < 0 ? "loss" : ""}"><span>最终利润<small>利润率 ${profitUiPercent(result.contributionMargin)}</small></span><b>${profitUiMoney(result.finalProfit)}</b></div>
    <footer><span>来源：${profitUiEscape(listingResult.settlement.source)}</span><span>${state.activeDate} · ${profitUiEscape(listingResult.listing.timezone)}</span>${difference}</footer>
  </section>`;
}
```

输出七个账本步骤、结算状态、数据来源、经营日、店铺时区和可选的 SKU 汇总差异。扣减金额统一带负号；链接费用详情显示广告、样品与调整费用合计。

- [ ] **Step 2: 新增双栏组合函数**

```js
function renderProfitDecisionRow(state, listingResult) {
  return `<div class="profit-decision-grid">${renderProfitSevenDayStrip(listingResult)}${renderProfitBreakdown(state, listingResult)}</div>`;
}
```

- [ ] **Step 3: 替换详情页旧结构**

将 `${renderProfitSevenDayStrip(row)}` 与后续独立 `.profit-settlement-panel` 替换为 `${renderProfitDecisionRow(state, row)}`，其他模块顺序不变。

- [ ] **Step 4: 运行聚焦测试确认通过**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS，输出 `product-listing-profit-redesign`。

### Task 3: 实现双栏视觉与双端验收

**Files:**
- Modify: `src/styles/modules/18-profit-template.css`
- Verify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `.profit-decision-grid`、`.profit-profit-breakdown`、`.profit-breakdown-ledger`、`.profit-breakdown-row`、`.profit-breakdown-result`。
- Produces: 桌面等宽双栏、右侧账本结构、900px 以下单列结构。

- [ ] **Step 1: 添加桌面与通用布局**

```css
.profit-decision-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-items: stretch;
}

.profit-decision-grid > section { height: 100%; }
.profit-profit-breakdown { display: grid; grid-template-rows: auto 1fr auto; }
.profit-breakdown-row { display: flex; align-items: center; justify-content: space-between; }
.profit-breakdown-result { color: #fff; background: var(--profit-ink-green); }
```

利润拆解使用单层账本行、细分隔线、金额右对齐；小计与最终结果分别建立清晰层级。移除桌面端 `.profit-seven-day-section .profit-trend-plot svg { height: 156px; }` 强制规则，让半宽图表恢复 `700 / 230` 比例。

- [ ] **Step 2: 添加窄屏回退**

在 `@media (max-width: 900px)` 中把 `.profit-decision-grid` 改为 `grid-template-columns: 1fr`；在 640px 与 420px 下保持现有图表最小高度和单列金额可读性。

- [ ] **Step 3: 运行完整验证**

Run: `npm run check`

Expected: exit 0，全部项目检查通过。

Run: `node scripts/build-cloudflare.mjs`

Expected: exit 0，输出 `Cloudflare static bundle ready`。

- [ ] **Step 4: 浏览器桌面验收**

在 1440×900 进入“利润与成本 → JZZ → JZZ 主链接”，验证决策区两栏宽度接近 1:1、图表不拉伸、右栏七步完整、旧平台结算不重复、页面无横向溢出。

- [ ] **Step 5: 浏览器手机验收**

在 390×844 验证趋势与利润拆解上下排列、图表日期轴完整、账本标签不出现孤字、SKU 使用卡片、页面无横向溢出。

- [ ] **Step 6: 保留工作树**

只报告本计划的规格、计划、测试、模板和样式文件；不提交、不合并、不清理其他用户改动。
