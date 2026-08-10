# Premium Shell and Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the workbench shell and overview into a restrained premium technology operations console while preserving all business logic and the completed profit model.

**Architecture:** Extend the existing token system, add one final-cascade shared visual module, and make only semantic HTML-class additions to the overview. Existing JavaScript IDs, events, data aggregation, canvases, and profit modules remain unchanged. A source-contract test protects the new design tokens, module ordering, semantic overview regions, and preservation of profit code.

**Review revision:** After the first visual pass was judged too similar to the incumbent UI, the desktop shell was decisively changed to a fixed operating rail, the overview hero was replaced by an editorial heading plus continuous decision band, and empty charts were converted into actionable states. Existing data and navigation behavior remain preserved.

**Tech Stack:** Static HTML, layered modular CSS, vanilla JavaScript, Node.js source-contract tests, esbuild, Cloudflare Pages build.

## Global Constraints

- Preserve all current business behavior, data structures, IDs, event hooks, profit calculations, repository state, selectors, and the real 2026-08-03 profit sample.
- Main work surface stays light; graphite black and deep ink green carry focus; restrained blue is only for information, synchronization, and interaction.
- No full dark theme, neon glow, decorative 3D, large blur animation, or multicolor gradient.
- Headings must not create orphan Chinese characters or short-character wraps.
- Table headers and normal cells stay vertically and horizontally centered; only long descriptions may align left and comparable numeric columns may align right.
- Use existing project primitives and token architecture; do not add dependencies.
- Verify desktop widths 1280, 1440, and 1920 plus mobile.
- Do not commit in this shared dirty worktree; use scoped diffs and explicit verification checkpoints.

---

## File Structure

- Modify `src/styles/tokens.css`: global semantic palette, elevation, typography, spacing, and focus tokens.
- Create `src/styles/modules/19-premium-shell-overview.css`: final-cascade phase-one shell and overview presentation only.
- Modify `src/styles/workbench.css`: import the phase-one module last.
- Modify `index.html`: add semantic class hooks and overview regions without changing existing IDs or controls.
- Create `scripts/test-premium-shell-overview.mjs`: source-level regression contract for tokens, markup, module order, and profit preservation.
- Modify `package.json`: include the new contract test in `pnpm check`.
- Modify `docs/STYLE_SYSTEM.md`: document the new three-level surface system and ownership boundary.

### Task 1: Lock the phase-one visual contract with a failing test

**Files:**
- Create: `scripts/test-premium-shell-overview.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `index.html`, `src/styles/tokens.css`, `src/styles/workbench.css`, `src/styles/modules/19-premium-shell-overview.css`, `src/app/workbench/65-profit-template.js`.
- Produces: a Node source-contract test included in `pnpm check`.

- [ ] **Step 1: Create the failing source-contract test**

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, tokens, manifest, profitTemplate] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/styles/tokens.css", "utf8"),
  readFile("src/styles/workbench.css", "utf8"),
  readFile("src/app/workbench/65-profit-template.js", "utf8")
]);

assert.match(tokens, /--color-brand-ink:\s*#12201b/);
assert.match(tokens, /--color-tech-blue:\s*#2f6fed/);
assert.match(tokens, /--surface-raised:/);
assert.match(tokens, /--shadow-raised:/);
assert.match(manifest, /modules\/19-premium-shell-overview\.css/);
assert.equal(manifest.trim().split("\n").at(-1), '@import url("./modules/19-premium-shell-overview.css");');
assert.match(html, /class="topbar premium-topbar"/);
assert.match(html, /class="hero-card overview-command-card"/);
assert.match(html, /class="analysis-grid overview-intelligence-grid"/);
assert.match(html, /class="overview-command-copy"/);
assert.match(html, /class="overview-command-status"/);
assert.match(profitTemplate, /renderProfitListingDetail/);
assert.match(profitTemplate, /renderProfitSkuTrend/);

console.log(JSON.stringify({ passed: 12, phase: "premium-shell-overview-contract" }));
```

- [ ] **Step 2: Add the test to `pnpm check` immediately before `test-profit-template.mjs`**

