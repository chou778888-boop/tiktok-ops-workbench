# Profit Center Interactive Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished, clickable “利润中心 · 模板” preview inside Costing without reading or persisting real business data.

**Architecture:** Add one isolated browser module for demo state, rendering, validation, and in-memory interactions. Add a dedicated CSS module for the responsive layout, and mount the template through a fourth Costing subtab. A static contract test protects the DOM hooks, module registration, responsive breakpoints, and the no-persistence boundary.

**Tech Stack:** Existing HTML/CSS/vanilla JavaScript build, Node.js assertion scripts, Cloudflare Pages local preview.

## Global Constraints

- Demo state must be created in memory on page load and must not call `saveState()`, `localStorage`, `sessionStorage`, `fetch()`, or any workbench API.
- Do not read or import Excel data.
- Use JZZ, JDZ, and 牙贴 as clearly labeled example data.
- SKU removal is a reversible active/inactive toggle; never hard-delete a demo SKU.
- Summary metrics include active SKUs only.
- At widths ≥1440px use six KPI columns; 900–1439px use three; 420–899px use two; below 420px use one.
- Profit tables may scroll inside their own container; the whole page must not overflow horizontally.
- Do not modify existing team data, D1 schema, or Cloudflare state endpoints.

---

### Task 1: Add the template contract test and page shell

**Files:**
- Create: `scripts/test-profit-template.mjs`
- Modify: `package.json`
- Modify: `index.html`

**Interfaces:**
- Consumes: Existing `.cost-subtab` / `[data-cost-pane-content]` switching in `src/app/workbench/60-costing.js`.
- Produces: `data-cost-pane="profit-template"`, `#profitTemplateRoot`, `#profitLinkDialog`, `#profitSkuDialog`, and their form controls for the browser module.

- [ ] **Step 1: Write the failing shell contract test**

Create `scripts/test-profit-template.mjs` with assertions equivalent to:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
assert.match(html, /data-cost-pane="profit-template"[^>]*>\s*利润中心/);
assert.match(html, /data-cost-pane-content="profit-template"/);
for (const id of ["profitTemplateRoot", "profitLinkDialog", "profitLinkForm", "profitSkuDialog", "profitSkuForm"]) {
  assert.match(html, new RegExp(`id="${id}"`));
}
console.log(JSON.stringify({ passed: 7, phase: "profit-template-shell" }));
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the Costing subtab and `#profitTemplateRoot` do not exist.

- [ ] **Step 3: Add the Costing subtab, empty render root, and two dialogs**

Add a fourth button beside the existing Costing subtabs:

```html
<button class="cost-subtab profit-template-tab" data-cost-pane="profit-template" type="button">
  利润中心 <span>模板</span>
</button>
```

Add a matching pane after the history pane. It contains `#profitTemplateRoot`, plus:

```html
<dialog class="profit-dialog" id="profitLinkDialog">
  <form id="profitLinkForm" method="dialog" novalidate>…</form>
</dialog>
<dialog class="profit-dialog" id="profitSkuDialog">
  <form id="profitSkuForm" method="dialog" novalidate>…</form>
</dialog>
```

The link form fields are `store`, `product`, and `url`. The SKU form fields are `listingId`, `name`, `price`, `cost`, and `commissionRate`. Each dialog includes an inline `role="alert"` error container, Cancel button, and Submit button.

- [ ] **Step 4: Register the test in the full project check**

Append `node scripts/test-profit-template.mjs` to the `check` script in `package.json` without removing or reordering existing checks.

- [ ] **Step 5: Run the shell test**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS with `{"passed":7,"phase":"profit-template-shell"}`.

- [ ] **Step 6: Commit the shell contract**

```bash
git add scripts/test-profit-template.mjs package.json index.html
git commit -m "test: define profit center template shell"
```

### Task 2: Implement isolated demo state, calculations, and interactions

