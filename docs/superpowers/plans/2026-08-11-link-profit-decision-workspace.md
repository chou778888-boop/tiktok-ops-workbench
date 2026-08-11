# Link Profit Decision Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the complex single-listing profit detail with a decision-first page that shows one trusted profit conclusion, the causes behind it, the next action, and progressively disclosed evidence.

**Architecture:** Add a focused, pure view-model module between the existing profit selectors and template so that action priority, trend availability, SKU focus ranking, and visible ledger rows are testable outside the DOM. Keep the existing domain, repository, cloud persistence, product/listing/SKU model, and profit formulas unchanged; the template consumes the new models and owns only display state, drawers, and event binding.

**Tech Stack:** Browser-native JavaScript, semantic HTML, modular CSS, Node `vm`/`assert` regression tests, existing Cloudflare Pages build pipeline.

## Global Constraints

- Do not change profit formulas, settlement math, cloud storage, or real team data.
- Keep transaction average price separate from actual received amount.
- Platform order costs remain link-level and must not be allocated to SKU gross profit.
- Missing advertising, sample, or adjustment values remain `null`; they must never be interpreted as zero.
- A complete trend comparison requires seven complete natural days; one to six days may not produce a full-period comparison.
- Body text is at least 14px, auxiliary labels at least 12px, mobile touch targets at least 44px.
- Check desktop and approximately 320px; the page itself may not overflow horizontally.
- Existing product overview, product detail, listing lifecycle, SKU lifecycle, dialogs, and real data must remain available.
- Do not edit `dist/`; build it from source after focused and full checks pass.

## File Structure

- Create `src/app/workbench/64-profit-view-models.js`: pure decision, trend, ledger, expense-completeness, and focus-SKU models.
- Modify `scripts/app-sources.mjs`: load the new view-model module between selectors and template.
- Modify `scripts/test-app-sources.mjs`: enforce the new source order.
- Modify `scripts/test-profit-template.mjs`: cover view models, rendered hierarchy, disclosure states, and required styles.
- Modify `src/app/workbench/65-profit-template.js`: render the decision-first detail page and own UI-only state/actions.
- Modify `src/styles/modules/18-profit-template.css`: replace the equal-weight detail layout with the approved hierarchy and responsive rules.
- No change to `61-profit-domain.js`, `62-profit-repository.js`, or cloud API files unless a focused failing test proves an existing defect.

---

### Task 1: Pure Link-Profit Decision Models

**Files:**
- Create: `src/app/workbench/64-profit-view-models.js`
- Modify: `scripts/app-sources.mjs`
- Modify: `scripts/test-app-sources.mjs`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `profitNumber(value)`, `profitMoney(value)`, and the object returned by `selectListingProfitResult(repository, listingId, dateKey)`.
- Produces: `buildProfitListingDecisionModel(listingResult)`, `buildProfitTrendAvailability(sevenDay)`, `selectProfitFocusSkuRows(skuRows, limit = 3)`, `buildProfitLedgerRows(result)`, `profitExpenseDraftComplete(listing, draft)`.

- [ ] **Step 1: Write failing source-order and view-model tests**

Add `src/app/workbench/64-profit-view-models.js` to the required source list in `scripts/test-app-sources.mjs`, then load the file in `scripts/test-profit-template.mjs` between selector and UI source. Add the five new functions to the VM API and assert:

