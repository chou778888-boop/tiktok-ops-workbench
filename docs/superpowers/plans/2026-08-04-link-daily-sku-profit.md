# 链接级每日 SKU 利润模板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有利润中心演示模板改造成按商品链接填写每日 SKU 售价和销量、展示近 7 天趋势并自动汇总链接净利润的可交互模板。

**Architecture:** 继续使用独立的 `65-profit-template.js` 内存模块，不接入正式状态或网络。数据模型改为“链接 → SKU 档案与寄样类型 → 每日 SKU 数据与链接级费用”，计算函数保持纯函数，DOM 渲染和事件委托在同一模块下半部分；样式继续由独立 CSS 模块负责。

**Tech Stack:** 原生 HTML、CSS、JavaScript，Node.js `assert` + `vm` 静态/纯函数测试，现有 Cloudflare Pages 构建脚本。

## Global Constraints

- 所有设计先从整个工作台的信息架构、业务闭环和长期影响做客观分析，不机械照搬局部话术。
- 所有交互以团队实际使用方便、减少步骤和提高效率为前提；排版精美整齐，不出现孤字、缺字或不合理换行，表格上下左右正确对齐。
- 所有代码保持模块边界清晰、命名一致、纯函数可测试并方便持续调整优化。
- 用户意图、业务口径或全局影响存在会改变方案的歧义时，先逐个确认关键问题，真正理解后再实施。
- 本轮是演示模板：不调用 `saveState()`、`fetch()`、`localStorage`、`sessionStorage` 或 D1。
- 不导入《利润 new.xlsx》数据；只复用其业务结构和计算口径。
- 示例链接固定覆盖 JZZ、JDZ、NHZ、YG、ZG、YT，并生成最近 30 天虚拟数据。
- 主视图默认展示当前选择日期及前 6 天；更早记录默认收起。
- SKU 利润公式为 `销量 × [售价 × (1 - 佣金率) - 单位成本]`。
- 链接净利润为 `SKU 商品毛利润合计 - 寄样金额 - 广告营销费 - 调整费用`。
- SKU 停用保留历史，不执行硬删除。
- 新增链接、新增 SKU、编辑每日数据和费用只在当前页面内存生效，刷新恢复演示数据。
- 不改变成本测算现有三个子页签、构建清单顺序或正式经营状态。

---

## File Structure

- `src/app/workbench/65-profit-template.js`：演示数据工厂、日期工具、利润计算、运营信号、页面状态、HTML 渲染和事件绑定。
- `src/styles/modules/18-profit-template.css`：链接日报、7 天矩阵、结算条、全链接一览、管理抽屉和移动端卡片样式。
- `index.html`：将顶部“成本测算”命名为“利润与成本”，把“链接利润”设为该模块首个默认页签，保留利润模板挂载点和两个表单，并给 SKU 表单补充可选寄样成本字段。
- `scripts/test-profit-template.mjs`：纯函数、隔离约束、HTML 契约、CSS 响应式和模块清单测试。

### Task 1: 建立链接日报数据模型与利润计算

**Files:**
- Modify: `scripts/test-profit-template.mjs:1-121`
- Modify: `src/app/workbench/65-profit-template.js:1-121`

**Interfaces:**
- Produces: `createProfitTemplateData(anchorDate?: string): Listing[]`
- Produces: `profitTemplateVisibleDates(anchorDate: string, count?: number): string[]`
- Produces: `calculateProfitTemplateSkuDay(sku: Sku, dateKey: string): SkuDayResult`
- Produces: `calculateProfitTemplateListingDay(listing: Listing, dateKey: string): ListingDayResult`
- `Listing.daily[dateKey]` contains `{ sampleQuantities, marketingSpend, adjustments }`.
- `Sku.daily[dateKey]` contains `{ units, price }`.

- [ ] **Step 1: Replace the old SKU-level test fixture with a link-day fixture**

Add these assertions before changing production code:

```js
const listing = {
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
  plain(production.calculateProfitTemplateSkuDay(listing.skus[0], "2026-08-04")),
  { units: 10, price: 20, gmv: 200, unitProfit: 4, grossProfit: 40 },
  "SKU 日利润必须由当日售价、销量和档案成本计算"
);
assert.deepEqual(
  plain(production.calculateProfitTemplateListingDay(listing, "2026-08-04")),
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
```

