# Report Form Progressive Disclosure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep only the report identity fields visible by default, expand detailed fields after role selection, and safely restore the current author's last saved report during the same day.

**Architecture:** Wrap the existing detailed form content in one controlled region and drive its hidden state from the role select. Store only a local resume pointer containing date, role, normalized author, and report ID; use the existing report collection and edit loaders as the source of truth for form contents.

**Tech Stack:** HTML, layered CSS, browser JavaScript, Node.js regression scripts, Cloudflare Pages build.

## Global Constraints

- Do not modify the report, task, or weekly-report cloud data structure.
- Do not change slot uniqueness, same-day self-editing, overwrite protection, or task synchronization.
- The resume pointer must remain browser-local and must never be written to D1.
- Do not deploy until local checks and visual regression pass and the user explicitly requests cloud synchronization.

---

### Task 1: Add the collapsed form structure

**Files:**
- Modify: `index.html:748-816`
- Modify: `src/styles/modules/02-shell-and-reports.css`
- Create: `scripts/test-report-form-disclosure.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `#reportForm`, `#reportRole`, and all existing detailed report form nodes.
- Produces: `#reportDetails` as the single hideable region and an empty role option with label `请选择岗位`.

- [ ] **Step 1: Write the failing structure test**

Assert that the role select has `value=""` placeholder text `请选择岗位`, that all nodes below the basic field row are inside `#reportDetails`, and that the region starts hidden.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-report-form-disclosure.mjs`

Expected: FAIL because `#reportDetails` and the empty role option do not exist.

- [ ] **Step 3: Add the minimal structure and layout**

Move the workflow strip, work guide, help, role fields, closure fields, receipt, and form actions into `<div id="reportDetails" class="report-details" hidden>`. Keep date, role, author, risk, and status outside. Add the empty role option before existing roles. Style `.report-details` with `display: contents` when visible so the current grid layout remains unchanged.

- [ ] **Step 4: Re-run the focused test**

Run: `node scripts/test-report-form-disclosure.mjs`

Expected: the structure assertions pass; behavior assertions still fail until Task 2.

### Task 2: Drive expansion and same-day restoration

**Files:**
- Modify: `src/app/workbench.js`
- Modify: `scripts/test-report-form-disclosure.mjs`

**Interfaces:**
- Consumes: `today`, `currentAuthorKey`, `normalizedReportAuthor(author)`, `updateReportHelp()`, `editTodayReport(reportId)`, and `state.reports`.
- Produces: `setReportFormExpanded(expanded)`, `saveReportResumePointer(report)`, `clearReportResumePointer()`, and `restoreReportFormForToday()`.

- [ ] **Step 1: Add failing behavior assertions**

Assert that role changes call the expansion controller, empty roles keep details hidden, successful saves persist a pointer, reset clears it, edit expands before filling, and startup restoration rejects a date other than `today`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-report-form-disclosure.mjs`

Expected: FAIL because the controller and resume functions are missing.

- [ ] **Step 3: Implement the minimal controller and pointer**

Use a dedicated localStorage key. `setReportFormExpanded(Boolean(role))` toggles `hidden` and an `aria-expanded` attribute. Persist only `{ date, role, author, reportId }` after a confirmed save. At startup, validate all four values against today's report and current author before calling the existing edit loader; otherwise clear the pointer and collapse. Reset clears the pointer and restores the empty role.

- [ ] **Step 4: Run focused and full automated checks**

Run the disclosure test, `scripts/check-project.mjs`, JavaScript syntax checks, the existing task sync and GMV range tests, then the production build. Every command must exit 0.

### Task 3: Browser regression

**Files:**
- Verify only: built `dist/`

**Interfaces:**
- Consumes: local Pages preview on `127.0.0.1:8797`.
- Produces: verified desktop and mobile interaction states.

- [ ] **Step 1: Verify initial collapsed state**

Confirm the five basic fields are visible, the role value is empty, `#reportDetails` is hidden, and the weekly panel follows the compact form panel.

- [ ] **Step 2: Verify role expansion and reset**

Select each role and confirm details render. Reset and confirm the role becomes empty and details hide.

- [ ] **Step 3: Verify same-day and cross-day pointer logic**

Use a local non-production report fixture or controlled browser storage to confirm a valid same-day pointer restores its matching report and an expired pointer clears without loading content.

- [ ] **Step 4: Verify responsive layout and console**

Check desktop and mobile widths for overflow, then confirm no new console errors.
