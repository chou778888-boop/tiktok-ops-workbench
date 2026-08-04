# Workbench Internal Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic workbench source into ordered, responsibility-based files while preserving identical product behavior, data contracts, and single-file production delivery.

**Architecture:** Source fragments share the existing script scope and are concatenated in one declared order before minification. The first phase changes physical ownership only; it does not introduce browser module boundaries or rewrite business logic. Automated source-equivalence and manifest checks prevent ordering drift.

**Tech Stack:** Vanilla JavaScript, Node.js build scripts, esbuild, Cloudflare Pages Functions, existing Node assertion tests.

## Global Constraints

- Visible UI, copy, interaction behavior, API routes, and D1 schema remain unchanged.
- No new runtime dependency or additional production JavaScript request.
- No remote D1 write, initialization, or migration during refactoring.
- Preserve all unrelated dirty-worktree changes.
- Do not edit generated `dist/` files by hand.
- Stop a migration stage if source equivalence or regression checks fail.

---

### Task 1: Ordered Application Source Manifest

**Files:**
- Create: `scripts/app-sources.mjs`
- Create: `scripts/test-app-sources.mjs`
- Modify: `scripts/build-cloudflare.mjs`
- Modify: `scripts/check-project.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `loadAppSources(): Promise<{ files: string[], combined: string }>`
- Consumes: ordered source fragment paths under `src/app/workbench/`

- [ ] **Step 1: Write the failing manifest test**

```js
import assert from "node:assert/strict";
import { loadAppSources } from "./app-sources.mjs";

const bundle = await loadAppSources();
assert.equal(new Set(bundle.files).size, bundle.files.length);
assert.equal(bundle.files.at(-1), "src/app/workbench/90-entry.js");
assert.ok(bundle.combined.includes("initializeWorkbench()"));
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node scripts/test-app-sources.mjs`
Expected: FAIL because `app-sources.mjs` does not exist.

- [ ] **Step 3: Implement the manifest loader**

```js
import { readFile } from "node:fs/promises";

export const appSourceFiles = [
  "src/app/workbench/00-runtime.js",
  "src/app/workbench/10-overview.js",
  "src/app/workbench/20-tasks.js",
  "src/app/workbench/30-reports.js",
  "src/app/workbench/40-creators.js",
  "src/app/workbench/50-records.js",
  "src/app/workbench/60-costing.js",
  "src/app/workbench/70-navigation.js",
  "src/app/workbench/80-events.js",
  "src/app/workbench/90-entry.js"
];

