# Product & Listing Profit Analysis Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current link-first seven-day matrix with a team-friendly profit workspace that starts from product health, drills into each store listing, and makes daily SKU price/sales entry fast while preserving seven-day decision context.

**Architecture:** Keep the prototype browser-only and in-memory, but separate business calculations, demo repository/state, selectors, and rendering/controller responsibilities. The visible hierarchy is Product → Listing → SKU; store remains a listing attribute/filter. Calculations use contribution profit terminology and immutable IDs so later cloud persistence can replace the repository without rewriting the UI.

**Tech Stack:** Existing vanilla HTML/CSS/JavaScript workbench, concatenated source manifest, Node `assert` + `vm` tests, esbuild build, local HTTP preview on port 8797.

## Global Constraints

- Preserve unrelated user changes in the dirty worktree; stage and commit only files changed for this feature.
- No Excel import, browser storage, network calls, or cloud writes in this iteration.
- Daily entry pre-fills the previous valid price but never pre-fills sales units.
- Keep only two analysis dimensions visible: product overall and one product listing. Store is a filter/attribute, not a third hierarchy level.
- Use “贡献利润” wherever listing-level costs are incomplete; do not present it as accounting net profit.
- Desktop and approximately 320px layouts must remain usable with no page-level horizontal overflow.
- Tables and numeric fields must align consistently; labels and buttons must not split into orphaned characters.

---

## File Map

- Create `src/app/workbench/61-profit-domain.js`: pure date, money, SKU/listing/product calculation, daily-entry, observation, and validation functions.
- Create `src/app/workbench/62-profit-repository.js`: normalized in-memory demo dataset and mutation repository interface.
- Create `src/app/workbench/63-profit-selectors.js`: product/listing summaries, status classification, seven-day comparisons, and filter selectors.
- Rewrite `src/app/workbench/65-profit-template.js`: view state, product/listing/SKU rendering, dialogs, and event controller only.
- Update `scripts/app-sources.mjs`: load the three new modules before the UI controller.
- Update `scripts/test-profit-template.mjs`: test the new data model, calculation vocabulary, entry behavior, observations, hierarchy, and rendered contracts.
- Update `index.html`: replace link/SKU forms with product-aware lifecycle forms and add observation dialog markup.
- Rewrite `src/styles/modules/18-profit-template.css`: polished product overview, listing drill-down, compact daily entry, expandable trends, drawer/dialog, and responsive behavior.

---

### Task 1: Lock the domain behavior with failing tests

**Files:**
- Modify: `scripts/test-profit-template.mjs`
- Create: `src/app/workbench/61-profit-domain.js`
- Modify: `scripts/app-sources.mjs`

- [ ] Add tests for seven-day windows, SKU daily gross profit, listing contribution profit, and product aggregation across multiple listings.
- [ ] Add tests proving today’s entry uses yesterday’s price fallback and blank/zero units instead of copying sales.
- [ ] Add tests for planned price-change observations, seven-day target-SKU lift, product-unit guardrail, contribution-profit guardrail, and correction changes that skip observation.
- [ ] Add validation tests for product, listing lifecycle, and shared-SKU/listing-SKU relationships.
- [ ] Run `node scripts/test-profit-template.mjs` and confirm the new assertions fail for missing functions.
- [ ] Implement only the pure domain functions required by the tests.
- [ ] Run `node scripts/test-profit-template.mjs` and confirm domain assertions pass.
- [ ] Commit only Task 1 files with message `feat: add product profit domain model`.

### Task 2: Add a normalized in-memory repository

**Files:**
- Create: `src/app/workbench/62-profit-repository.js`
- Modify: `scripts/test-profit-template.mjs`
- Modify: `scripts/app-sources.mjs`

- [ ] Add failing tests for products sharing SKU masters across listings, independent listing prices, listing lifecycle transitions, SKU activation, and predecessor listing relationships.
- [ ] Run the focused test and confirm repository assertions fail.
- [ ] Implement `createProfitRepository`, read methods, and mutation methods without storage/network calls.
- [ ] Build realistic demo records for multiple products, including one product sold through multiple stores/listings and 30 days of facts.
- [ ] Run the focused test and confirm repository assertions pass.
- [ ] Commit only Task 2 files with message `feat: add in-memory profit repository`.

