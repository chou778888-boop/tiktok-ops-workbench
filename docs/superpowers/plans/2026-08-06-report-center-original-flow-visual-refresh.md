# 日报中心原流程视觉升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复日报中心“汇总 → 行动重点 → 全宽岗位填写”的原始页面顺序，只升级视觉表现，并保持全部日报业务行为不变。

**Architecture:** 只重排 `#reports` 中已经存在的语义容器，保留所有动态容器 ID 与 `reportDetails` 渐进展开结构；以现有末尾样式模块覆盖日报中心视觉，不改 JavaScript 数据流。结构契约测试保护页面顺序、全宽表单与响应式行为。

**Tech Stack:** 原生 HTML、CSS Grid、现有 JavaScript 工作台模块、Node.js 契约测试、Cloudflare Pages 构建脚本。

## Global Constraints

- 不改变岗位选项、字段顺序、默认值、校验规则、任务闭环规则和数据结构。
- 不修改 `src/app/workbench/30-reports.js` 的业务逻辑。
- 保留 `reportForm`、`reportDetails`、`reportMetrics`、`dailyDigest`、`dailyManagementBoard` 等现有 ID。
- 桌面端顶部汇总双列，行动重点与岗位表单全宽；手机端单列且页面不得横向溢出。
- 不引入新的依赖、组件框架、动画、渐变或发光效果。

---

### Task 1: 锁定恢复后的页面结构

**Files:**
- Modify: `scripts/test-report-command-center.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: 现有日报动态容器 ID 与 `reportDetails` 展开结构。
- Produces: `report-overview-grid`、`report-management-section`、`report-entry-panel` 三段按顺序排列的全宽日报主流程。

- [ ] **Step 1: 将结构契约改为原流程要求**

在 `scripts/test-report-command-center.mjs` 中断言：

```js
const overviewIndex = html.indexOf('class="report-overview-grid');
const boardIndex = html.indexOf('id="dailyManagementBoard"');
const formIndex = html.indexOf('id="reportForm"');
assert.ok(overviewIndex >= 0 && boardIndex >= 0 && formIndex >= 0, "日报主流程容器必须存在");
assert.ok(overviewIndex < boardIndex && boardIndex < formIndex, "页面顺序必须是汇总、行动重点、岗位填写");
assert.doesNotMatch(html, /class="[^"]*report-command-grid/, "岗位表单不能再放在 60\/40 侧栏布局中");
assert.match(html, /id="reportDetails"\s+hidden/, "岗位详细字段必须继续渐进展开");
```

- [ ] **Step 2: 运行结构测试并确认失败**

Run: `node scripts/test-report-command-center.mjs`

Expected: FAIL，原因是当前仍存在 `report-command-grid`，且岗位表单排在行动重点之前。

- [ ] **Step 3: 重排日报中心 HTML**

在 `report-page-intro` 后按以下结构放置现有容器：

```html
<div class="report-overview-grid">
  <section class="report-summary report-results-panel" aria-label="今日经营结果">...</section>
  <section class="panel report-digest-panel">...</section>
</div>
<section class="report-management-section" aria-labelledby="reportManagementTitle">...</section>
<div class="panel report-entry-panel">
  <div class="panel-head">...</div>
  <form class="form-grid" id="reportForm">...</form>