- [ ] **Step 2: Run the focused test and confirm the new API fails**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because `calculateProfitTemplateSkuDay` and `calculateProfitTemplateListingDay` do not exist.

- [ ] **Step 3: Implement the date helpers and pure calculation functions**

Use this shape and keep all numeric normalization inside the module:

```js
function profitTemplateVisibleDates(anchorDate, count = 7) {
  const anchor = new Date(`${anchorDate}T12:00:00`);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor);
    date.setDate(anchor.getDate() - (count - index - 1));
    return date.toISOString().slice(0, 10);
  });
}

function calculateProfitTemplateSkuDay(sku, dateKey) {
  const record = sku?.daily?.[dateKey] || {};
  const units = profitTemplateNumber(record.units);
  const price = profitTemplateNumber(record.price);
  const unitProfit = price * (1 - profitTemplateNumber(sku?.commissionRate) / 100)
    - profitTemplateNumber(sku?.cost);
  return { units, price, gmv: units * price, unitProfit, grossProfit: units * unitProfit };
}

function calculateProfitTemplateListingDay(listing, dateKey) {
  const daily = listing?.daily?.[dateKey] || {};
  const summary = { units: 0, gmv: 0, grossProfit: 0 };
  (listing?.skus || []).filter((sku) => sku.active).forEach((sku) => {
    const result = calculateProfitTemplateSkuDay(sku, dateKey);
    summary.units += result.units;
    summary.gmv += result.gmv;
    summary.grossProfit += result.grossProfit;
  });
  const sampleCost = (listing?.sampleTypes || []).reduce((sum, sample) => (
    sum + profitTemplateNumber(daily.sampleQuantities?.[sample.id]) * profitTemplateNumber(sample.unitCost)
  ), 0);
  const marketingSpend = profitTemplateNumber(daily.marketingSpend);
  const adjustments = profitTemplateNumber(daily.adjustments);
  const netProfit = summary.grossProfit - sampleCost - marketingSpend - adjustments;
  return { ...summary, sampleCost, marketingSpend, adjustments, netProfit, margin: summary.gmv ? netProfit / summary.gmv : 0 };
}
```

- [ ] **Step 4: Replace the demo factory with six workbook-shaped links**

Create JZZ, JDZ, NHZ, YG, ZG and YT fixtures. Each listing must have `sampleTypes`, SKU-level `cost` and `commissionRate`, 30 daily `{ units, price }` records, and 30 listing-level expense records. Use deterministic arithmetic based on link/SKU/day indexes so tests and screenshots remain stable.

- [ ] **Step 5: Run the focused test**

Run: `node scripts/test-profit-template.mjs`

Expected: calculation, date-window and six-link fixture assertions PASS.

- [ ] **Step 6: Commit the data model**

```bash
git add scripts/test-profit-template.mjs src/app/workbench/65-profit-template.js
git commit -m "feat: model daily profit by listing and sku"
```