```json
"check": "... && node scripts/test-premium-shell-overview.mjs && node scripts/test-profit-template.mjs"
```

- [ ] **Step 3: Run the test and verify RED**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL because the premium tokens, CSS module, and semantic class hooks do not exist.

- [ ] **Step 4: Record a scoped checkpoint**

Run: `git diff -- package.json scripts/test-premium-shell-overview.mjs`
Expected: only the new test and check-script registration are visible.

### Task 2: Build the shared premium visual foundation

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/styles/modules/19-premium-shell-overview.css`
- Modify: `src/styles/workbench.css`
- Modify: `docs/STYLE_SYSTEM.md`

**Interfaces:**
- Consumes: existing compatibility aliases (`--bg`, `--ink`, `--panel`, `--green`, `--blue`) and current layered CSS.
- Produces: `--color-brand-ink`, `--color-tech-blue`, `--surface-raised`, `--surface-focus`, `--shadow-raised`, `--shadow-focus`, plus final-cascade shell primitives.

- [ ] **Step 1: Add semantic tokens without removing compatibility aliases**

Add the following concepts to `:root` in `src/styles/tokens.css` and bind existing aliases where appropriate:

```css
--color-canvas: #f2f4f3;
--color-canvas-deep: #e9eeeb;
--color-ink: #101713;
--color-brand-ink: #12201b;
--color-brand-green: #176b4b;
--color-tech-blue: #2f6fed;
--color-line: rgba(18, 32, 27, 0.1);
--surface-base: rgba(255, 255, 255, 0.78);
--surface-raised: rgba(255, 255, 255, 0.92);
--surface-focus: #12201b;
--shadow-raised: 0 16px 44px rgba(26, 42, 35, 0.08);
--shadow-focus: 0 22px 58px rgba(15, 35, 27, 0.16);
--content-max: 1760px;
```

- [ ] **Step 2: Create the final-cascade module with clear ownership sections**

Create `src/styles/modules/19-premium-shell-overview.css` with sections in this order:

```css
/* 1. Canvas and shared surface depth */
/* 2. Premium top navigation */
/* 3. Overview command card */
/* 4. Overview intelligence grid and chart surfaces */
/* 5. Overview tables and exception list */
/* 6. Empty states */
/* 7. 1280/1440/1920 and mobile adaptations */
/* 8. Reduced-motion behavior */
```

The module must:

- use only tokenized colors for shared surfaces;
- cap content with `--content-max` while keeping existing responsive gutters;
- use one restrained green accent per overview view;
- keep transitions at or below 200ms and animate only opacity/transform;
- apply `font-variant-numeric: tabular-nums` to metrics and table numbers;
- provide visible `:focus-visible` states;
- avoid large backdrop filters and looping animation;
- give empty chart/table states one clear next action through existing navigation controls.

- [ ] **Step 3: Import the module last**

Append to `src/styles/workbench.css`:

```css
@import url("./modules/19-premium-shell-overview.css");
```

- [ ] **Step 4: Document ownership**

Add to `docs/STYLE_SYSTEM.md`:

- tokens own palette, depth, radius, spacing, and typography;
- module 19 owns phase-one shell and overview overrides;
- business modules must consume tokens instead of copying module 19 declarations;
- the profit module keeps its domain structure and only consumes shared tokens when later migrated.

- [ ] **Step 5: Run the contract test and verify it still fails for markup only**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL on `premium-topbar` or the first missing semantic HTML hook, proving the token and module assertions now pass.

### Task 3: Recompose the top navigation and overview without changing behavior

**Files:**
- Modify: `index.html`
- Modify: `src/styles/modules/19-premium-shell-overview.css`

**Interfaces:**
- Consumes: existing IDs `syncStatus`, `heroStats`, `overviewDataHealth`, `gmvTrendChart`, `sourceDonutChart`, `storeRows`, `productRows`, `priorityList` and existing `data-*` hooks.
- Produces: semantic visual hooks only; no new JavaScript API.

- [ ] **Step 1: Add semantic class hooks to existing elements**

Apply these exact class changes while preserving every ID and `data-*` attribute:

```html
<header class="topbar premium-topbar">
<section id="overview" class="view active overview-workspace">
<div class="hero-card overview-command-card">
<div class="analysis-grid overview-intelligence-grid">
```

- [ ] **Step 2: Group command-card copy and status regions**

Wrap the existing heading/description and existing data containers; do not rewrite business copy or duplicate IDs:

```html
<div class="overview-command-body">
  <div class="overview-command-copy">
    <h1>多店铺数据先汇总，再进入分析。</h1>
    <p>...</p>
  </div>
  <div class="overview-command-status">
    <div class="hero-data-health" id="overviewDataHealth"></div>
  </div>
