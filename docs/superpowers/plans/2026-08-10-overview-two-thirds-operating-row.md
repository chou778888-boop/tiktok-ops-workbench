# Overview Two-Thirds Operating Row Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the overview command surface and place the GMV/orders chart beside source contribution at a desktop 2:1 ratio, with the priority-link decision strip below.

**Architecture:** Preserve the existing operating trend and source models. Change only the overview markup hierarchy, risk-state rendering contract, and premium overview CSS. The unified Canvas remains model-driven and redraws through the existing ResizeObserver.

**Tech Stack:** Static HTML, modular CSS, vanilla JavaScript, Node assertion scripts, local Cloudflare build, in-app browser regression.

## Global Constraints

- Preserve all user and cloud data; do not reset state or edit `dist/` directly.
- GMV and transaction orders retain the same seven-day store-group scope and missing-day gaps.
- Source attribution retains affiliate, product-card, unclassified, and non-additive ad attribution semantics.
- Desktop and approximately 320px layouts must not create whole-page horizontal overflow.
- Empty, risk, long-text, and real-data states must remain readable without orphaned Chinese characters.

---

### Task 1: Lock the compact hierarchy contract

**Files:**
- Modify: `scripts/test-premium-shell-overview.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing `overviewOperatingChart`, `sourceContributionBar`, `overviewProfitFocus`, and `overviewRiskAction` IDs.
- Produces: `overview-operating-row`, `overview-chart-column`, `overview-source-evidence`, and `overview-link-decision` hierarchy.

- [ ] **Step 1: Write the failing markup contract**

Assert that the operating row contains the chart column before source evidence, the priority link is outside that row, and the risk control uses a compact status class rather than a full-width standalone layer.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: FAIL because `overview-operating-row` and `overview-chart-column` are absent.

- [ ] **Step 3: Implement the minimal semantic markup**

Wrap the existing Canvas and empty state in `overview-chart-column`, move source evidence beside it in `overview-operating-row`, and leave `overviewProfitFocus` directly below the row. Preserve every data-bound ID.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit markup and contract together with message `feat: align overview operating evidence`.

### Task 2: Compact risk state and responsive visual hierarchy

**Files:**
- Modify: `scripts/test-premium-shell-overview.mjs`
- Modify: `src/app/workbench/10-overview.js`
- Modify: `src/styles/modules/19-premium-shell-overview.css`

**Interfaces:**
- Consumes: `model.priority`, `overviewRiskAction`, `overview-operating-row`, and existing responsive breakpoints.
- Produces: compact hidden/non-interactive no-risk state, visible risk-only action, desktop `2fr 1fr` operating row, and full-width link strip.

- [ ] **Step 1: Write failing runtime and CSS contracts**

Assert that no-priority state adds a compact class and disables/hides the standalone action treatment; assert `2fr 1fr`, a maximum compact decision height target, full-row link placement, and single-column mobile fallback.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: FAIL on the missing compact risk and 2:1 rules.

- [ ] **Step 3: Implement minimal runtime state**

Toggle `is-empty-risk` on `overviewRiskAction`, render `无高优先风险` without arrow when empty, and retain `查看优先风险 ↓` only when a priority exists.

- [ ] **Step 4: Implement desktop and narrow-screen CSS**

Use `grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr)` for desktop, keep the Canvas readable, compact source cards, make the link decision a horizontal strip, switch the row to one column before content compresses, and retain `2 + 2 + 1` link metrics at 320px.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node scripts/test-premium-shell-overview.mjs && node scripts/test-gmv-trend-range.mjs && node scripts/test-overview-pulse-model.mjs`

Expected: all PASS.

- [ ] **Step 6: Commit**

Commit runtime and CSS with message `style: compact overview decision flow`.

### Task 3: Full verification and live browser regression

**Files:**
- Verify only: application source and generated `dist/`

**Interfaces:**
- Consumes: final source tree.
- Produces: tested local build and live workbench at `http://127.0.0.1:52098/`.

- [ ] **Step 1: Run complete checks**

Run: `npm run check && npm run build && git diff --check`

Expected: exit 0 and a fresh release hash.

- [ ] **Step 2: Verify desktop real-data layout**

At 1440px and 1180px confirm: decision surface is compact, empty risk does not create a third row, operating row is approximately 2:1, source content fits, link decision occupies the next full row, Canvas backing size matches visible size, and whole-page overflow is zero.

- [ ] **Step 3: Verify responsive and interactive states**

At 1024px and 320px confirm correct stacking and zero overflow. Exercise today, a historical empty date, return to today, chart hover, and the profit link navigation.

- [ ] **Step 4: Preserve the deliverable tab**

Reset the temporary viewport, return to overview top, and keep one working local tab open for the user.