</div>
```

删除只服务于 60/40 布局的 `report-command-grid` 和 `report-command-context` 包裹，不删除或重命名任何动态 ID；保留基础字段、`report-entry-ready`、`reportDetails` 及其全部内部内容和顺序。

- [ ] **Step 4: 运行结构与展开测试**

Run: `node scripts/test-report-command-center.mjs && node scripts/test-report-form-disclosure.mjs`

Expected: 两个测试均 PASS。

- [ ] **Step 5: 提交结构调整**

```bash
git add index.html scripts/test-report-command-center.mjs
git commit -m "refactor: restore report center flow"
```

### Task 2: 只升级日报中心视觉

**Files:**
- Modify: `src/styles/modules/20-report-command-center.css`
- Test: `scripts/test-report-command-center.mjs`

**Interfaces:**
- Consumes: Task 1 生成的 `report-overview-grid`、`report-management-section`、`report-entry-panel`。
- Produces: 双列汇总、全宽行动区和全宽岗位表单的响应式视觉系统。

- [ ] **Step 1: 添加视觉与响应式契约**

在 `scripts/test-report-command-center.mjs` 中增加以下断言：

```js
assert.match(commandStyles, /\.report-overview-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.08fr\)\s+minmax\(340px,\s*0\.92fr\)/, "桌面汇总区必须保持稳定双列");
assert.match(commandStyles, /\.report-entry-panel\s*\{[\s\S]*?width:\s*100%/, "岗位填写卡必须使用完整宽度");
assert.match(commandStyles, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.report-overview-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/, "中小屏汇总区必须切换单列");
assert.doesNotMatch(commandStyles, /linear-gradient|radial-gradient|filter:\s*blur/, "日报视觉不得使用渐变或模糊发光");
```

- [ ] **Step 2: 运行测试并确认视觉契约失败**

Run: `node scripts/test-report-command-center.mjs`

Expected: FAIL，当前样式仍是 60/40 命令中心，并包含渐变背景。

- [ ] **Step 3: 重写日报专属样式模块**

保留模块文件与导入顺序，删除 `.report-command-grid`、`.report-command-context` 的布局规则，并实现：

```css
body.workbench-entered #reports .report-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(340px, 0.92fr);
  align-items: stretch;
  gap: 14px;
}

body.workbench-entered #reports .report-entry-panel {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(18, 32, 27, 0.1);
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 16px 36px rgba(18, 32, 27, 0.06);
}

@media (max-width: 900px) {
  body.workbench-entered #reports .report-overview-grid {
    grid-template-columns: 1fr;
  }
}
```

同时统一标题、数字、摘要、行动卡和表单分组的字号、间距、边框、圆角及阴影；使用深墨绿纯色作为经营结果主卡，浅灰绿作为辅助表面；保留现有 `report-entry-ready`、表单字段与移动端规则。

- [ ] **Step 4: 运行日报契约与布局检测**

Run: `node scripts/test-report-command-center.mjs && node /Users/a111/.codex/skills/impeccable/scripts/detect.mjs --json --scope layout index.html src/styles/modules/20-report-command-center.css`

Expected: 契约测试 PASS；布局检测没有 error。

- [ ] **Step 5: 提交视觉调整**

```bash
git add src/styles/modules/20-report-command-center.css scripts/test-report-command-center.mjs
git commit -m "style: polish original report center flow"
```

### Task 3: 全量回归与本地预览

**Files:**
- Verify: `index.html`
- Verify: `src/styles/modules/20-report-command-center.css`
- Verify: `src/app/workbench/30-reports.js`

**Interfaces:**
- Consumes: Task 1 与 Task 2 的最终页面和样式。
- Produces: `8797` 可查看的最新 Cloudflare 静态构建。

- [ ] **Step 1: 运行完整项目检查**

Run: `pnpm check`

Expected: 所有脚本退出码为 0，日报结构、展开和任务同步测试全部 PASS。

- [ ] **Step 2: 构建 Cloudflare 静态包**

Run: `pnpm build`

Expected: 输出 `Cloudflare static bundle ready: dist/ (<release>)`。

- [ ] **Step 3: 更新本地预览副本并重启一次服务**

Run: `ditto dist /private/tmp/tiktok-workbench-full-preview/dist`

Run: `launchctl kickstart -k gui/501/com.codex.tiktok-workbench.8797`

Expected: `127.0.0.1:8797` 重新监听，并加载与 `dist/release.json` 相同的构建哈希。

- [ ] **Step 4: 在浏览器验证关键行为**

在 `390px`、`760px`、`1440px` 三个宽度检查：页面主顺序正确，文档 `scrollWidth === clientWidth`；选择“售后组”后 `reportDetails.hidden === false`，岗位表单占完整内容宽度，右侧没有残留空栏；保存、编辑与摘要容器仍可用。

- [ ] **Step 5: 最终交付**

报告构建哈希、完整检查结果和浏览器验证结果；不修改或提交范围外文件。