```js
const pendingDecision = api.buildProfitListingDecisionModel(actualListingResult);
assert.deepEqual(plain({
  key: pendingDecision.key,
  title: pendingDecision.title,
  action: pendingDecision.action,
  amountLabel: pendingDecision.amountLabel
}), {
  key: "expense_pending",
  title: "当前暂算盈利",
  action: { key: "complete_expenses", label: "补齐费用" },
  amountLabel: "暂算利润"
});

const trendAvailability = api.buildProfitTrendAvailability(actualListingResult.sevenDay);
assert.deepEqual(plain({
  mode: trendAvailability.mode,
  completeDayCount: trendAvailability.completeDayCount,
  comparisonAllowed: trendAvailability.comparisonAllowed
}), { mode: "insufficient", completeDayCount: 1, comparisonAllowed: false });

const focused = api.selectProfitFocusSkuRows(actualListingResult.skuRows, 3);
assert.equal(focused.length, 3);
assert.equal(focused[0].sku.code, "JZZ-PINK", "零销量异常必须先于健康高贡献 SKU");
assert.ok(focused.some((row) => row.sku.code === "JZZ-GREY"), "最高商品毛利 SKU 必须进入重点列表");

const ledger = api.buildProfitLedgerRows(actualListingResult.result);
assert.deepEqual(ledger.map((row) => row.key), [
  "gmv", "net_product_sales", "financial_difference", "platform_cost",
  "received", "product_cost", "internal_expenses", "profit"
]);
assert.equal(api.profitExpenseDraftComplete(actualListingResult.listing, actualListingResult.expense), false);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-app-sources.mjs && node scripts/test-profit-template.mjs`

Expected: FAIL because `64-profit-view-models.js` and its exported global functions do not exist.

- [ ] **Step 3: Implement the minimal pure view-model module**

Create `64-profit-view-models.js` with these decision rules and exact action priority:

```js
function buildProfitTrendAvailability(sevenDay = {}) {
  const days = Array.isArray(sevenDay.days) ? sevenDay.days : [];
  const completeDays = days.filter((day) => profitNumber(day?.result?.completedSkuCount) > 0);
  const completeDayCount = completeDays.length;
  const mode = completeDayCount === 0
    ? "empty"
    : completeDayCount <= 2
      ? "insufficient"
      : completeDayCount < 7 ? "partial" : "complete";
  return { mode, completeDayCount, comparisonAllowed: completeDayCount === 7, days, completeDays };
}

function profitExpenseDraftComplete(listing = {}, draft = {}) {
  const sampleTypes = Array.isArray(listing.sampleTypes) ? listing.sampleTypes : [];
  const samplesComplete = sampleTypes.every((sample) => draft.sampleQuantities?.[sample.id] !== null
    && draft.sampleQuantities?.[sample.id] !== undefined
    && draft.sampleQuantities?.[sample.id] !== "");
  return samplesComplete
    && draft.advertisingSpend !== null && draft.advertisingSpend !== undefined && draft.advertisingSpend !== ""
    && draft.adjustments !== null && draft.adjustments !== undefined && draft.adjustments !== "";
}
```

Implement the decision model with the exact action priority and return contract:

```js
function buildProfitListingDecisionModel(listingResult = {}) {
  const result = listingResult.result || {};
  const amount = profitNumber(result.finalProfit);
  const reconciliationDifference = Math.abs(profitNumber(result.reconciliationDifference));
  let state = {
    key: "healthy", tone: "healthy", title: "当前经营盈利",
    summary: "数据已完整，可继续查看经营建议。",
    action: { key: "view_recommendations", label: "查看经营建议" }
  };
  if (profitNumber(result.pendingSkuCount) > 0) {
    state = { key: "pending", tone: "pending", title: "今日数据待同步", summary: "当前数据不足以形成今日利润判断。", action: { key: "view_sync", label: "查看同步状态" } };
  } else if (reconciliationDifference >= 0.01) {
    state = { key: "reconciliation", tone: "warning", title: "链接与 SKU 汇总待核对", summary: "链接汇总与 SKU 汇总存在差异。", action: { key: "review_reconciliation", label: "核对汇总差异" } };
  } else if (result.profitCompleteness === "provisional") {
    state = { key: "expense_pending", tone: "warning", title: `当前暂算${amount < 0 ? "亏损" : "盈利"}`, summary: "平台已结算；补齐广告、样品和调整后才能确认最终利润。", action: { key: "complete_expenses", label: "补齐费用" } };
  } else if (amount < 0) {
    state = { key: "loss", tone: "critical", title: "当前经营亏损", summary: "优先检查最大成本项和低商品毛利 SKU。", action: { key: "view_profit_drag", label: "查看利润拖累" } };
  } else if (profitNumber(result.contributionMargin) < 0.08) {
    state = { key: "low_margin", tone: "warning", title: "当前利润偏低", summary: "利润率低于 8% 经营阈值。", action: { key: "view_opportunities", label: "查看改善机会" } };
  }
  const averageTransactionPrice = profitNumber(result.itemsSold) > 0
    ? profitMoney(profitNumber(result.gmv) / profitNumber(result.itemsSold))
    : null;
  return {
    ...state,
    amount,
    amountLabel: result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润",
    margin: result.contributionMargin,
    receivedAmount: result.receivedAmount,
    auxiliaryMetrics: [
      { key: "gmv", label: "经营 GMV", value: result.gmv },
      { key: "average_price", label: "成交均价", value: averageTransactionPrice },
      { key: "units", label: "销量", value: result.itemsSold },
      { key: "product_cost", label: "产品成本", value: result.productCostTotal }
    ]
  };
}
```