### Task 2: 实现每日录入、7 天趋势与运营提示

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/app/workbench/65-profit-template.js`

**Interfaces:**
- Consumes: Task 1 `Listing`, `Sku`, `profitTemplateVisibleDates`, and calculation functions.
- Produces: `updateProfitTemplateDailyInput(listing, change): boolean`
- Produces: `profitTemplatePriceDelta(sku, dateKey, previousDateKey): number | null`
- Produces: `profitTemplateOperationalSignals(listing, visibleDates): Signal[]`
- Produces DOM hooks: `[data-profit-daily-input]`, `[data-profit-date]`, `[data-profit-history-toggle]`.

- [ ] **Step 1: Add failing tests for memory edits and trend comparison**

```js
assert.equal(production.updateProfitTemplateDailyInput(listing, {
  kind: "sku",
  skuId: "sku-a",
  dateKey: "2026-08-04",
  field: "price",
  value: "21.50"
}), true);
assert.equal(listing.skus[0].daily["2026-08-04"].price, 21.5);
assert.equal(production.updateProfitTemplateDailyInput(listing, {
  kind: "listing",
  dateKey: "2026-08-04",
  field: "marketingSpend",
  value: "12"
}), true);
assert.equal(listing.daily["2026-08-04"].marketingSpend, 12);
assert.equal(production.profitTemplatePriceDelta({
  daily: {
    "2026-08-03": { price: 20 },
    "2026-08-04": { price: 18 }
  }
}, "2026-08-04", "2026-08-03"), -0.1);
```

Also assert that the source contains `data-profit-daily-input`, `data-profit-history-toggle`, “降价未带来销量提升” and “关注价格敏感度”.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL on the missing edit and trend helpers.

- [ ] **Step 3: Implement safe in-memory updates**

`updateProfitTemplateDailyInput` must create a missing daily record, accept only `units`, `price`, `marketingSpend`, `adjustments` or a known sample type quantity, clamp negative numeric input to `0`, and return `false` for unknown IDs or fields.

- [ ] **Step 4: Implement daily page state and rendering**

Replace the global card/grid screen with state shaped as:

```js
let profitTemplateState = {
  listings: createProfitTemplateData(),
  activeListingId: null,
  activeDate: "2026-08-04",
  view: "daily",
  historyExpanded: false,
  managementOpen: false
};
profitTemplateState.activeListingId = profitTemplateState.listings[0]?.id || null;
```

Render, in order: view switcher, link/date control bar, seven KPI cards, 7-day SKU matrix, link settlement strip, operational signals and collapsed history. Each SKU row must freeze the identity column; each day cell must stack “售价” over “销量”; only the selected date uses inputs.

- [ ] **Step 5: Bind delegated input and navigation events**

Use `input` events for price, units, sample quantity, marketing spend and adjustments so summary values update immediately. Use `change` for link/date selectors. Preserve the active link/date after rerender and never call persistence APIs.

- [ ] **Step 6: Run the focused test**

Run: `node scripts/test-profit-template.mjs`

Expected: memory edit, trend helper, static DOM contract and isolation tests PASS.

- [ ] **Step 7: Commit the daily workflow**

```bash
git add scripts/test-profit-template.mjs src/app/workbench/65-profit-template.js
git commit -m "feat: add seven day listing profit workflow"
```

### Task 3: 增加全链接一览与链接/SKU 管理抽屉

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `index.html:720-779`

**Interfaces:**
- Consumes: Task 1 calculation helpers and Task 2 state.
- Produces: `profitTemplateAllListingsSummary(listings, dateKey): AllListingsResult`
- Produces DOM hooks: `[data-profit-view]`, `[data-profit-manage]`, `.profit-management-drawer`, `[data-profit-toggle-sku]`.
- Extends SKU form with `sampleUnitCost`.

- [ ] **Step 1: Add failing all-link and management contract tests**

```js
const allSummary = production.profitTemplateAllListingsSummary([listing], "2026-08-04");
assert.equal(allSummary.units, 10);
assert.equal(allSummary.netProfit, 1);
assert.equal(allSummary.rows.length, 1);
assert.equal(allSummary.rows[0].listingId, "listing-a");
```

Add HTML/source assertions for “全链接一览”, `data-profit-view`, `profit-management-drawer`, and `name="sampleUnitCost"`.

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL on the missing all-list summary and management markup.

- [ ] **Step 3: Implement the all-link overview**

Aggregate the selected date into top totals and one row per active link with `units`, `gmv`, `grossProfit`, `sampleCost`, `marketingSpend`, `netProfit`, and `margin`. Clicking a row sets `activeListingId`, switches `view` to `daily`, and rerenders.

- [ ] **Step 4: Promote profit entry to the first view in the combined module**

Rename the top navigation label from “成本测算” to “利润与成本”. In the module header use “利润与成本工作台”, order the subtabs as “链接利润 / 成本档案 / 新 SKU 测算 / 测算历史”, and make `profit-template` the initial active pane when the user enters this module. Keep all existing costing pane IDs and behavior unchanged.

- [ ] **Step 5: Implement the management drawer**

Render a right-side drawer listing the active link metadata, sample types and all SKUs. Keep “新增商品链接” and “新增 SKU” connected to the existing dialogs. Move stop/restore controls into this drawer and preserve historical daily records when toggling a SKU.

- [ ] **Step 6: Extend SKU creation for sample cost**

Add the field:

```html
<label><span>寄样成本 ($，可选)</span><input name="sampleUnitCost" type="number" min="0" step="0.01" value="0" /></label>
```

When `sampleUnitCost > 0`, add a sample type `{ id, name: values.name, unitCost }` linked to the new SKU. New links begin with an empty SKU and sample-type list.

- [ ] **Step 7: Run the focused test**

Run: `node scripts/test-profit-template.mjs`

Expected: all-link aggregation, dialog validation, management and no-persistence assertions PASS.

- [ ] **Step 8: Commit overview and management**

```bash
git add index.html scripts/test-profit-template.mjs src/app/workbench/65-profit-template.js
git commit -m "feat: add profit overview and listing management"
```

### Task 4: 重做专业运营排版与响应式表现

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/styles/modules/18-profit-template.css:1-628`

