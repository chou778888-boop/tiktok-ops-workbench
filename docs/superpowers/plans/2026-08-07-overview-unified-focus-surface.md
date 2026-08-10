# Overview Unified Focus Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two abrupt stacked color blocks on the overview with one continuous, responsive operating-focus surface without changing business behavior.

**Architecture:** Add one semantic wrapper around the existing decision, pulse, and signal regions, then move the layout responsibility to that wrapper. Existing element IDs remain unchanged so rendering, chart, range filtering, and navigation code continue to work.

**Tech Stack:** Static HTML, modular CSS, vanilla JavaScript, Node contract tests, Cloudflare Pages preview

## Global Constraints

- Preserve all existing user data, state bindings, canvas IDs, action IDs, and navigation behavior.
- Do not modify profit calculations or synchronization logic.
- Use one continuous visual surface at every viewport width.
- Avoid orphan Chinese characters, clipped dynamic numbers, and page-level horizontal scrolling at 320px.
- Keep tables and all overview sections below the focus surface unchanged.

---

### Task 1: Lock the continuous-surface contract

**Files:**
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: `index.html` and `src/styles/modules/19-premium-shell-overview.css`
- Produces: a regression contract requiring `overview-focus-surface` and forbidding the old two-column page-level card split

- [ ] **Step 1: Write the failing contract test**

Add assertions that require one `overview-focus-surface` wrapper containing the focus region, pulse region, and signal briefs, plus CSS rules for the unified surface.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: FAIL because `overview-focus-surface` does not exist yet.

### Task 2: Implement the unified HTML and visual hierarchy

**Files:**
- Modify: `index.html`
- Modify: `src/styles/modules/19-premium-shell-overview.css`
- Test: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: existing IDs `overviewProfitFocus`, `overviewProfitAction`, `overviewPulseChart`, `overviewPulseDays`, `heroStats`, and overview signal IDs
- Produces: one `overview-focus-surface` wrapper with responsive decision and instrument regions

- [ ] **Step 1: Add the semantic wrapper without changing existing IDs**

Place the current profit focus, pulse ribbon, and signal briefs inside `overview-focus-surface`; keep the page heading outside it.

- [ ] **Step 2: Replace page-level split styling with the unified surface**

Give `overview-focus-surface` the only outer border, radius, background, and shadow. Make the focus region transparent and the pulse region a restrained inset instrument. Use separators instead of independent card shadows.

- [ ] **Step 3: Define responsive layouts**

Use two columns above 1180px and one continuous column below it. At 760px and 340px, retain current compact metric and action layouts while preventing horizontal overflow.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: PASS with the updated assertion count.

### Task 3: Verify the live workbench

**Files:**
- No production file changes expected

**Interfaces:**
- Consumes: local preview at `http://127.0.0.1:52098/`
- Produces: browser evidence for layout, interaction, console, and overflow behavior

- [ ] **Step 1: Run all automated checks and build**

Run: `npm run check && npm run build && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Inspect desktop and mobile layouts**

At 1280px, 760px, 390px, and 320px, verify one outer focus surface, readable dynamic data, and `document.documentElement.scrollWidth === document.documentElement.clientWidth`.

- [ ] **Step 3: Exercise retained interactions**

Use “今日/昨日/近7日/近30日”, the specified-date field, and “处理此链接”; verify state changes and navigation still work, then return to overview.

- [ ] **Step 4: Inspect runtime errors**

Verify the browser console has no new errors or warnings caused by this change.