Implement focus-SKU selection with stable de-duplication and no fabricated SKU final profit:

```js
function selectProfitFocusSkuRows(skuRows = [], limit = 3) {
  const active = skuRows.filter((row) => row?.listingSku?.active);
  const gross = (row) => profitNumber(row?.result?.skuGrossProfit);
  const units = (row) => profitNumber(row?.result?.itemsSold);
  const withSignal = (row, signal, priority) => ({ ...row, focusSignal: signal, focusPriority: priority });
  const pending = active.filter((row) => !row.result?.completed).map((row) => withSignal(row, "数据待同步", 0));
  const losses = active.filter((row) => row.result?.completed && gross(row) < 0)
    .sort((a, b) => gross(a) - gross(b)).map((row) => withSignal(row, "商品毛利亏损", 1));
  const zeroSales = active.filter((row) => row.result?.completed && units(row) === 0)
    .map((row) => withSignal(row, "零销量", 2));
  const positive = active.filter((row) => row.result?.completed && units(row) > 0 && gross(row) >= 0);
  const lowest = [...positive].sort((a, b) => gross(a) - gross(b)).slice(0, 1)
    .map((row) => withSignal(row, "低商品毛利", 3));
  const leaders = [...positive].sort((a, b) => gross(b) - gross(a))
    .map((row) => withSignal(row, "主要贡献", 4));
  const output = [];
  const seen = new Set();
  [...pending, ...losses, ...zeroSales, ...lowest, ...leaders].forEach((row) => {
    if (output.length >= limit || seen.has(row.listingSku.id)) return;
    seen.add(row.listingSku.id);
    output.push(row);
  });
  return output;
}
```

Implement ledger visibility centrally:

```js
function buildProfitLedgerRows(result = {}) {
  const rows = [{ key: "gmv", label: "经营 GMV", detail: "Product Analytics", value: profitNumber(result.gmv), kind: "income" }];
  if (Math.abs(profitNumber(result.financialReconciliationDifference)) >= 0.01) {
    rows.push(
      { key: "net_product_sales", label: "平台确认销售额", detail: "Earnings Analytics", value: profitNumber(result.netProductSales), kind: "subtotal" },
      { key: "financial_difference", label: "经营与财务口径差异", detail: "待核对", value: profitNumber(result.financialReconciliationDifference), kind: "warning" }
    );
  }
  rows.push(
    { key: "platform_cost", label: "平台订单成本", detail: "运费及平台各项费用", value: -profitNumber(result.platformFees) - profitNumber(result.shippingFee), kind: "deduction" },
    { key: "received", label: result.profitStatus === "settled" ? "实际到手" : "预估到手", detail: "", value: profitNumber(result.receivedAmount), kind: "subtotal" },
    { key: "product_cost", label: "产品成本", detail: "", value: -profitNumber(result.productCostTotal), kind: "deduction" },
    { key: "internal_expenses", label: "广告、样品及调整", detail: "", value: result.profitCompleteness === "provisional" ? null : -profitNumber(result.knownInternalExpenses), kind: result.profitCompleteness === "provisional" ? "pending" : "deduction" },
    { key: "profit", label: result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润", detail: "", value: profitNumber(result.finalProfit), kind: profitNumber(result.finalProfit) < 0 ? "loss" : "result" }
  );
  return rows;
}
```

