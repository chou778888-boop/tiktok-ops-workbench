# 总览首屏紧凑经营指挥台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除总览营销式大标题，将日期筛选并入经营焦点主表面，并在数据不足时使用紧凑、无趋势误导的状态。

**Architecture:** 保留现有原生 HTML、模块化 CSS、Canvas 绘图和日期/利润数据接口。HTML 只移动现有上下文与筛选控件；CSS 使用一个跨两列的控制栏和 46:54 经营主体；JavaScript 根据 `model.points.filter(point => point.synced).length` 切换趋势与数据不足状态，并生成不重复的指标。

**Tech Stack:** 静态 HTML、原生 JavaScript、Canvas、模块化 CSS、Node `assert` 合约测试、esbuild、Cloudflare Pages 本地预览。

## Global Constraints

- 不修改日期范围计算、利润计算、同步逻辑、跳转目标或团队业务数据。
- 不引入 React、Figma 运行时、GSAP 或新的生产依赖。
- 1180px 以上控制栏单行、经营主体左右并列；760px 以下控制栏紧凑两行。
- 320px 宽不得产生页面级横向滚动；长链接标题最多两行，路径安全省略。
- “实际到手”和“暂算利润”各只展示一次。

---

### Task 1: 将日期上下文并入经营焦点主表面

**Files:**
- Modify: `index.html:132-220`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: 现有 `#overviewDataDate`、`[data-range-toolbar="overview"]`、`[data-range-preset]`、`[data-range-date]`、`[data-range-meaning]`。
- Produces: `.overview-command-bar`，位于 `.overview-focus-surface` 内并处于 `.overview-profit-focus` 与 `.overview-pulse-ribbon` 之前。

- [ ] **Step 1: 写失败的结构合约测试**

在 `scripts/test-premium-shell-overview.mjs` 中加入：

```js
assert.doesNotMatch(html, /class="overview-command-copy"/, "总览不得保留营销式大标题区");
assert.match(
  html,
  /class="overview-focus-surface"[\s\S]*?class="overview-command-bar"[\s\S]*?id="overviewDataDate"[\s\S]*?data-range-toolbar="overview"[\s\S]*?class="overview-profit-focus"/,
  "日期上下文和筛选必须成为经营焦点表面的首行"
);
```

- [ ] **Step 2: 运行测试并确认因旧 Hero 仍存在而失败**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL，提示“总览不得保留营销式大标题区”。

- [ ] **Step 3: 最小修改 HTML 结构**

删除 `.overview-page-heading` 与 `.overview-command-copy`，把原 `.overview-heading-controls` 内容改为：

```html
<header class="overview-command-bar">
  <div class="overview-command-context">
    <div class="kicker"><span class="pulse"></span><span id="overviewDataDate">今日经营总览</span></div>
    <span class="data-range-meaning" data-range-meaning></span>
  </div>
  <div class="data-range-toolbar overview-range-toolbar" data-range-toolbar="overview" aria-label="总览日期筛选">
    <!-- 保留现有快捷按钮和日期 input -->
  </div>
</header>
```

- [ ] **Step 4: 运行聚焦测试**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: 新结构断言通过；旧标题断言需按新设计删除或替换。

### Task 2: 建立紧凑控制栏和高级连续表面

**Files:**
- Modify: `src/styles/modules/19-premium-shell-overview.css:270-620`
- Modify: `src/styles/modules/19-premium-shell-overview.css:1120-1255`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: Task 1 的 `.overview-command-bar` 与现有 `.overview-focus-surface`。
- Produces: 桌面 `grid-template-areas: "toolbar toolbar" "focus pulse"`，主体列 `minmax(0, 0.92fr) minmax(0, 1.08fr)`；1180px 以下为三行同表面结构。

- [ ] **Step 1: 写失败的布局合约测试**

```js
assert.match(premiumStyles, /\.overview-focus-surface\s*\{[\s\S]*?grid-template-areas:\s*"toolbar toolbar"\s*"focus pulse"/);
assert.match(premiumStyles, /\.overview-command-bar\s*\{[\s\S]*?grid-area:\s*toolbar/);
assert.doesNotMatch(premiumStyles, /\.overview-command-copy h1\s*\{/);
assert.match(premiumStyles, /@media \(max-width: 1180px\)[\s\S]*?"toolbar"\s*"focus"\s*"pulse"/);
```

