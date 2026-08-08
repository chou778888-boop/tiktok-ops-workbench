# Overview Decision Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two stacked seven-day trend experiences with a company-first decision brief and one mutually exclusive GMV/link analysis surface.

**Architecture:** Add a pure overall-decision model beside the existing link pulse model. Render the company brief independently, then use one `activeOverviewAnalysisMode` state to switch the existing GMV/source and link price-volume/profit presentations within the same DOM region.

**Tech Stack:** Vanilla HTML, CSS, JavaScript, Canvas, Node contract tests, Cloudflare Pages local preview.

## Global Constraints

- Preserve all existing data and cloud persistence behavior.
- Default to company-level GMV; link-level data appears only after an explicit switch.
- Never render both seven-day trend charts at the same time.
- Keep date controls inside the overview surface.
- Maintain desktop and mobile layouts without page-level horizontal overflow.

---

### Task 1: Overall decision model and brief

**Files:**
- Modify: `src/app/workbench/11-overview-pulse-model.js`
- Modify: `scripts/test-overview-pulse-model.mjs`
- Modify: `index.html`
- Modify: `src/app/workbench/10-overview.js`

**Interfaces:**
- Produces: `makeOverviewDecisionModel(totals, anomalies, context)` returning headline, detail, pathLabel, tone, priority and raw metrics.
- Consumes: aggregated range totals and detected anomalies from `renderOverview()`.

- [ ] Write failing model tests for urgent, stable and empty-data states with literal expected results.
- [ ] Run `node scripts/test-overview-pulse-model.mjs` and confirm the missing function failure.
- [ ] Implement the pure model and render the new overall brief in the top surface.
- [ ] Run the model test and confirm it passes.

### Task 2: Single mutually exclusive analysis surface

**Files:**
- Modify: `index.html`
- Modify: `src/app/workbench/00-runtime.js`
- Modify: `src/app/workbench/10-overview.js`
- Modify: `src/app/workbench/80-events.js`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Produces: `setOverviewAnalysisMode(mode)` and `renderOverviewAnalysisMode()`.
- Consumes: `activeOverviewAnalysisMode` with allowed values `gmv` and `link`.

- [ ] Write a failing DOM contract test requiring one analysis shell, two controls and two hidden mutually exclusive panels.
- [ ] Run `node scripts/test-premium-shell-overview.mjs` and confirm the new structure is missing.
- [ ] Move the link pulse and link profit detail into the analysis shell; keep GMV/source as the default panel.
- [ ] Wire delegated click handling and render only the active chart after visibility changes.
- [ ] Run the premium overview and model tests and confirm they pass.

### Task 3: Responsive hierarchy and runtime verification

**Files:**
- Modify: `src/styles/modules/19-premium-shell-overview.css`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: `.overview-decision-brief`, `.overview-analysis-switch`, and `[data-overview-analysis-panel]`.
- Produces: desktop two-column and mobile single-column responsive behavior.

- [ ] Add failing style assertions for one full-width decision brief, visible active switch and the 1180px single-column branch.
- [ ] Run `node scripts/test-premium-shell-overview.mjs` and confirm the style contracts fail.
- [ ] Implement the responsive styles and remove obsolete top pulse grid rules.
- [ ] Run `npm run check`, `npm run build`, and `git diff --check`.
- [ ] Start `npm run dev:local`; verify date filters, both analysis modes, risk jump, profit link action, long data, empty states and 1200px/390px widths in the live browser.