- [ ] **Step 4: Register the module in the production bundle**

Insert the new file after selectors and before the template:

```js
"src/app/workbench/63-profit-selectors.js",
"src/app/workbench/64-profit-view-models.js",
"src/app/workbench/65-profit-template.js",
```

Update `scripts/test-app-sources.mjs` to assert the same ordering.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node scripts/test-app-sources.mjs && node scripts/test-profit-template.mjs`

Expected: PASS with the existing profit-domain assertions and the new decision-model assertions.

- [ ] **Step 6: Commit the model boundary**

```bash
git add src/app/workbench/64-profit-view-models.js scripts/app-sources.mjs scripts/test-app-sources.mjs scripts/test-profit-template.mjs
git commit -m "refactor: add link profit decision models"
```

---

### Task 2: Decision-First Context and Profit Conclusion

**Files:**
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `buildProfitListingDecisionModel(listingResult)` and the existing `profitUiMoney`, `profitUiPercent`, `profitLifecycleLabel` helpers.
- Produces: `renderProfitListingContext(state, listingResult)`, `renderProfitDecisionCard(state, listingResult, decision)`, DOM hooks `[data-profit-primary-action]`, `[data-profit-open-management]`.

- [ ] **Step 1: Write failing hierarchy tests**

Replace the current equal-KPI expectations with:

```js
const decisionHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
assert.match(decisionHtml, /class="profit-listing-toolbar"/);
assert.match(decisionHtml, /class="profit-decision-card expense_pending"/);
assert.match(decisionHtml, /当前暂算盈利/);
assert.match(decisionHtml, />补齐费用</);
assert.match(decisionHtml, /数据完整度/);
assert.match(decisionHtml, /经营 GMV[\s\S]*成交均价[\s\S]*销量[\s\S]*产品成本/);
assert.doesNotMatch(decisionHtml, /class="profit-summary-band listing-summary"/);
assert.equal((decisionHtml.match(/data-profit-primary-action/g) || []).length, 1);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the listing toolbar and decision card do not exist and the old five-metric band still renders.

- [ ] **Step 3: Add focused render functions**

Extract the current breadcrumb and listing context into `renderProfitListingContext`. Render a compact toolbar with the breadcrumb and date control in the same horizontal region, followed by one entity row containing product code, listing name, store, owner, lifecycle, product link, and settings.

Implement `renderProfitDecisionCard` with this structure:

```html
<section class="profit-decision-card expense_pending" aria-labelledby="profitDecisionTitle">
  <div class="profit-decision-main">
    <span class="profit-decision-status">费用待补</span>
    <h2 id="profitDecisionTitle">当前暂算盈利</h2>
    <strong>$163.47</strong>
    <p>平台已结算；补齐广告、样品和调整后才能确认最终利润。</p>
  </div>
  <div class="profit-decision-facts" aria-label="利润判断依据">…</div>
  <button data-profit-primary-action="complete_expenses" type="button">补齐费用</button>
  <dl class="profit-decision-metrics">…</dl>
</section>
```

Use only the decision model for title, tone, amount, summary, and action. Render GMV, average transaction price, units, and product cost in the compact `dl`; do not reintroduce separate KPI cards.

- [ ] **Step 4: Replace the old listing header and KPI band**

In `renderProfitListingDetail`, replace the breadcrumb, large context card, and `.profit-summary-band.listing-summary` with `renderProfitListingContext(...)` and `renderProfitDecisionCard(...)`. Keep product link, lifecycle, manager access, date changes, and all existing data.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS; one decision card is present and the five-card summary band is absent.