- [ ] **Step 2: 运行测试并确认旧两列结构失败**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL，旧样式只有 `"focus pulse"`。

- [ ] **Step 3: 实现桌面与响应式 CSS**

要点：

```css
.overview-focus-surface {
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  grid-template-areas: "toolbar toolbar" "focus pulse";
}
.overview-command-bar {
  grid-area: toolbar;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 56px;
}
```

删除 `.overview-page-heading`、`.overview-command-copy` 及其大字号标题规则。控制栏用细分隔线连接主体；桌面日期按钮保持 34–36px，高度不制造第二张卡片。760px 以下改成两行，快捷日期四列、日期 input 全宽。

- [ ] **Step 4: 运行聚焦测试**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: PASS。

### Task 3: 去除重复指标并实现单日数据紧凑状态

**Files:**
- Modify: `index.html:195-205`
- Modify: `src/app/workbench/11-overview-pulse-model.js`
- Modify: `src/app/workbench/10-overview.js:790-885`
- Modify: `src/styles/modules/19-premium-shell-overview.css:620-820`
- Modify: `scripts/test-overview-pulse-model.mjs`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: `model.points[].synced`、`model.metrics.itemsSold`、`model.metrics.gmv`、`model.healthLabel`、`model.available`。
- Produces: `overviewPulseDensity(points)` 返回 `{ syncedDays, sparse }`；渲染层据此切换 `.overview-pulse-ribbon.is-sparse`、`#overviewPulseChart.hidden`、`#overviewPulseSparse.hidden`。

- [ ] **Step 1: 写失败的行为与结构测试**

在 `src/app/workbench/11-overview-pulse-model.js` 新增纯函数：

```js
function overviewPulseDensity(points) {
  const syncedDays = (points || []).filter((point) => point?.synced).length;
  return { syncedDays, sparse: syncedDays < 2 };
}
```

测试固定期望：0 天与 1 天 `sparse === true`，2 天 `sparse === false`。结构测试要求存在 `#overviewPulseSparse`，且 `metricRows` 不再包含“实际 / 预估到手”或利润标签。

- [ ] **Step 2: 运行聚焦测试并确认函数/结构缺失**

Run: `node scripts/test-overview-pulse-model.mjs && node scripts/test-premium-shell-overview.mjs`
Expected: FAIL，提示生产函数或稀疏状态元素缺失。

- [ ] **Step 3: 实现最小生产逻辑**

在图表容器中加入：

```html
<div class="overview-pulse-sparse" id="overviewPulseSparse" hidden>
  <b>趋势数据正在形成</b>
  <span id="overviewPulseSparseDetail">已同步 0/7 天，至少需要 2 个有效数据日。</span>
  <small>店铺通常 16:00 更新，工作台计划 17:00 同步</small>
</div>
```

`renderOverviewProfitPulse()` 使用 `overviewPulseDensity(model.points)`：稀疏时隐藏 Canvas、显示说明并跳过绘图；完整时恢复 Canvas。四项趋势指标改为：近7日销量、近7日GMV、有效数据、经营状态。

- [ ] **Step 4: 运行聚焦测试**

Run: `node scripts/test-overview-pulse-model.mjs && node scripts/test-premium-shell-overview.mjs`
Expected: PASS。

### Task 4: 全量验证与真实交互回归

**Files:**
- Verify: `dist/`

**Interfaces:**
- Consumes: Tasks 1–3 的最终页面。
- Produces: 可在 `http://127.0.0.1:52098/` 验证的构建版本。

- [ ] **Step 1: 运行完整项目检查**

Run: `npm run check`
Expected: 所有检查退出码 0。

- [ ] **Step 2: 构建生产静态包**

Run: `npm run build`
Expected: 输出 `Cloudflare static bundle ready: dist/ (<release>)`。

- [ ] **Step 3: 检查格式与工作树边界**

Run: `git diff --check`
Expected: 无输出，退出码 0。

- [ ] **Step 4: 浏览器回归**

在 1920、1440、1280、760、390、320px 检查：日期筛选、指定日期、重点链接、处理按钮、图表稀疏/完整状态、长标题、动态数字和横向溢出。逐个点击今日、昨日、近7日、近30日和日期选择器，确认经营上下文、焦点、趋势和异常摘要同步更新。