**Interfaces:**
- Consumes: Tasks 2-3 DOM class names.
- Produces: stable desktop, tablet and mobile layout without page-level horizontal overflow.

- [ ] **Step 1: Replace old style assertions with new layout assertions**

Require these selectors: `.profit-control-bar`, `.profit-daily-kpis`, `.profit-seven-day-wrap`, `.profit-seven-day-grid`, `.profit-settlement-strip`, `.profit-history-panel`, `.profit-overview-table`, `.profit-management-drawer`, and `.profit-mobile-sku-card`.

Require the 7-day grid wrapper to own `overflow-x: auto`, the SKU identity column to use `position: sticky`, and responsive breakpoints at `1439px`, `899px`, `620px`, and `419px`.

- [ ] **Step 2: Run the focused test and verify style failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the old card-grid selectors remain.

- [ ] **Step 3: Replace the CSS module with the new visual hierarchy**

Use restrained neutral cards, emerald for positive profit, muted red for loss, blue for editable cells, and amber only for operational warnings. Keep the KPI area compact, make input affordances obvious, align all numeric values right, and use one independent horizontal scroll area for the matrix.

- [ ] **Step 4: Implement mobile cards**

At `max-width: 620px`, hide the desktop matrix and render `.profit-mobile-sku-card` blocks with the current-day inputs and a compact seven-day price/sales strip. Stack settlement inputs and drawer actions without shrinking touch targets below 40px.

- [ ] **Step 5: Run the focused test**

Run: `node scripts/test-profit-template.mjs`

Expected: all CSS contract and responsive assertions PASS.

- [ ] **Step 6: Commit the layout**

```bash
git add scripts/test-profit-template.mjs src/styles/modules/18-profit-template.css
git commit -m "style: redesign listing profit workspace"
```

### Task 5: 全量验证、构建和本地浏览器验收

**Files:**
- Verify: `package.json`
- Verify: `scripts/build-cloudflare.mjs`
- Verify: `src/app/workbench/65-profit-template.js`
- Verify: `src/styles/modules/18-profit-template.css`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: a passing Cloudflare build and a usable template at `http://127.0.0.1:8797/`.

- [ ] **Step 1: Run syntax and focused checks**

Run:

```bash
node --check src/app/workbench/65-profit-template.js
node scripts/test-profit-template.mjs
```

Expected: syntax check exits 0 and focused test prints the updated passing assertion count.

- [ ] **Step 2: Run the full project check**

Run: `npm run check`

Expected: all project, module-boundary, authentication, task, reporting and profit-template tests PASS.

- [ ] **Step 3: Build the Cloudflare bundle**

Run: `node scripts/build-cloudflare.mjs`

Expected: build completes and includes `65-profit-template.js` plus `18-profit-template.css`.

- [ ] **Step 4: Verify the local service**

Run:

```bash
launchctl print gui/$(id -u)/com.codex.tiktok-workbench-8797
curl -I http://127.0.0.1:8797/
```

Expected: launch agent state is `running` and HTTP status is `200`.

- [ ] **Step 5: Browser interaction checklist**

Open `http://127.0.0.1:8797/`, enter 成本测算 → 利润中心, and verify:

1. JZZ opens with all active SKUs and seven dates.
2. Editing the selected date's price or units immediately changes SKU and link profit.
3. Editing sample quantity or advertising/marketing expense changes link net profit.
4. Switching JDZ shows multiple sample types.
5. “查看更早记录” expands older demo history.
6. “全链接一览” shows six link rows and can navigate back to a link.
7. Management drawer can add a link, add a SKU, stop it and restore it.
8. Refresh restores demo data and does not change formal workbench state.
9. Desktop, tablet and mobile widths have no page-level horizontal overflow.

- [ ] **Step 6: Review the final diff without committing unrelated worktree changes**

Run: `git diff -- index.html scripts/test-profit-template.mjs src/app/workbench/65-profit-template.js src/styles/modules/18-profit-template.css`

Expected: diff contains only the approved profit-template redesign and the SKU form field; unrelated pre-existing dirty files remain untouched.
