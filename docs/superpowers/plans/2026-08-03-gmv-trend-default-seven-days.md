# GMV Trend Default Seven Days Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make only the overview GMV trend default to a rolling seven-day range while preserving today's default for all other overview metrics.

**Architecture:** Add one focused range factory in the existing workbench module. Use it only for the trend subtitle and chart render call, leaving the shared overview range state untouched.

**Tech Stack:** Browser JavaScript, Node.js source-level regression test, Cloudflare Pages build scripts.

## Global Constraints

- Do not change D1 or team data.
- Do not change the default range for overview metrics other than the GMV trend.
- Do not refactor unrelated workbench code.

---

### Task 1: Isolate the GMV trend range

**Files:**
- Create: `scripts/test-gmv-trend-range.mjs`
- Modify: `src/app/workbench.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: existing `today`, `addDays(date, offset)`, `drawGmvTrend(range)`, and `dataRangeDateText(range)`.
- Produces: `gmvTrendDataRange()` returning `{ key: "7d", label: "近7日", metricLabel: "近7日", start, end, days: 7, isSingle: false }`.

- [ ] **Step 1: Write the failing test**

Create a source-level regression test that asserts the overview remains initialized with `activeDataRangePreset = "today"`, defines `gmvTrendDataRange()`, and uses it for both the trend subtitle and `drawGmvTrend` call.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-gmv-trend-range.mjs`

Expected: FAIL because `gmvTrendDataRange()` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add `gmvTrendDataRange()` beside `selectedDataRange()`. In `renderOverview()`, assign `const trendRange = gmvTrendDataRange()`, use it for the subtitle, and call `drawGmvTrend(trendRange)`.

- [ ] **Step 4: Run focused and full verification**

Run the focused test, `scripts/check-project.mjs`, JavaScript syntax checks, task sync test, and production build. All commands must exit 0.

- [ ] **Step 5: Deploy and verify**

Deploy `dist/` to the `cloudflare-migration` production branch. Verify the official domain returns the new `release.json` value and new hashed assets.
