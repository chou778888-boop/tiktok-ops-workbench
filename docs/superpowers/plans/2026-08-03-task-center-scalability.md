# Task Center Scalability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-task status board with a scalable local task center containing My Tasks, assignee-grouped Team Tasks, and separately loaded History Tasks.

**Architecture:** Keep the existing task array and mutation flow unchanged. Add pure view-model helpers for identity matching, active-task sorting, assignee grouping, and history batching; render three client-side views over the same data and reuse existing task-card actions.

**Tech Stack:** Static HTML, vanilla JavaScript, modular CSS, Node assertion scripts, Cloudflare Pages build.

## Global Constraints

- Do not change D1 schema or mutate cloud team data during local development.
- Current identity comes only from today's report-form author field.
- Completed and voided tasks appear only in History Tasks.
- Reuse existing design tokens and ordered CSS modules; production still emits one CSS file.
- Validate desktop and 390px mobile without horizontal overflow.

---

### Task 1: View-model behavior

**Files:**
- Create: `scripts/test-task-center-views.mjs`
- Modify: `src/app/workbench.js`
- Modify: `package.json`

**Interfaces:**
- Produces: helpers that normalize task-center identity, sort active tasks, group tasks by assignee, and select historical tasks.

- [ ] Write source-level assertions for exact-name matching, empty-identity privacy, active/history separation, sorting, unassigned grouping, and history batching.
- [ ] Run `node scripts/test-task-center-views.mjs` and verify it fails because the new helpers and render structure do not exist.
- [ ] Implement the minimal helper functions and state required by the assertions.
- [ ] Add the test to the project check command and rerun it until green.

### Task 2: Three task-center views

**Files:**
- Modify: `index.html`
- Modify: `src/app/workbench.js`

**Interfaces:**
- Consumes: Task 1 view-model helpers.
- Produces: `我的任务`, `团队任务`, and `历史任务` controls and rendered panels.

- [ ] Extend the failing assertions to require the three semantic view controls, identity prompt, assignee groups, search/filter controls, and history load-more action.
- [ ] Run the focused test and verify the new assertions fail.
- [ ] Implement the three views while preserving the existing task-card action attributes and state transitions.
- [ ] Rerun the focused test and existing task-sync test until both pass.

### Task 3: Product-specific styling and responsive layout

**Files:**
- Modify: `src/styles/modules/06-tasks.css`

**Interfaces:**
- Consumes: existing workbench tokens and Task 2 markup.
- Produces: desktop assignee groups and single-column mobile task views.

- [ ] Extend the focused assertions to require task-center view, identity, summary, group, filter, and history selectors in the existing task CSS module.
- [ ] Run the focused test and verify the styling assertions fail.
- [ ] Add styles using existing tokens, with text plus color for status and no mobile horizontal overflow.
- [ ] Rerun the focused test and project style checks until green.

### Task 4: Local verification and preview

**Files:**
- Modify only if verification exposes a tested defect.

**Interfaces:**
- Consumes: complete local task-center implementation.
- Produces: a verified local preview ready for user review.

- [ ] Run project checks, JavaScript syntax checks, task sync, GMV trend, report disclosure, task-center view tests, and production build.
- [ ] Open `http://127.0.0.1:8797/` and validate: app identity, no error overlay, console health, today's report-name matching, all three views, group expansion, history loading, existing task actions, and empty-name state.
- [ ] Repeat the critical flow at 390px and verify `scrollWidth === clientWidth`.
- [ ] Report the local release and preview URL without deploying Cloudflare Pages.
