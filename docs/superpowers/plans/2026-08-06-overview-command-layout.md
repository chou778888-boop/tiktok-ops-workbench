# Overview Command Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unbalanced editorial hero with the approved A-direction “single-screen operating command center” while preserving real profit data and all current interactions.

**Architecture:** Keep `makeOverviewPulseModel` as the only presentation-model boundary, extend it with three derived signal summaries, and render those summaries into a small semantic brief row. Recompose existing overview markup into left and right layout wrappers, then implement the 45% / 55% responsive grid entirely in the final overview stylesheet.

**Tech Stack:** Static HTML, modular CSS, browser JavaScript, Canvas, Node.js contract tests, Cloudflare Pages build.

## Global Constraints

- Only redesign the overview first screen; do not change profit formulas, repositories, API routes, database state, or secondary business pages.
- At 1280 × 720, the link conclusion, actual received, provisional profit, seven-day signal, and four core metrics must be visible without initial scrolling.
- Keep model-driven real values; pending dates must stay pending and no trend values may be fabricated.
- At 760px and below, order content as title → profit focus → seven-day signal → metrics → operating briefs.
- At 320px, document width must equal viewport width.
- Preserve the existing “处理此链接” and date-filter behavior.
- Do not add dependencies, decorative assets, or unrelated refactors.
- The worktree contains unrelated changes; do not commit, stage, overwrite, or reformat unrelated files.

---

### Task 1: Add model-derived operating briefs

**Files:**
- Modify: `src/app/workbench/11-overview-pulse-model.js`
- Modify: `scripts/test-overview-pulse-model.mjs`

**Interfaces:**
- Consumes: existing `makeOverviewPulseModel(productRows, attentionItems, activeDate)` inputs.
- Produces: `model.signals` with `{ priceLabel: string, motionLabel: string, actionLabel: string }` for both available and empty states.

- [ ] **Step 1: Write failing assertions for the three summaries**

Add after the existing JZZ model assertions:

```js
assert.equal(model.signals.priceLabel, "$17.32 当前成交均价");
assert.equal(model.signals.motionLabel, "1/7 天已同步 · 39 件");
assert.equal(model.signals.actionLabel, "JZZ · 广告、样品待补");
assert.equal(empty.signals.priceLabel, "等待成交数据");
assert.equal(empty.signals.motionLabel, "等待同步数据");
assert.equal(empty.signals.actionLabel, "等待经营判断");
```

- [ ] **Step 2: Run the model test and verify the new assertions fail**

Run: `node scripts/test-overview-pulse-model.mjs`
Expected: FAIL because `signals` is not defined.

- [ ] **Step 3: Derive summaries inside the pure model**

For the empty state, return:

```js
signals: {
  priceLabel: "等待成交数据",
  motionLabel: "等待同步数据",
  actionLabel: "等待经营判断"
}
```

For the available state, derive from `points`, `result`, and `attention`:

```js
const syncedPoints = points.filter((point) => point.synced);
const latestPoint = syncedPoints.at(-1) || null;
const priceLabel = latestPoint?.averageTransactionPrice
  ? `$${latestPoint.averageTransactionPrice.toFixed(2)} 当前成交均价`
  : "等待成交数据";

signals: {
  priceLabel,
  motionLabel: `${syncedPoints.length}/7 天已同步 · ${number(result.itemsSold).toLocaleString("en-US")} 件`,
  actionLabel: String(attention?.title || listingRow?.health?.label || "查看链接经营结果")
}
```

- [ ] **Step 4: Run the model test**

Run: `node scripts/test-overview-pulse-model.mjs`
Expected: PASS with `{"passed":21,"phase":"overview-pulse-model"}` after updating the reported assertion count from 15 to 21.

---

### Task 2: Recompose the first-screen semantic structure

**Files:**
- Modify: `index.html`
- Modify: `src/app/workbench/10-overview.js`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: `model.signals` produced by Task 1.
- Produces: `.overview-command-left`, `.overview-command-right`, `.overview-signal-briefs`, `#overviewSignalPrice`, `#overviewSignalMotion`, and `#overviewSignalAction`.

- [ ] **Step 1: Update contract tests for the approved structure**

Add HTML assertions:

```js
assert.match(html, /class="overview-command-left"/);
assert.match(html, /class="overview-command-right"/);
assert.match(html, /class="overview-signal-briefs"/);
assert.match(html, /id="overviewSignalPrice"/);
assert.match(html, /id="overviewSignalMotion"/);
assert.match(html, /id="overviewSignalAction"/);
```

Replace the old 0.78fr/1.22fr and 218px layout assertions with:

```js
assert.match(premiumStyles, /\.overview-command-card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(360px, 0\.9fr\)\s+minmax\(0, 1\.1fr\)/);
assert.match(premiumStyles, /\.overview-command-copy h1\s*\{[\s\S]*?font-size:\s*clamp\(36px, 3vw, 46px\)/);
assert.match(premiumStyles, /\.overview-signal-briefs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL because the wrappers and signal brief IDs are missing.

- [ ] **Step 3: Group existing content into two semantic columns**

Inside `.overview-command-card`, wrap `.overview-page-heading` and `.overview-profit-focus` in:

```html
<div class="overview-command-left">…</div>
```

Wrap `.overview-pulse-ribbon` and a new three-cell brief row in:

```html
<div class="overview-command-right">
  …existing pulse ribbon…
  <div class="overview-signal-briefs" aria-label="经营判断摘要">
    <div><small>价格</small><strong id="overviewSignalPrice">等待成交数据</strong></div>
    <div><small>动销</small><strong id="overviewSignalMotion">等待同步数据</strong></div>
    <div><small>动作</small><strong id="overviewSignalAction">等待经营判断</strong></div>
  </div>
