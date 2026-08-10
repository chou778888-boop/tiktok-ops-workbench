# 日报中心填写优先工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将日报中心首屏改造成填写优先的 60/40 工作台，同时保留全部现有日报业务逻辑。

**Architecture:** 只重排 `#reports` 内现有语义块，所有动态容器 ID 保持不变；新增一个末尾加载的日报中心专属 CSS 模块完成布局和响应式覆盖。使用结构契约测试保护 DOM 顺序、模块注册和关键断点。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Node.js `assert` 契约测试、Cloudflare 静态构建。

## Global Constraints

- 不更改日报数据模型、保存流程、任务同步、自动周报或 AI 分析逻辑。
- 保留 `reportViewDate`、`reportProgress`、`reportMetrics`、`dailyDigest`、`reportForm`、`dailyManagementBoard` 等现有 ID。
- 桌面端首屏为 60/40；中屏与手机端按任务顺序单列。
- 重要文案不得省略或用省略号截断，页面不得产生横向滚动。
- 当前为共享脏工作树，不提交、不合并、不推送，只保留工作区改动。

---

### Task 1: 建立日报中心结构契约

**Files:**
- Create: `scripts/test-report-command-center.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `index.html`、`src/styles/workbench.css`、`src/styles/modules/20-report-command-center.css`
- Produces: `report-entry-command-center-contract` 测试阶段

- [ ] **Step 1: 写失败测试**

验证以下结构：`report-page-intro`、`report-command-grid`、`report-entry-panel`、`report-command-context`、`report-results-panel`、`report-digest-panel`；验证 `reportForm` 位于 `reportMetrics` 和 `dailyManagementBoard` 之前；验证样式清单加载模块 20，并包含 60/40 和 2×2 规则。

- [ ] **Step 2: 运行测试确认 RED**

Run: `node scripts/test-report-command-center.mjs`

Expected: FAIL，提示缺少 `report-page-intro` 或模块 20。

- [ ] **Step 3: 将新测试加入全量检查**

在 `package.json` 的 `check` 命令中将新测试放在 `test-report-form-disclosure.mjs` 之后。

### Task 2: 重排日报中心首屏语义结构

**Files:**
- Modify: `index.html`
- Test: `scripts/test-report-command-center.mjs`
- Test: `scripts/test-report-form-disclosure.mjs`

**Interfaces:**
- Consumes: 现有日报动态容器和表单 ID
- Produces: 填写优先 DOM 顺序与六个专属布局类

- [ ] **Step 1: 增加页面标题区**

将 `reportSummaryTitle`、`reportSummarySubtitle`、`reportViewDate` 和 `reportProgress` 移到 `report-page-intro`。

- [ ] **Step 2: 建立 60/40 工作台**

在 `report-command-grid` 中先放 `report-entry-panel` 和完整 `reportForm`，随后放 `report-command-context`。上下文内部依次放 `report-results-panel`（包含 `reportMetrics`）和 `report-digest-panel`（包含 `dailyDigest`）。

- [ ] **Step 3: 保持行动重点与后续模块顺序**

将 `dailyManagementBoard` 放在首屏工作台之后；自动周报和日报记录保持原顺序。

- [ ] **Step 4: 运行结构与渐进披露测试**

Run: `node scripts/test-report-command-center.mjs && node scripts/test-report-form-disclosure.mjs`

Expected: 结构测试仍因 CSS 模块缺失而失败；渐进披露测试 PASS。

### Task 3: 实现日报中心专属视觉与响应式

**Files:**
- Create: `src/styles/modules/20-report-command-center.css`
- Modify: `src/styles/workbench.css`
- Test: `scripts/test-report-command-center.mjs`

**Interfaces:**
- Consumes: Task 2 的六个布局类和现有主题变量
- Produces: 桌面 60/40、行动重点 2×2、中屏与手机单列布局

- [ ] **Step 1: 注册独立样式模块**

在 `workbench.css` 最后导入 `20-report-command-center.css`。

- [ ] **Step 2: 实现桌面工作台**

为标题区设置紧凑标题与日期进度控件；`report-command-grid` 使用 `minmax(0, 1.45fr) minmax(340px, 0.95fr)`；表单为明亮主表面，经营结果为深色表面，摘要为浅色表面。

- [ ] **Step 3: 实现行动矩阵与低空状态高度**

`dailyManagementBoard` 使用两列；卡片最小高度不超过 168px，空状态最小高度不超过 82px。

- [ ] **Step 4: 实现中屏和手机结构**

在 1180px 以下改为单列；760px 以下表单基础字段单列、日期进度分行、行动矩阵单列，控件最小高度 42px。

- [ ] **Step 5: 运行 GREEN 测试与检测器**

Run: `node scripts/test-report-command-center.mjs && node /Users/a111/.codex/skills/impeccable/scripts/detect.mjs --json --scope layout index.html src/styles/modules/20-report-command-center.css`

Expected: 测试 PASS，检测器无未解释项。

### Task 4: 构建与浏览器验收

**Files:**
- Verify only: `dist/`

**Interfaces:**
- Consumes: 完成的结构和样式
- Produces: 可在 8797 预览的日报中心新版

- [ ] **Step 1: 运行完整检查和构建**

Run: `pnpm check && pnpm build`

Expected: 全部阶段 PASS，构建退出码 0。

- [ ] **Step 2: 更新独立本地预览**

Run: `ditto dist /private/tmp/tiktok-workbench-full-preview/dist`

- [ ] **Step 3: 验收桌面和手机**

在 1440×1000 和 390×844 下检查首屏任务顺序、无横向溢出、完整文案、表单控件和行动矩阵。

- [ ] **Step 4: 检查最终浏览器错误**

确认最终构建哈希对应的控制台 `error` / `warn` 为空，并把日报中心页面保留给用户查看。