</div>
<div class="hero-stats" id="heroStats"></div>
```

- [ ] **Step 3: Add non-behavioral class hooks to overview panels**

Name the existing panels by responsibility:

```html
<div class="panel overview-trend-panel">...</div>
<div class="panel overview-source-panel">...</div>
<div class="panel creator-main-panel overview-store-panel">...</div>
<div class="panel section-gap overview-product-panel">...</div>
<div class="panel section-gap overview-risk-panel">...</div>
```

- [ ] **Step 4: Implement the approved composition in CSS**

At desktop widths:

- command card is compact, not a giant black hero;
- heading/status form a balanced two-column composition;
- hero metrics become a continuous data rail with subtle separators;
- trend panel gets primary width and source panel gets secondary width;
- panel hierarchy uses canvas → raised → focus surfaces;
- table headers, badges, inputs, and buttons share a precise height and radius system;
- no text wraps into orphan Chinese characters.

At mobile widths:

- command body becomes one column;
- range controls remain horizontally usable;
- metric rail becomes a two-column grid, then one column only below 340px;
- tables retain horizontal scrolling and visible first identity column;
- no fixed heights are introduced.

- [ ] **Step 5: Run the contract test and verify GREEN**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: PASS with `{"passed":12,"phase":"premium-shell-overview-contract"}`.

- [ ] **Step 6: Run focused existing regression tests**

Run: `node scripts/test-gmv-trend-range.mjs && node scripts/test-profit-template.mjs`
Expected: both test scripts exit 0 and the profit template checks remain unchanged.

### Task 4: Verify build, layout, and preservation boundaries

**Files:**
- Modify only if verification exposes a scoped defect: `src/styles/modules/19-premium-shell-overview.css` or semantic classes in `index.html`.

**Interfaces:**
- Consumes: completed phase-one shell and overview.
- Produces: verified desktop/mobile implementation with no console regression.

- [ ] **Step 1: Run complete static and behavioral checks**

Run: `pnpm check`
Expected: exit 0 with all existing checks plus `premium-shell-overview-contract` passing.

- [ ] **Step 2: Build the Cloudflare bundle**

Run: `pnpm build`
Expected: exit 0 and `Cloudflare static bundle ready`.

- [ ] **Step 3: Verify the live overview at 1280×800, 1440×900, and 1920×1080**

For each viewport confirm:

- navigation remains on one line or follows the existing responsive rule;
- command card is fully visible without excessive height;
- the trend/source split is balanced;
- key labels do not wrap into orphan characters;
- metric and table numbers use tabular alignment;
- the current real profit page still renders after navigation.

- [ ] **Step 4: Verify mobile at 390×844**

Confirm touch controls remain at least 44px where interactive, range controls remain usable, tables scroll rather than clip, and no page-level horizontal overflow appears.

- [ ] **Step 5: Inspect browser console**

Expected: no new errors produced by shell navigation, overview range changes, chart render, or profit-page navigation.

- [ ] **Step 6: Review scoped changes**

Run: `git diff -- index.html package.json src/styles/tokens.css src/styles/workbench.css src/styles/modules/19-premium-shell-overview.css scripts/test-premium-shell-overview.mjs docs/STYLE_SYSTEM.md docs/designs/2026-08-05-premium-tech-workbench.md docs/superpowers/plans/2026-08-05-premium-shell-overview.md`
Expected: only approved design-system, shell, overview, tests, and documentation changes; no profit-domain JavaScript changes.