### Task 3: Add decision selectors and status rules

**Files:**
- Create: `src/app/workbench/63-profit-selectors.js`
- Modify: `scripts/test-profit-template.mjs`
- Modify: `scripts/app-sources.mjs`

- [ ] Add failing tests for product total cards, listing ranking, pending-entry counts, trend summaries, and health statuses.
- [ ] Cover statuses for negative contribution, low contribution margin, planned observation, pending entry, and healthy records.
- [ ] Run the focused test and confirm selector assertions fail.
- [ ] Implement selectors using only domain/repository data, with no DOM access.
- [ ] Run the focused test and confirm selector assertions pass.
- [ ] Commit only Task 3 files with message `feat: add profit decision selectors`.

### Task 4: Replace the rendered workspace hierarchy

**Files:**
- Rewrite: `src/app/workbench/65-profit-template.js`
- Modify: `scripts/test-profit-template.mjs`
- Modify: `index.html`

- [ ] Add failing HTML-contract tests for product overview, product drill-down, listing detail, compact SKU entry rows, expandable seven-day trend, contribution-profit vocabulary, lifecycle controls, and observation prompt.
- [ ] Run the focused test and confirm rendering assertions fail.
- [ ] Implement a product overview with date/store/status filters, product-level KPIs, attention queue, and ranked product rows/cards.
- [ ] Implement product detail with combined result first, followed by the product’s store listings and an explicit “enter listing” action.
- [ ] Implement listing detail with today’s editable SKU price/units, calculated unit/SKU profit, listing-level expenses, and automatic listing contribution total.
- [ ] Implement per-SKU seven-day disclosure instead of the full matrix; keep older records collapsed.
- [ ] Implement add/archive/restore listing and add/deactivate/restore SKU actions without hard deletion.
- [ ] Implement planned-change/correction choice when an entered price differs from the prior valid price.
- [ ] Run the focused test and confirm rendering/controller assertions pass.
- [ ] Commit only Task 4 files with message `feat: redesign product listing profit workspace`.

### Task 5: Polish the visual and responsive system

**Files:**
- Rewrite: `src/styles/modules/18-profit-template.css`
- Modify: `scripts/test-profit-template.mjs`

- [ ] Add static assertions for responsive breakpoints, no-wrap action labels, numeric alignment, and component-specific overflow containment.
- [ ] Run the focused test and confirm style assertions fail.
- [ ] Implement a calm operational layout with clear density hierarchy, restrained status colors, aligned metrics, and comfortable form spacing.
- [ ] Provide desktop table/card layouts and a stacked narrow-screen layout; horizontal scrolling is limited to contained data regions.
- [ ] Run the focused test and confirm all profit workspace assertions pass.
- [ ] Commit only Task 5 files with message `style: polish profit analysis workspace`.

### Task 6: Build and browser verification

**Files:**
- Modify only if verification finds a scoped defect in the files above.

- [ ] Run `node scripts/test-profit-template.mjs`.
- [ ] Run `pnpm check`.
- [ ] Run `pnpm build`.
- [ ] Restart or verify the local service at `http://127.0.0.1:8797/`.
- [ ] In the browser, verify: open 利润与成本 → product overview → multi-listing product → listing detail → edit price/units → planned observation → expand seven-day SKU trend → add/deactivate/restore SKU → archive/restore listing.
- [ ] Verify desktop and approximately 320px viewport with no page-level horizontal overflow and no broken labels.
- [ ] Review the final diff for accidental changes and placeholder text.
- [ ] Commit only any verification fixes with message `fix: verify profit workspace interactions`.

## Self-Review Checklist

- [ ] Every requirement in `docs/superpowers/specs/2026-08-04-product-listing-profit-analysis-redesign.md` maps to at least one task above.
- [ ] Product/listing/SKU identifiers are stable and URL is never used as an identity key.
- [ ] Same-product listings share SKU identity but retain independent price history.
- [ ] Contribution profit equals SKU gross profit minus sample, marketing, and adjustment costs.
- [ ] Planned observations last seven days and prioritize target-SKU sales lift with product and profit guardrails.
- [ ] No automatic price-writing behavior exists.
- [ ] No placeholder interfaces or future persistence claims are presented as completed functionality.
