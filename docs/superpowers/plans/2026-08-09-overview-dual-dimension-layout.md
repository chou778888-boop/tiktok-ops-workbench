# Overview Dual-Dimension Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop “近 7 日经营变化” surface show store-group GMV and priority-link price/volume side by side with content-aware 52/48 space, while retaining the current single-panel switch below 1180px.

**Architecture:** Add a pure responsive visibility model that separates wide dual-display state from the existing narrow active-mode state. Restructure the analysis shell into two sibling dimension cards; each card owns its own date badge and compacts its secondary evidence below its main chart. Rendering draws both chart families only in wide mode and keeps the existing active-panel behavior on narrower screens.

**Tech Stack:** Existing HTML, modular CSS, vanilla JavaScript, Canvas 2D charts, Node contract tests, Cloudflare static build.

## Global Constraints

- Desktop width `>= 1180px`: show both dimensions at once.
- Width `760px–1179px`: show one dimension through the existing segmented switch.
- Width `< 760px`: keep the segmented switch, two-column metric grids, full-width actions, and no page-level horizontal overflow.
- Desktop outer ratio starts at `minmax(0, 1.04fr) minmax(420px, 0.96fr)`.
- Store-group and link dates must be rendered separately from their own datasets.
- Do not change the data model, cloud persistence, profit formulas, date filters, risk jump, or profit-detail navigation.
- Do not use fixed heights to manufacture empty space.

---

### Task 1: Responsive analysis visibility model

**Files:**
- Modify: `src/app/workbench/11-overview-pulse-model.js:26-46`
- Test: `scripts/test-overview-pulse-model.mjs:8-150`

**Interfaces:**
- Consumes: `mode: "gmv" | "link"`, `dualDisplay: boolean`.
- Produces: `overviewAnalysisVisibility(mode, dualDisplay)` returning `{ mode, dualDisplay, gmvHidden, linkHidden, gmvPressed, linkPressed }`.
- Preserves: `overviewPulseRangeLabel(points)` for the link card's own period.

- [ ] **Step 1: Write the failing wide-layout model tests**

Add exact assertions after the existing narrow visibility cases:

```js
assert.deepEqual(overviewAnalysisVisibility("gmv", true), {
  mode: "gmv",
  dualDisplay: true,
  gmvHidden: false,
  linkHidden: false,
  gmvPressed: true,
  linkPressed: false
});
assert.deepEqual(overviewAnalysisVisibility("link", true), {
  mode: "link",
  dualDisplay: true,
  gmvHidden: false,
  linkHidden: false,
  gmvPressed: false,
  linkPressed: true
});
assert.equal(overviewAnalysisVisibility("unknown", false).mode, "gmv");
```

Update the two existing narrow expectations to include `dualDisplay: false`.

- [ ] **Step 2: Run the model test and verify failure**

Run: `node scripts/test-overview-pulse-model.mjs`

Expected: FAIL because `dualDisplay` is absent and the link panel remains hidden in wide mode.

- [ ] **Step 3: Implement the pure visibility model**

Replace the current function with:

```js
function overviewAnalysisVisibility(mode = "gmv", dualDisplay = false) {
  const normalizedMode = mode === "link" ? "link" : "gmv";
  const isDual = Boolean(dualDisplay);
  return {
    mode: normalizedMode,
    dualDisplay: isDual,
    gmvHidden: isDual ? false : normalizedMode !== "gmv",
    linkHidden: isDual ? false : normalizedMode !== "link",
    gmvPressed: normalizedMode === "gmv",
    linkPressed: normalizedMode === "link"
  };
}
```

- [ ] **Step 4: Run the model test and verify pass**

Run: `node scripts/test-overview-pulse-model.mjs`

Expected: PASS with the updated assertion count.

- [ ] **Step 5: Commit the responsive state model**

```bash
git add src/app/workbench/11-overview-pulse-model.js scripts/test-overview-pulse-model.mjs
git commit -m "feat: model dual-dimension overview visibility"
```

---

### Task 2: Two sibling dimension cards and separate date ownership

**Files:**
- Modify: `index.html:172-292`
- Modify: `src/app/workbench/10-overview.js:535-705`
- Modify: `src/app/workbench/80-events.js:180-220`

**Interfaces:**
- Consumes: `overviewAnalysisVisibility(activeOverviewAnalysisMode, isOverviewDualDimensionLayout())`.
- Produces: `isOverviewDualDimensionLayout(): boolean`, `overviewAnalysisLayoutMedia`, and a wrapper `[data-overview-analysis-panels]` containing exactly two sibling panels.
- Date owners: `#overviewGmvRange` receives `dataRangeDateText(trendRange)`; `#overviewLinkRange` receives `overviewPulseRangeLabel(model.points)`.