**Files:**
- Create: `src/app/workbench/65-profit-template.js`
- Modify: `scripts/app-sources.mjs`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: `escapeHtml()`, `showToast()`, and Costing subtab switching from earlier workbench modules; DOM hooks from Task 1.
- Produces: `createProfitTemplateData()`, `calculateProfitTemplateSku(sku)`, `profitTemplateSummary(listings)`, `validateProfitTemplateLink(values)`, `validateProfitTemplateSku(values)`, `toggleProfitTemplateSku(listings, skuId)`, `renderProfitTemplate()`, and event handlers scoped to `#profitTemplateRoot` and the two template dialogs.

- [ ] **Step 1: Extend the test to execute the real model behavior**

Load `src/app/workbench/65-profit-template.js` through `node:vm` without a DOM so the real pure functions run without starting browser rendering. Use hand-derived fixtures:

```js
const sku = { units: 10, price: 20, cost: 12, commissionRate: 20, sampleCost: 5, adSpend: 10, active: true };
assert.deepEqual(plain(calculateProfitTemplateSku(sku)), {
  gmv: 200,
  unitProfit: 4,
  actualProfit: 25,
  margin: 0.125
});

const listings = [{ id: "listing-a", skus: [
  { id: "active", units: 10, price: 20, cost: 12, commissionRate: 20, sampleCost: 5, adSpend: 10, active: true },
  { id: "inactive", units: 99, price: 99, cost: 0, commissionRate: 0, sampleCost: 0, adSpend: 0, active: false }
] }];
assert.deepEqual(plain(profitTemplateSummary(listings)), {
  units: 10,
  gmv: 200,
  sampleCost: 5,
  adSpend: 10,
  actualProfit: 25,
  margin: 0.125
});
assert.equal(toggleProfitTemplateSku(listings, "active"), false);
assert.equal(listings[0].skus.length, 2);
assert.equal(toggleProfitTemplateSku(listings, "active"), true);
```

Test validation with literal outcomes: empty store/product, `ftp:` URL, negative price/cost, and commission rates below 0 or above 100 must produce an error; a complete `https:` link and a non-negative SKU must return an empty string. Also assert the app manifest includes `65-profit-template.js` and the module source does not contain persistence calls.

- [ ] **Step 2: Run the extended test to verify it fails**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because `65-profit-template.js` and its functions do not exist.

- [ ] **Step 3: Create deterministic example data and pure calculations**

Implement the functions at top level and guard browser initialization with `if (typeof document !== "undefined")`, allowing the same production code to run inside the Node test. `createProfitTemplateData()` returns three listings for DreamWeave/JZZ, Dreamdaily/JDZ, and Himood Smile/牙贴. Each listing has:

```js
{
  id, store, product, url, active,
  skus: [{ id, name, units, price, cost, commissionRate, sampleCost, adSpend, active }]
}
```

Implement:

```js
function calculateProfitTemplateSku(sku) {
  const gmv = sku.units * sku.price;
  const unitProfit = sku.price * (1 - sku.commissionRate / 100) - sku.cost;
  const actualProfit = unitProfit * sku.units - sku.sampleCost - sku.adSpend;
  return { gmv, unitProfit, actualProfit, margin: gmv ? actualProfit / gmv : 0 };
}
```

`profitTemplateSummary()` flattens active SKUs and returns units, GMV, sample cost, ad spend, actual profit, and margin. `toggleProfitTemplateSku()` toggles a matching record in place, returns the new active state, and never removes the SKU. The two validation functions return an empty string for valid input or one user-facing error message for the first invalid field.

- [ ] **Step 4: Render the four visual layers**

`renderProfitTemplate()` writes only to `#profitTemplateRoot` and renders:

1. Header with “示例数据 · 不会保存” and `#profitAddLink`.
2. Six KPI cards from `profitTemplateSummary()`.
3. Listing cards with store/product/link metadata, active SKU count, and `data-profit-add-sku` buttons.
4. A global SKU profit table with active/inactive state and `data-profit-toggle-sku` buttons.

All user-entered strings must pass through `escapeHtml()`. Monetary values use a template-local `profitTemplateMoney()` formatter. Negative values receive a semantic negative class rather than inline styles.