- [ ] **Step 6: Commit the decision hierarchy**

```bash
git add src/app/workbench/65-profit-template.js scripts/test-profit-template.mjs
git commit -m "feat: prioritize link profit decisions"
```

---

### Task 3: Profit Causes, Focus SKUs, and Conditional Trend

**Files:**
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `buildProfitLedgerRows(result)`, `selectProfitFocusSkuRows(skuRows, 3)`, `buildProfitTrendAvailability(sevenDay)`.
- Produces: `renderProfitCauseGrid(state, listingResult)`, `renderProfitFocusSkuTable(state, listingResult)`, `renderProfitTrendEvidence(state, listingResult)`, state booleans `allSkusExpanded` and `trendExpanded`.

- [ ] **Step 1: Write failing disclosure tests**

Add state/action expectations:

```js
assert.equal(actualWorkspace.allSkusExpanded, false);
assert.equal(actualWorkspace.trendExpanded, false);

let detailHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
assert.match(detailHtml, /class="profit-cause-grid"/);
assert.match(detailHtml, /class="profit-focus-sku-table"/);
assert.match(detailHtml, /数据不足，暂不形成趋势判断/);
assert.doesNotMatch(detailHtml, /class="profit-trend-plot"/);
assert.equal((detailHtml.match(/class="profit-focus-sku-row/g) || []).length, 3);

assert.equal(api.applyProfitWorkspaceAction(actualWorkspace, { type: "toggleAllSkus" }), true);
assert.equal(actualWorkspace.allSkusExpanded, true);
detailHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
assert.match(detailHtml, /class="profit-all-sku-panel"/);
```

Create a seven-complete-day fixture and assert that its collapsed view contains a trend summary and `[data-profit-toggle-trend]`, while the expanded state contains exactly seven date positions and the chart.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because focus-SKU and conditional-trend disclosure do not exist.

- [ ] **Step 3: Replace the old equal two-column decision row**

Remove `renderProfitDecisionRow`. Add `renderProfitCauseGrid` with 40% profit ledger and 60% focus SKU table. Render ledger rows from `buildProfitLedgerRows`; do not hard-code visibility decisions in the template.

Focus SKU default columns are exactly: SKU/规格, 成交均价, 销量, SKU商品毛利, 经营信号. Render no more than three rows and one `查看全部 N 个 SKU` button.

- [ ] **Step 4: Move the complete SKU table behind disclosure**

Preserve the current complete desktop table, mobile SKU cards, individual SKU trend controls, inactive-SKU strip, and row calculations. Wrap them in `.profit-all-sku-panel` and render only when `state.allSkusExpanded` is true. Add `toggleAllSkus` to `applyProfitWorkspaceAction`.

- [ ] **Step 5: Implement conditional trend evidence**

Render by `availability.mode`:

```js
if (availability.mode === "empty") return renderProfitTrendState("等待店铺数据同步", "暂无可用于趋势判断的完整经营日");
if (availability.mode === "insufficient") return renderProfitTrendState(
  `${availability.completeDayCount}/7 天已同步`,
  "数据不足，暂不形成趋势判断"
);
```

For `partial`, render a compact text/spark summary with “周期未完整” and no comparison claim. For `complete`, render a compact summary and `展开完整趋势`; only call `renderProfitTrendChart` when `state.trendExpanded` is true. Add `toggleTrend` to the action reducer.

- [ ] **Step 6: Reset disclosure state when changing listing**

When `openListing` succeeds, set `allSkusExpanded = false`, `trendExpanded = false`, and clear `expandedSkuIds`. This prevents one link’s expanded state leaking into another.

- [ ] **Step 7: Run focused tests and verify GREEN**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS; the real one-day sample contains no large empty chart, and the complete fixture can expand a seven-day chart.

- [ ] **Step 8: Commit cause and evidence disclosure**

```bash
git add src/app/workbench/65-profit-template.js scripts/test-profit-template.mjs
git commit -m "feat: simplify link profit evidence"
```

