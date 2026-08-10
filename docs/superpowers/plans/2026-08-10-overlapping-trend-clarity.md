# Overlapping Trend Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep GMV and order positions truthful while making overlapping series visibly distinct and operationally meaningful.

**Architecture:** Add one pure relationship classifier to the overview model, render its result in the existing operating header, and enhance the existing Canvas renderer with area fill, differentiated strokes, and bounded endpoint labels. Preserve current data aggregation and tooltip behavior.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, modular CSS, Node assertion scripts.

## Global Constraints

- Never offset or mutate plotted data to manufacture visual separation.
- Missing report dates remain unsynced rather than zero.
- Preserve existing IDs, source data, tooltips, and responsive behavior.
- Validate desktop and approximately 320px without page overflow.

---

### Task 1: Relationship model and rendering contract

**Files:**
- Modify: `scripts/test-overview-pulse-model.mjs`
- Modify: `scripts/test-premium-shell-overview.mjs`
- Modify: `src/app/workbench/11-overview-pulse-model.js`

**Interfaces:**
- Produces: `overviewOperatingRelationship(points)` returning mode, AOV bounds, and spread percentage.

- [ ] Add failing assertions for stable, divergent, and insufficient data.
- [ ] Run focused tests and confirm the missing function failure.
- [ ] Implement the minimal pure classifier and rerun focused tests.

### Task 2: Distinct chart layers and direct labels

**Files:**
- Modify: `index.html`
- Modify: `src/app/workbench/10-overview.js`
- Modify: `src/styles/modules/19-premium-shell-overview.css`

**Interfaces:**
- Consumes: `overviewOperatingRelationship(points)`.
- Produces: compact relationship badge plus GMV area, differentiated order stroke, and endpoint labels.

- [ ] Render the relationship badge from the pure model.
- [ ] Add bounded area and endpoint-label drawing helpers inside the existing Canvas renderer.
- [ ] Preserve hover coordinates and point values.
- [ ] Run focused model and overview contract tests.

### Task 3: Verification

**Files:**
- Test: `scripts/test-overview-pulse-model.mjs`
- Test: `scripts/test-premium-shell-overview.mjs`

- [ ] Run `npm run check`.
- [ ] Run `npm run build` and record the release hash.
- [ ] Reload the fixed local URL and inspect real data at desktop and 320px.
- [ ] Confirm no console errors and no horizontal overflow.