- [ ] **Step 5: Add in-memory dialog interactions and validation**

Add event handlers that:

- Open `#profitLinkDialog` from `#profitAddLink`.
- Validate a non-empty store/product and an `http:` or `https:` URL before unshifting the new listing.
- Open `#profitSkuDialog` with the selected listing ID from `data-profit-add-sku`.
- Validate non-empty SKU name, non-negative price/cost, and commission rate from 0 through 100.
- Add a new SKU with zero demo sales/sample/ad values.
- Toggle `active` in `toggleProfitTemplateSku()` and re-render without removing the record.
- Reset and close forms after successful submission; retain form values after a validation error.

- [ ] **Step 6: Register the module and run its contract test**

Insert `65-profit-template.js` in `scripts/app-sources.mjs` after `60-costing.js` and before `70-navigation.js`.

Run: `node scripts/test-profit-template.mjs`

Expected: PASS, including the no-persistence assertion.

- [ ] **Step 7: Commit the working interaction layer**

```bash
git add src/app/workbench/65-profit-template.js scripts/app-sources.mjs scripts/test-profit-template.mjs
git commit -m "feat: add interactive profit center template"
```

### Task 3: Apply polished responsive layout and verify the running workbench

**Files:**
- Create: `src/styles/modules/18-profit-template.css`
- Modify: `src/styles/workbench.css`
- Modify: `scripts/test-profit-template.mjs`

**Interfaces:**
- Consumes: Semantic classes emitted by `renderProfitTemplate()` and dialog classes from `index.html`.
- Produces: Responsive layout, table containment, modal styling, and visual hierarchy without altering existing Costing panes.

- [ ] **Step 1: Add failing style assertions**

Extend the test to read `18-profit-template.css` and assert the presence of `.profit-template-kpis`, `.profit-listing-grid`, `.profit-table-wrap`, `.profit-dialog`, and media queries for `1439px`, `899px`, and `419px`. Assert that `src/styles/workbench.css` imports the new module after `03-costing.css` and before the final responsive module.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-profit-template.mjs`

Expected: FAIL because the dedicated stylesheet does not exist.

- [ ] **Step 3: Implement the layout and state styling**

Create CSS that provides:

- A calm white/soft-gray surface matching Costing, with one dark primary action.
- Six KPI columns by default, three at `max-width:1439px`, two at `max-width:899px`, and one at `max-width:419px`.
- Listing cards with consistent 18–22px padding, aligned metadata, and actions that wrap below content on narrow screens.
- Right-aligned numeric table columns, muted inactive rows, restrained red negative-profit treatment, and `.profit-table-wrap { overflow-x:auto; }`.
- Native `<dialog>` styling with a dim backdrop, clear form spacing, visible focus states, and mobile-safe width.

Import the stylesheet immediately after `03-costing.css` so existing later responsive rules can continue to provide final cross-device normalization.

- [ ] **Step 4: Run focused and full automated checks**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS.

Run: `node scripts/check-project.mjs`

Expected: PASS.

Run: `node scripts/build-cloudflare.mjs`

Expected: `Cloudflare static bundle ready: dist/ (...)` with exit code 0.

- [ ] **Step 5: Verify in the local browser**

Open `http://127.0.0.1:8797/`, select “成本测算” then “利润中心 · 模板”, and verify:

- The six KPI cards and three example link cards appear.
- Add Link validates bad URLs, accepts a valid URL, and adds one card.
- Add SKU inserts a row under the selected listing.
- Stop/Restore changes the KPI totals and row state without removing the row.
- Refresh restores the three original example links.
- Existing 快速测算、测算历史、基础成本录入 tabs still switch normally.
- At desktop and narrow viewport widths, no page-level horizontal overflow occurs.

- [ ] **Step 6: Commit the visual polish**

```bash
git add src/styles/modules/18-profit-template.css src/styles/workbench.css scripts/test-profit-template.mjs
git commit -m "style: polish profit center template layout"
```