---

### Task 4: Explicit Expense Completion Drawer

**Files:**
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `profitExpenseDraftComplete(listing, draft)`, `calculateListingContribution(facts, expense, settlement)`, repository `updateDailyExpense(listingId, dateKey, patch)`.
- Produces: `renderProfitExpenseDrawer(state, listingResult)`, actions `openExpenseDrawer`, `closeExpenseDrawer`, `updateExpenseDraft`, `saveExpenseDraft`; state fields `expenseDrawerOpen`, `expenseDraft`, `expenseError`.

- [ ] **Step 1: Write failing drawer and persistence tests**

Add:

```js
assert.equal(api.applyProfitWorkspaceAction(actualWorkspace, { type: "openExpenseDrawer" }), true);
assert.equal(actualWorkspace.expenseDrawerOpen, true);
let drawerHtml = api.renderProfitListingDetail(actualWorkspace, "listing-jzz-main");
assert.match(drawerHtml, /role="dialog"/);
assert.match(drawerHtml, /aria-modal="true"/);
assert.match(drawerHtml, /保存并确认最终利润/);
assert.match(drawerHtml, /补录后利润预览/);

const beforeExpense = actualWorkspace.repository.getDailyExpense("listing-jzz-main", "2026-08-03");
api.applyProfitWorkspaceAction(actualWorkspace, { type: "updateExpenseDraft", field: "advertisingSpend", value: 10 });
assert.equal(actualWorkspace.repository.getDailyExpense("listing-jzz-main", "2026-08-03").advertisingSpend, beforeExpense.advertisingSpend,
  "编辑草稿不得提前写入真实费用");
```

Complete all draft fields with explicit zeroes, call `saveExpenseDraft`, and assert repository completeness becomes `complete`, drawer closes, and the decision changes from `expense_pending` to a final-profit state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because expense drawer state/actions do not exist and the current inline fields persist immediately.

- [ ] **Step 3: Add expense draft state and pure action handling**

Initialize:

```js
expenseDrawerOpen: false,
expenseDraft: null,
expenseError: ""
```

`openExpenseDrawer` clones `listingResult.expense`; `updateExpenseDraft` updates only `state.expenseDraft`; `closeExpenseDrawer` clears the draft without repository writes. Implement the action branch as:

```js
if (action.type === "openExpenseDrawer") {
  const row = selectListingProfitResult(state.repository, state.activeListingId, state.activeDate);
  if (!row) return false;
  state.expenseDrawerOpen = true;
  state.expenseDraft = JSON.parse(JSON.stringify(row.expense));
  state.expenseError = "";
  return true;
}
if (action.type === "updateExpenseDraft" && state.expenseDrawerOpen) {
  if (action.sampleTypeId) {
    state.expenseDraft.sampleQuantities = { ...state.expenseDraft.sampleQuantities, [action.sampleTypeId]: action.value };
  } else state.expenseDraft[action.field] = action.value;
  return true;
}
if (action.type === "closeExpenseDrawer") {
  state.expenseDrawerOpen = false;
  state.expenseDraft = null;
  state.expenseError = "";
  return true;
}
if (action.type === "saveExpenseDraft") {
  const listing = state.repository.getListing(state.activeListingId);
  if (!listing || !profitExpenseDraftComplete(listing, state.expenseDraft)) {
    state.expenseError = "请填写全部费用；确实无费用时填写 0";
    return false;
  }
  state.repository.updateDailyExpense(state.activeListingId, state.activeDate, state.expenseDraft);
  state.expenseDrawerOpen = false;
  state.expenseDraft = null;
  state.expenseError = "";
  return true;
}
```

- [ ] **Step 4: Replace the inline expense section with an accessible drawer**

Remove `.profit-expense-section` from the normal document flow. Render a right-side layer only when open:

