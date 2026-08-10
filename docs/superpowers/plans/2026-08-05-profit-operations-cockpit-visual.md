# Profit Operations Cockpit Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the link-profit workspace into a professional operations cockpit, replace the seven-day number strip with a price-line-and-sales-bar chart, and remove the settlement card's global-style collision.

**Architecture:** Keep the existing domain model, repository, selectors, and four-level navigation unchanged. Add pure chart-model and chart-render helpers in the existing profit presentation module, consume existing seven-day result arrays, and keep all visual behavior scoped to the profit stylesheet with `profit-` class names.

**Tech Stack:** Vanilla JavaScript template rendering, semantic HTML, inline data-visualization SVG, modular CSS, Node VM regression tests, Cloudflare static build.

## Global Constraints

- Preserve the Product → Listings → Listing → SKU information architecture and all current profit formulas.
- Use the A “professional operations cockpit” direction: deep ink green, warm gray-white, restrained amber, and loss red.
- Price is a line; sales are bars; both share the same seven-day date axis.
- Do not add a frontend framework or a large chart dependency.
- All new module-specific class names must use the `profit-` prefix.
- Desktop 1440×900 and mobile 390×844 must have no page-level horizontal overflow.

---

### Task 1: Remove the settlement style collision

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `src/styles/modules/18-profit-template.css`

**Interfaces:**
- Consumes: `renderProfitListingDetail(state, listingId): string`
- Produces: settlement markup using `.profit-settlement-primary` and no generic `.primary` class inside `.profit-settlement-grid`

- [ ] **Step 1: Write the failing regression test**

```js
assert.match(listingHtml, /profit-settlement-primary/, "结算主指标必须使用模块专属类名");
assert.doesNotMatch(listingHtml, /profit-settlement-grid[\s\S]*?class="primary"/, "结算卡不得复用全局 primary 类");
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the current settlement markup still emits `class="primary"`.

- [ ] **Step 3: Apply the scoped class correction**

```js
`<div class="profit-settlement-primary">...</div>`
```

```css
.profit-settlement-grid .profit-settlement-primary { background: var(--profit-green-soft); }
.profit-settlement-grid .profit-settlement-primary b { color: var(--profit-green); }
```

- [ ] **Step 4: Run the focused test and verify pass**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS.

---

### Task 2: Add a reusable seven-day chart model and renderer

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/app/workbench/65-profit-template.js`

**Interfaces:**
- Consumes: `Array<{ dateKey: string, averageTransactionPrice: number|null, itemsSold: number|null, finalProfit?: number }>`
- Produces: `profitChartModel(points): { points, pricePath, minPrice, maxPrice, maxUnits, averagePrice, averageUnits, priceChange, unitChange }`
- Produces: `renderProfitTrendChart(points, options?): string`

- [ ] **Step 1: Add failing pure-function tests**

Expose `profitChartModel` and `renderProfitTrendChart` from the VM test API, then add:

```js
const chartModel = api.profitChartModel([
  { dateKey: "2026-08-01", averageTransactionPrice: 18, itemsSold: 10 },
  { dateKey: "2026-08-02", averageTransactionPrice: 20, itemsSold: 20 },
  { dateKey: "2026-08-03", averageTransactionPrice: null, itemsSold: null }
]);
assert.equal(chartModel.points.length, 3);
assert.equal(chartModel.maxUnits, 20);
assert.equal(chartModel.averagePrice, 19);
assert.match(chartModel.pricePath, /^M /);

const chartHtml = api.renderProfitTrendChart(chartModel.points, { title: "测试趋势" });
assert.match(chartHtml, /class="profit-trend-chart"/);
assert.match(chartHtml, /aria-label="测试趋势"/);
assert.equal((chartHtml.match(/profit-trend-bar/g) || []).length, 3);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because both chart helpers are undefined.

- [ ] **Step 3: Implement deterministic chart geometry**

Implement `profitChartModel(points)` with fixed view-box coordinates, guarded price range, zero-safe unit scale, null-point gaps, and two-decimal averages. Build the line with `M`/`L` commands only from complete price points. Keep the function pure and free of DOM access.

- [ ] **Step 4: Implement semantic chart markup**

`renderProfitTrendChart` must render:

```html
<figure class="profit-trend-chart" aria-label="最近 7 天成交均价与销量趋势">
  <figcaption>...</figcaption>
  <svg viewBox="0 0 700 240" role="img">...</svg>
  <div class="profit-trend-axis">...</div>
</figure>
```

The SVG contains `.profit-trend-line`, `.profit-trend-point`, `.profit-trend-bar`, and `.profit-trend-current` nodes. The caption contains current average price, average units, price change, and unit change so the chart does not depend on hover.

- [ ] **Step 5: Run focused tests and verify pass**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS.

---

### Task 3: Replace link and SKU number strips with the shared chart

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/app/workbench/65-profit-template.js`
- Modify: `src/styles/modules/18-profit-template.css`

**Interfaces:**
- Consumes: `renderProfitTrendChart(points, options)` from Task 2
- Produces: link-detail trend chart and expanded SKU trend chart using the same visual grammar

- [ ] **Step 1: Add failing rendered-output tests**