- [ ] **Step 1: Capture the failing wide-layout behavior in the live browser**

At `1440×1000`, reload `http://127.0.0.1:52098/` and inspect the rendered “近 7 日经营变化” region. Record in the task report:

```text
RED: only the active analysis panel is rendered; “多店 GMV” and “重点链接价量” are not simultaneously visible.
RED: one shared date badge is shown for the active panel instead of two independently owned periods.
```

This is the consumer-visible failure the task must change; do not add tests that only grep source text.

- [ ] **Step 2: Run the existing overview regression test before implementation**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: PASS on the current implementation, establishing that the task must preserve the existing overview contracts while changing the wide rendered behavior.

- [ ] **Step 3: Restructure the analysis markup**

In `index.html`:

1. Keep the shared section title and segmented switch in `.overview-attribution-head`.
2. Remove `#overviewAttributionRange` from the shared actions.
3. Wrap the two existing mode panels in:

```html
<div class="overview-analysis-panels" data-overview-analysis-panels>
  <!-- existing GMV panel -->
  <!-- existing link panel -->
</div>
```

4. Add the GMV period beside `#gmvTrendSummary`:

```html
<div class="overview-dimension-meta">
  <span class="badge blue" id="overviewGmvRange">店群周期待同步</span>
  <strong id="gmvTrendSummary">等待近 7 日数据</strong>
</div>
```

5. Add the link period beside `#overviewPulsePath`:

```html
<div class="overview-dimension-meta">
  <span class="badge blue" id="overviewLinkRange">链接周期待同步</span>
  <strong id="overviewPulsePath">产品 → 店铺 → 链接 → SKU</strong>
</div>
```

- [ ] **Step 4: Render both charts on wide screens and one on narrow screens**

Add near `renderOverviewAnalysisMode`:

```js
const overviewAnalysisLayoutMedia = window.matchMedia("(min-width: 1180px)");

function isOverviewDualDimensionLayout() {
  return overviewAnalysisLayoutMedia.matches;
}
```

Update the renderer so that it:

```js
const visibility = overviewAnalysisVisibility(
  activeOverviewAnalysisMode,
  isOverviewDualDimensionLayout()
);
document.querySelector("[data-overview-analysis-shell]")
  ?.classList.toggle("is-dual-dimension", visibility.dualDisplay);
```

Always assign `#overviewGmvRange` from `dataRangeDateText(trendRange)`. In `renderOverviewProfitPulse`, assign `#overviewLinkRange` from `overviewPulseRangeLabel(model.points)`.

When `visibility.dualDisplay && drawActiveCharts`, execute all three draw paths:

```js
drawGmvTrend(trendRange);
drawSourceDonut(
  aggregateByRange(trendRange),
  aggregateByRange(previousDataRange(trendRange))
);
renderOverviewProfitPulse();
```

When narrow, preserve the current active-mode-only draw behavior.

- [ ] **Step 5: Redraw safely when the 1180px media query changes**

In `80-events.js`, register one listener after the existing date/input handlers:

```js
overviewAnalysisLayoutMedia.addEventListener("change", () => {
  if (document.getElementById("overview")?.classList.contains("active")) {
    renderOverviewAnalysisMode(true);
  }
});
```

This listener changes presentation only; it must not modify `activeOverviewAnalysisMode` or the selected date.

- [ ] **Step 6: Verify the new rendered behavior and regression tests**

At `1440×1000`, reload the live page and record:

```text
GREEN: both analysis panels are visible without clicking.
GREEN: the GMV card shows the store-group period and the link card shows the link period.
```

Run:

```bash
node scripts/test-overview-pulse-model.mjs
node scripts/test-premium-shell-overview.mjs
```

Expected: both PASS with updated assertion counts.

- [ ] **Step 7: Commit markup and runtime behavior**

```bash
git add index.html src/app/workbench/10-overview.js src/app/workbench/80-events.js
git commit -m "feat: show overview dimensions side by side"
```

---

### Task 3: Content-aware 52/48 visual layout

**Files:**
- Modify: `src/styles/modules/19-premium-shell-overview.css:1010-1135`
- Modify: `src/styles/modules/19-premium-shell-overview.css:1390-1498`

**Interfaces:**
- Consumes: `.overview-attribution-panel.is-dual-dimension`, `.overview-analysis-panels`, `.overview-dimension-meta`.
- Produces: two desktop columns at `>=1180px`, one visible active panel below 1180px, compact secondary evidence inside each dimension card.

- [ ] **Step 1: Capture the failing space allocation in the live browser**

At `1440×1000`, capture the rendered analysis surface and record:

```text
RED: the active GMV view internally allocates about 70/30 to chart and source evidence, while the second business dimension is hidden.
RED: the current structure cannot produce two near-equal sibling cards with content-aware internal density.
```

Do not add tests that merely assert CSS source strings; the acceptance target is computed, visible layout.

- [ ] **Step 2: Record baseline dimensions before styling**

Using the live browser, read the two panel bounding boxes where available and the document width. Record the literal widths and confirm the current page has no horizontal overflow before implementation.

- [ ] **Step 3: Implement the wide dual-card grid**

Add the desktop rules:

```css
body.workbench-entered #overview .overview-analysis-panels {
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(420px, 0.96fr);
  align-items: stretch;
  gap: 12px;
  padding: 12px;
}

body.workbench-entered #overview .overview-attribution-panel.is-dual-dimension .overview-analysis-switch {
  display: none;
}

body.workbench-entered #overview .overview-attribution-panel.is-dual-dimension .overview-analysis-mode-panel {
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgba(18, 32, 27, 0.08);
  border-radius: 16px;
  background: rgba(250, 252, 250, 0.86);
}

body.workbench-entered #overview .overview-attribution-panel.is-dual-dimension .overview-attribution-grid {
  grid-template-columns: 1fr;
  height: 100%;
  padding: 0;
}
```

- [ ] **Step 4: Compact each card's secondary evidence**

Add `.overview-dimension-meta` as a right-aligned wrapping metadata group. In dual mode:

- Give `.overview-source-panel` a top border instead of a left border and render `#sourceLegend` as `repeat(3, minmax(0, 1fr))`.
- Give `.overview-profit-focus` a top border instead of a left border, remove fixed/minimum height, and keep its ledger at two columns.
- Keep GMV canvas at `220px–250px` and link canvas at `180px–220px`; these are chart drawing areas, not card fixed heights.
- Change `.overview-pulse-metrics` to `repeat(2, minmax(0, 1fr))` in dual mode so numbers and labels have adequate width.

Use the existing tokens `var(--color-brand-ink)` and `var(--color-pulse-acid)`; do not introduce new color constants.

- [ ] **Step 5: Preserve narrow switch behavior**

Add before the existing `760px` media query:

```css
@media (max-width: 1179px) {
  body.workbench-entered #overview .overview-analysis-panels {
    grid-template-columns: 1fr;
    padding: 0;
  }

  body.workbench-entered #overview .overview-attribution-panel.is-dual-dimension .overview-analysis-switch {
    display: inline-grid;
  }
}
```

The JavaScript visibility model controls which narrow panel has `[hidden]`; CSS must not override `[hidden]`.

- [ ] **Step 6: Run focused and full verification**

Run:

```bash
node scripts/test-premium-shell-overview.mjs
node scripts/test-overview-pulse-model.mjs
npm run check
npm run build
git diff --check
```

Expected: all commands exit 0 and the build prints a new `dist/` release hash.

- [ ] **Step 7: Commit responsive styling**

```bash
git add src/styles/modules/19-premium-shell-overview.css scripts/test-premium-shell-overview.mjs
git commit -m "style: balance overview analysis dimensions"
```

---

### Task 4: Real-data browser acceptance

**Files:**
- Verify only: running `http://127.0.0.1:52098/`

**Interfaces:**
- Consumes: existing local D1 demo data, including six store rows, fourteen SKU rows, and the JZZ link's seven synced days.
- Produces: browser evidence that wide dual display and narrow switching work without altering stored data.

- [ ] **Step 1: Verify 1440×1000 desktop**

Reload the page and confirm:

- Both “多店 GMV” and “重点链接价量” are visible without clicking.
- Outer cards are approximately 52/48 and neither has a large empty region.
- Store period and link period are both visible and differ when their data differs.
- GMV chart, source contribution, link price/volume chart, actual received, profit status, and “处理此链接” are visible.

- [ ] **Step 2: Verify desktop interactions**

Click 今日、昨日、近7日、近30日 and confirm both wide cards update without disappearing. Click “查看优先风险” and “处理此链接”; confirm the risk panel and listing-profit detail open correctly.

- [ ] **Step 3: Verify 1179px narrow behavior**

Set the viewport to `1179×900`. Confirm only the active dimension is visible, the segmented switch is visible, and each button reveals the correct panel.

- [ ] **Step 4: Verify 390px mobile behavior**

Set the viewport to `390×844`. Confirm both switch options work, the page has `scrollWidth === clientWidth`, metrics use two columns, and the action is full width.

- [ ] **Step 5: Check fresh browser logs and restore the deliverable state**

Confirm there are no new runtime errors from the new release. Reset the temporary viewport override, return to 今日, and leave the total overview at the top of the running page.