```html
<div class="profit-expense-layer">
  <button class="profit-drawer-overlay" aria-label="关闭费用补录"></button>
  <aside class="profit-expense-drawer" role="dialog" aria-modal="true" aria-labelledby="profitExpenseTitle">
    <header>…</header>
    <form>…</form>
  </aside>
</div>
```

Keep visible labels, blank placeholders, sample unit costs, advertising spend, adjustments, error region, preview, cancel, and save. Use a single-column form.

- [ ] **Step 5: Bind the primary action and draft form without full-page reloads**

Map `data-profit-primary-action="complete_expenses"` to `openExpenseDrawer`. Use delegated `input` events to update the in-memory draft and the preview amount; do not call the repository until save. On save, call the action reducer, render the profit detail once, show the existing success toast, and restore focus to the primary-action button when available.

Add Escape handling only while an expense or management drawer is open. Overlay and close button discard an unsaved draft. Do not alter the existing add-link, add-SKU, lifecycle, or price-observation dialogs.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node scripts/test-profit-template.mjs && node scripts/test-profit-persistence.mjs`

Expected: PASS; drafts do not persist before save, explicit zeroes complete the record, and existing cloud-state serialization remains unchanged.

- [ ] **Step 7: Commit explicit expense completion**

```bash
git add src/app/workbench/65-profit-template.js scripts/test-profit-template.mjs
git commit -m "feat: add explicit profit expense drawer"
```

---

### Task 5: Visual System and Responsive Decision Layout

**Files:**
- Modify: `src/styles/modules/18-profit-template.css`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: the semantic classes produced by Tasks 2–4.
- Produces: desktop, tablet, 390px, and approximately 320px layouts without whole-page horizontal overflow.

- [ ] **Step 1: Write failing structural CSS assertions**

Assert required selectors and rules:

```js
for (const selector of [
  ".profit-listing-toolbar",
  ".profit-decision-card",
  ".profit-decision-metrics",
  ".profit-cause-grid",
  ".profit-focus-sku-table",
  ".profit-trend-evidence",
  ".profit-expense-drawer"
]) assert.match(profitStyles, new RegExp(selector.replace(".", "\\.")));