```js
assert.match(listingHtml, /最近 7 天成交均价与销量趋势/);
assert.equal((listingHtml.match(/class="profit-trend-chart"/g) || []).length, 1);
assert.doesNotMatch(listingHtml, /profit-seven-day-strip/);

api.applyProfitWorkspaceAction(state, { type: "toggleSkuTrend", listingSkuId: "listing-jzz-main-sku-grey" });
listingHtml = api.renderProfitListingDetail(state, "listing-jzz-main");
assert.equal((listingHtml.match(/class="profit-trend-chart"/g) || []).length, 2);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the link still renders `.profit-seven-day-strip`.

- [ ] **Step 3: Convert link results into chart points**

Map each `listingResult.sevenDay.days` item to:

```js
{
  dateKey: day.dateKey,
  averageTransactionPrice: day.result.itemsSold ? day.result.gmv / day.result.itemsSold : null,
  itemsSold: day.result.itemsSold,
  finalProfit: day.result.finalProfit
}
```

Render the shared chart inside `.profit-seven-day-section` and retain the “older records collapsed” affordance.

- [ ] **Step 4: Convert desktop and mobile SKU expansion**

Pass `row.trend.points` to the same renderer with `compact: true`. Remove the legacy `.profit-trend-points` and `.profit-mobile-trend` number-strip markup while preserving the existing toggle action and one-expanded-SKU behavior.

- [ ] **Step 5: Add chart layout CSS**

Add scoped rules for chart header, legend, plot background, grid lines, price line, sales bars, current-day marker, axis labels, and compact SKU mode. Use `vector-effect: non-scaling-stroke` for stable line weight and keep all text outside the SVG when practical.

- [ ] **Step 6: Run focused tests and verify pass**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS.

---

### Task 4: Apply the professional operations cockpit visual system

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Modify: `src/styles/modules/18-profit-template.css`
- Modify: `src/app/workbench/65-profit-template.js` only where an additional scoped class is needed

**Interfaces:**
- Consumes: existing profit workspace markup and state classes
- Produces: consistent cockpit hierarchy across overview, product, listing, settlement, SKU, and expense surfaces

- [ ] **Step 1: Add CSS-contract regression tests**

```js
for (const selector of [
  ".profit-template-shell",
  ".profit-workspace-head",
  ".profit-metric.featured",
  ".profit-trend-chart",
  ".profit-settlement-primary",
  ".profit-listing-card",
  ".profit-attention-panel"
]) assert.match(profitStyles, new RegExp(selector.replace(".", "\\.")));

assert.match(profitStyles, /--profit-ink-green:/);
assert.match(profitStyles, /\.profit-template-shell[\s\S]*?background:/);
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the new cockpit token and chart styling are absent.

- [ ] **Step 3: Introduce scoped cockpit tokens**

Define `--profit-ink-green`, `--profit-surface`, `--profit-surface-raised`, `--profit-line-strong`, `--profit-shadow-sm`, and `--profit-shadow-md` on `.profit-template-shell`. Do not alter global workbench tokens.

- [ ] **Step 4: Restyle the visual hierarchy in one bounded pass**

Apply the approved deep-green/warm-gray system to the workspace header, sync card, metric band, product/listing cards, attention queue, settlement grid, SKU surface, expense inputs, buttons, and focus states. Remove flat all-white repetition by alternating raised and softly tinted surfaces while keeping numerical tables calm and readable.

- [ ] **Step 5: Complete responsive rules**

At 900px, keep chart summaries compact and settlement at two columns. At 640px, switch SKU table to cards and keep the chart responsive. At 420px, use a single settlement column, preserve readable labels, and prevent action labels from splitting into orphan characters.

- [ ] **Step 6: Run focused tests and verify pass**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS.

---

### Task 5: Full verification and browser QA

**Files:**
- Verify: all files changed in Tasks 1–4

**Interfaces:**
- Consumes: built Cloudflare static bundle at `dist/`
- Produces: verified local template at `http://127.0.0.1:8797/`

- [ ] **Step 1: Run the full project check**

Run: `npm run check`

Expected: exit 0; profit-template regression suite reports all assertions passed.

- [ ] **Step 2: Build the production bundle**

Run: `node scripts/build-cloudflare.mjs`

Expected: exit 0 and `Cloudflare static bundle ready: dist/`.

- [ ] **Step 3: Verify the desktop flow**

Use the in-app Browser at 1440×900:

1. Open `利润与成本`.
2. Open `JZZ` product.
3. Open `JZZ 主链接`.
4. Confirm the link chart has one price line, seven sales bars, and a current-day marker.
5. Expand one SKU trend and confirm exactly one additional compact chart appears.
6. Confirm the settlement primary card has no black outline or pill shape.
7. Confirm no page-level horizontal overflow and no relevant console warning/error.

- [ ] **Step 4: Verify the mobile flow**

Use 390×844:

1. Confirm summary metrics reflow without clipped values.
2. Confirm the chart remains readable and does not create page-level horizontal overflow.
3. Confirm settlement cards become one column.
4. Confirm SKU cards replace the desktop table and the trend toggle works.

- [ ] **Step 5: Capture accepted screenshots and leave the listing page open**

Capture one desktop and one mobile screenshot after the page is visually stable. Reject any screenshot with loading state, crop, error overlay, or wrong route. Reset the temporary viewport and keep the verified link-detail tab open for the user.