export async function loadAppSources() {
  const sources = await Promise.all(appSourceFiles.map((file) => readFile(file, "utf8")));
  return { files: [...appSourceFiles], combined: sources.join("") };
}
```

- [ ] **Step 4: Route build and checks through the manifest**

Replace the direct `readFile("src/app/workbench.js")` build input with `loadAppSources()`. Add `node scripts/test-app-sources.mjs` to `check`, and require every declared source file in `check-project.mjs`.

- [ ] **Step 5: Run focused tests**

Run: `node scripts/test-app-sources.mjs && node scripts/check-project.mjs`
Expected: PASS after Task 2 creates the fragments; during Task 1 the test may report the exact missing fragment list.

### Task 2: Byte-Equivalent Physical Split

**Files:**
- Create: `src/app/workbench/00-runtime.js`
- Create: `src/app/workbench/10-overview.js`
- Create: `src/app/workbench/20-tasks.js`
- Create: `src/app/workbench/30-reports.js`
- Create: `src/app/workbench/40-creators.js`
- Create: `src/app/workbench/50-records.js`
- Create: `src/app/workbench/60-costing.js`
- Create: `src/app/workbench/70-navigation.js`
- Create: `src/app/workbench/80-events.js`
- Create: `src/app/workbench/90-entry.js`
- Remove after verification: `src/app/workbench.js`
- Create: `scripts/split-workbench-source.mjs`

**Interfaces:**
- Consumes: the current monolithic `src/app/workbench.js` as migration input only
- Produces: ordered fragments whose direct concatenation equals the migration input byte for byte

- [ ] **Step 1: Add exact source boundary assertions**

The migration script must locate unique anchors and fail unless every anchor appears once and in this order:

```js
const anchors = [
  "window.__workbenchMainReady = true;",
  "    function pct(value) {",
  "    function taskIsVoided(task) {",
  "    const REPORT_STORES = [",
  "    function escapeHtml(value) {",
  "    function saveEntry(form) {",
  "    let costingState = (() => {",
  "    document.querySelectorAll(\".tab\").forEach",
  "    let blanketCreatorFilter = \"all\";",
  "    function initializeWorkbench() {"
];
```

- [ ] **Step 2: Run migration dry check**

Run: `node scripts/split-workbench-source.mjs --check`
Expected: PASS with ten ordered, non-empty byte ranges and the original SHA-256.

- [ ] **Step 3: Generate fragments without rewriting content**

Slice the original string at anchor byte offsets, write each slice to its declared file, then read and concatenate all files. Abort unless:

```js
assert.equal(combined, original);
```

- [ ] **Step 4: Switch the build to fragments and compare production output**

Build the old source and fragment source with the same esbuild options. Assert both minified outputs are byte-identical before removing the monolith.

- [ ] **Step 5: Remove the monolith only after equivalence passes**

Use a patch deletion after the test proves exact equality. The build must no longer reference `src/app/workbench.js`.

- [ ] **Step 6: Run syntax and manifest checks**

Run: `node scripts/test-app-sources.mjs && node scripts/check-project.mjs && node scripts/build-cloudflare.mjs`
Expected: PASS; production continues to contain one `workbench-<release>.js`.

### Task 3: Dependency Guardrails and Business Constants Index

**Files:**
- Create: `docs/APP_MODULES.md`
- Create: `scripts/test-app-boundaries.mjs`
- Modify: `package.json`
- Modify: `scripts/check-project.mjs`

**Interfaces:**
- Produces: machine-checked ordered module ownership and a human-readable change index
- Consumes: `appSourceFiles` from `scripts/app-sources.mjs`

- [ ] **Step 1: Write failing boundary checks**

```js
assert.ok(runtimeSource.includes("const defaultData"));
assert.ok(taskSource.includes("function renderTasks"));
assert.ok(reportSource.includes("function saveReport"));
assert.ok(costingSource.includes("function calculateCost"));
assert.ok(entrySource.includes("initializeWorkbench();"));
assert.equal(allSources.match(/function initializeWorkbench\(/g)?.length, 1);
```

- [ ] **Step 2: Add duplicate ownership checks**

Check critical symbols such as `normalizeState`, `saveCloudState`, `renderTasks`, `saveReport`, `renderCreatorCenter`, and `calculateCost` occur exactly once across all fragments.

- [ ] **Step 3: Write the module change index**

Document for each fragment: responsibility, primary functions, allowed upstream dependencies, and common requested changes. Explicitly record the report-to-task dependency and the cloud-state safety boundary.

- [ ] **Step 4: Add boundary tests to the default check command**

Run: `node scripts/test-app-boundaries.mjs`
Expected: PASS with a JSON summary of files, critical symbols, and ownership checks.

### Task 4: Architecture and Safe Change Workflow

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/CHANGE_GUIDE.md`
- Modify: `docs/SECURITY.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: final module manifest and test commands
- Produces: one source of truth for architecture, feature-location lookup, local QA, and cloud deployment boundaries

- [ ] **Step 1: Update the architecture map**

Replace the monolith description with the ordered fragment flow:

```text
index.html -> boot.js -> /api/bootstrap -> ordered workbench sources
ordered sources -> build-cloudflare.mjs -> one production workbench bundle
browser changes -> incremental /api/state patch -> D1 revision guard
```

- [ ] **Step 2: Update the feature-location table**

Map overview, reports, tasks, creators, costing, navigation, cloud sync, authentication, styling, and build changes to exact files and exact focused tests.

- [ ] **Step 3: Document the release sequence**

Record: local edits → focused tests → full check → build → local Cloudflare preview → desktop/mobile interaction QA → user approval → code-only deployment → release and D1 read-only verification.

- [ ] **Step 4: Document prohibited data operations**

State that refactoring, building, and deployment do not execute D1 migrations or state initialization; remote writes require a separate explicit business-data request.

- [ ] **Step 5: Run documentation integrity checks**

Run: `rg -n "src/app/workbench\.js" README.md docs scripts package.json`
Expected: references remain only in historical specifications or migration tooling, never in active build/change instructions.

### Task 5: Full Equivalence and Rendered QA

**Files:**
- Modify only if a verification defect is found: files owned by the failing module

**Interfaces:**
- Consumes: all modular sources, build scripts, tests, and docs
- Produces: locally verified build with unchanged behavior and no remote data mutation

- [ ] **Step 1: Run all automated checks**

Run the existing project check command using Node scripts if pnpm requests an interactive dependency reinstall. Expected: all auth, task, GMV, report disclosure, creator import, bootstrap, and cloud-initial-state tests pass.

- [ ] **Step 2: Build and inspect output shape**

Run: `node scripts/build-cloudflare.mjs`
Expected: one versioned CSS, one boot JS, one workbench JS, and `release.json`; no additional production JavaScript request.

- [ ] **Step 3: Start local Cloudflare preview**

Run: `./node_modules/.bin/wrangler pages dev dist --port 8797`
Expected: authenticated session restores and team data renders from the existing local preview database.

- [ ] **Step 4: Exercise primary flows**

Verify total overview rendering, report role disclosure without submitting data, task-center view switching, costing calculator input response, creator-center navigation, logout control presence, and zero relevant console errors. Do not submit or mutate remote business data.

- [ ] **Step 5: Verify responsive layouts**

Check desktop first viewport and a mobile-sized viewport for blank screens, clipping, overlays, broken navigation, and layout shifts.

- [ ] **Step 6: Compare Git scope**

Run: `git status --short` and `git diff --stat`. Confirm only architecture-owned files from this plan changed in addition to pre-existing user modifications.

- [ ] **Step 7: Keep deployment gated**

Leave the verified result local. Do not deploy until the user explicitly requests cloud synchronization.