assert.match(profitStyles, /\.profit-cause-grid\s*\{[^}]*grid-template-columns:\s*minmax\(280px,\s*2fr\) minmax\(0,\s*3fr\)/s);
assert.match(profitStyles, /\.profit-decision-main\s+strong\s*\{[^}]*font-size:\s*clamp\(32px,/s);
assert.match(profitStyles, /@media \(max-width: 900px\)[\s\S]*?\.profit-cause-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
assert.match(profitStyles, /@media \(max-width: 640px\)[\s\S]*?\.profit-expense-drawer\s*\{[^}]*width:\s*100%/s);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the approved semantic layout has no styles.

- [ ] **Step 3: Implement desktop hierarchy**

Use existing profit color tokens. Style one prominent decision card with a neutral surface and a single deep-green result/action moment; use amber for provisional/incomplete and red only for loss. Use `clamp(32px, 3vw, 36px)` for the main amount, 14px body text, and 12px labels.

Define `.profit-cause-grid` as `minmax(280px, 2fr) minmax(0, 3fr)`. Use one border without an additional shadow on nested cause panels. Right-align numeric table columns and keep 48–52px rows. All visible desktop buttons are at least 36px tall with clear hover, active, focus-visible, loading, and disabled states.

- [ ] **Step 4: Implement tablet and mobile behavior**

At 900px, stack the cause grid and use two columns for auxiliary decision metrics. At 640px, switch to one column in order: conclusion, action, ledger, focus SKU, trend, secondary links. Use mobile focus-SKU cards instead of compressing the table. Set drawers to full width and all touch actions to at least 44px.

At 420px and approximately 320px, allow long product names to wrap naturally, keep action labels whole, and ensure only `.profit-all-sku-panel` can scroll horizontally. Apply `min-width: 0`, `overflow-wrap: anywhere` only to long identifiers/URLs, and never to buttons or amounts.

- [ ] **Step 5: Remove obsolete detail-only style rules**

Delete or consolidate rules whose elements were removed: `.profit-summary-band.listing-summary`, default `.profit-decision-grid`, and the normal-flow `.profit-expense-section` detail layout. Retain rules still used by product overview/product detail, management drawer, dialogs, and expanded SKU history.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node scripts/test-profit-template.mjs && node scripts/test-workbench-ui-integrity.mjs`

Expected: PASS with required semantic styles, breakpoints, table alignment, and no deleted selectors still required elsewhere.

- [ ] **Step 7: Commit the responsive visual system**

```bash
git add src/styles/modules/18-profit-template.css scripts/test-profit-template.mjs
git commit -m "style: refine link profit decision page"
```

---

### Task 6: Full Regression, Real Data, and Browser Verification

**Files:**
- Verify: `src/app/workbench/64-profit-view-models.js`
- Verify: `src/app/workbench/65-profit-template.js`
- Verify: `src/styles/modules/18-profit-template.css`
- Verify: `scripts/test-profit-template.mjs`
- Verify: generated `dist/` only through the build command.

**Interfaces:**
- Consumes: all outputs from Tasks 1–5.
- Produces: a locally verified release candidate; no production deployment is included in this task.

- [ ] **Step 1: Run syntax and focused profit checks**

Run:

```bash
node --check src/app/workbench/64-profit-view-models.js
node --check src/app/workbench/65-profit-template.js
node scripts/test-profit-template.mjs
node scripts/test-profit-persistence.mjs
```

Expected: all commands exit 0; profit tests report the decision-first phase and persistence remains compatible.

- [ ] **Step 2: Run the complete project check**

Run: `npm run check`

Expected: all source, boundary, cloud state, auth, overview, report, task, creator, profit, and persistence checks pass.

- [ ] **Step 3: Build the local release**

Run: `npm run build && npm run build:functions && git diff --check`

Expected: source and Functions builds complete; `git diff --check` prints nothing.

- [ ] **Step 4: Verify the real desktop flow in the browser**

Start the existing local supervisor, sign in with the already configured local account, then click:

1. 利润与成本。
2. 链接利润。
3. JZZ 产品。
4. UFIST link.
5. 补齐费用, cancel, reopen, enter explicit zeroes, and save only against disposable local state; do not change cloud production data.
6. 查看全部 6 个 SKU, individual SKU trend, link settings, close controls, breadcrumb returns, and date filter.

At 1440×900 verify that conclusion, primary action, ledger, and focus SKUs are visible without the old large empty trend. Confirm the real one-day sample says `1/7 天已同步` and contains no trend plot.

- [ ] **Step 5: Verify responsive and long-data states**

Check 900px, 640px, 390px, and approximately 320px. Confirm no whole-page horizontal overflow, complete button labels, readable product names, 44px mobile actions, drawer width, mobile focus-SKU cards, and internal-only scrolling for the expanded full table.

Use local disposable fixtures to verify: no complete days, one day, three days, seven days, ten-plus SKUs, zero-sales SKU, loss, low margin, reconciliation difference, provisional expenses, complete expenses, and inactive listing. Do not seed or overwrite cloud state.

- [ ] **Step 6: Verify console and cloud-state safety**

Confirm no new console warnings/errors through overview → profit → product → listing → back navigation. Compare the pre- and post-test cloud collection counts and revision when running the project predeploy readiness check; reports, tasks, roles, stores, and profit collections must remain unchanged unless the local disposable fixture is in use.

- [ ] **Step 7: Commit any verification-only fixes**

If browser verification required source fixes, rerun Steps 1–6 and commit only those focused files:

```bash
git add src/app/workbench/64-profit-view-models.js src/app/workbench/65-profit-template.js src/styles/modules/18-profit-template.css scripts/test-profit-template.mjs scripts/app-sources.mjs scripts/test-app-sources.mjs
git commit -m "fix: complete link profit decision regression"
```

If no fixes were required, do not create an empty commit.