</div>
```

- [ ] **Step 4: Render the three summaries without duplicating model logic**

In `renderOverviewProfitPulse()`, add:

```js
const signalPrice = document.getElementById("overviewSignalPrice");
const signalMotion = document.getElementById("overviewSignalMotion");
const signalAction = document.getElementById("overviewSignalAction");
if (signalPrice) signalPrice.textContent = model.signals.priceLabel;
if (signalMotion) signalMotion.textContent = model.signals.motionLabel;
if (signalAction) signalAction.textContent = model.signals.actionLabel;
```

- [ ] **Step 5: Run syntax and contract checks**

Run: `node --check src/app/workbench/10-overview.js`
Expected: PASS.

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: still FAIL only on CSS assertions until Task 3.

---

### Task 3: Implement the A-direction command-center layout

**Files:**
- Modify: `src/styles/modules/19-premium-shell-overview.css`
- Test: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: semantic wrappers and signal IDs from Task 2.
- Produces: 45% / 55% desktop layout, compact pulse instrument, 760px single-column flow, and 320px overflow safety.

- [ ] **Step 1: Implement the desktop grid and column stacks**

Set the command card and wrappers to:

```css
body.workbench-entered #overview .overview-command-card {
  grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(16px, 1.6vw, 22px);
  align-items: stretch;
}

body.workbench-entered #overview :is(.overview-command-left, .overview-command-right) {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: 14px;
}

body.workbench-entered #overview .overview-command-left {
  grid-template-rows: auto 1fr;
}

body.workbench-entered #overview .overview-command-right {
  grid-template-rows: 1fr auto;
}
```

- [ ] **Step 2: Reduce title and control density**

Use `font-size: clamp(36px, 3vw, 46px)`, `line-height: 0.98`, heading padding `10px 4px 0`, and a 14px internal gap. Keep the date controls inside the heading area and left-align them so they form one block instead of floating at the far right.

- [ ] **Step 3: Fit the profit focus to the left column**

Keep its content and ledger but change it to a single-column internal grid, `min-height: 0`, `padding: 22px`, `gap: 18px`, and a consistent 18px radius. Place the ledger and CTA on one compact lower row where width allows, while keeping the CTA full-width on mobile.

- [ ] **Step 4: Compact the seven-day instrument**

Remove `grid-column: 1 / -1` and `margin-top: 18px`. Set pulse padding-top to 16px, header padding to `0 16px 12px`, canvas height to 118px, day row padding to `0 14px 9px`, metric cell minimum height to 72px, metric padding to 11px 12px, and metric value size to `clamp(17px, 1.55vw, 24px)`.

- [ ] **Step 5: Style the three-cell operating brief**

Implement:

```css
body.workbench-entered #overview .overview-signal-briefs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid rgba(18, 32, 27, 0.09);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
}
```

Each cell uses 11px × 12px padding, a right divider except on the last child, a muted 8px label, and a single-line 10px strong value with ellipsis.

- [ ] **Step 6: Preserve two columns down to 761px and stack at 760px**

At 1180px, use `minmax(300px, 0.82fr) minmax(0, 1.18fr)` rather than collapsing the command card. At 760px, switch to one column and stack title → focus → pulse → metrics → briefs; make the brief row one column at 340px and below.

- [ ] **Step 7: Run focused tests**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: PASS with the updated assertion count.

Run: `node scripts/test-overview-pulse-model.mjs`
Expected: PASS with 21 assertions.

Run: `node --check src/app/workbench/10-overview.js`
Expected: PASS.

---

### Task 4: Build and visually verify the approved layout

**Files:**
- Modify only if a bounded visual fix is required: `src/styles/modules/19-premium-shell-overview.css`
- Update: `design-qa.md`

**Interfaces:**
- Consumes: completed A-direction layout.
- Produces: verified desktop and mobile evidence with a working local preview.

- [ ] **Step 1: Run the UI detector**

Run:

```bash
node /Users/a111/.codex/skills/impeccable/scripts/detect.mjs --json index.html src/styles/modules/19-premium-shell-overview.css src/app/workbench/10-overview.js src/app/workbench/11-overview-pulse-model.js
```

Expected: `[]`.

- [ ] **Step 2: Run complete project verification**

Run: `npm run check`
Expected: all project checks pass.

Run: `npm run build`
Expected: `Cloudflare static bundle ready`.

- [ ] **Step 3: Refresh the full local preview and inspect 1280 × 720**

Verify all five required values are visible without initial scroll: JZZ link conclusion, `$631.47`, `$163.47`, seven-day signal, and the four core metrics. Confirm the title is no larger than the focus conclusion and both columns share aligned visual bounds.

- [ ] **Step 4: Inspect 320 × 852**

Verify `document.documentElement.scrollWidth === window.innerWidth`, no orphaned Chinese title line, full-width CTA, and the required mobile order.

- [ ] **Step 5: Verify interaction and runtime**

Click “处理此链接” and confirm the JZZ profit detail opens. Return to 总览, test 今日/近7日, and confirm a fresh tab has no console warnings or errors.

- [ ] **Step 6: Update design QA evidence**

Record the new desktop/mobile screenshots, viewport measurements, fixed layout issues, interaction checks, and final pass result in `design-qa.md`.
