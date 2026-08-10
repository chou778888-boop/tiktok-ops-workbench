# 经营脉冲工作台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的方向 A 落实为真实可用的经营脉冲首屏，同时保留工作台全部业务功能和利润口径。

**Architecture:** 新增一个纯展示模型模块，把利润选择器输出转换为首屏焦点模型；总览控制器只负责渲染与绘图。HTML 负责稳定语义结构，最终级联 CSS 模块负责顶部经营坞、荧光焦点、七天脉冲和响应式规则。

**Tech Stack:** 原生 HTML、CSS、JavaScript、Canvas、Node.js 合约测试、现有 Cloudflare Pages 构建

## Global Constraints

- 不修改利润公式、仓库样例、结算口径、费用逻辑和同步数据。
- 不新增运行时依赖，不直接编辑 `dist/`。
- 保留日报、任务、达人、学院、数据管理和利润页现有功能。
- 桌面端移除固定左侧 ERP 导航；约 320px 宽度不得整体横向溢出。
- 当前工作树有其他未提交内容；不得提交、覆盖或整理无关改动。

---

### Task 1: 经营脉冲结构合约

**Files:**
- Modify: `index.html`
- Modify: `scripts/test-premium-shell-overview.mjs`
- Create: `scripts/test-overview-pulse-model.mjs`
- Modify: `scripts/app-sources.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: 现有 `#overview`、`#heroStats`、日期筛选和利润模块源码顺序。
- Produces: `#overviewProfitFocus`、`#overviewProfitAction`、`#overviewPulseChart`、`#overviewPulseDays`、`#overviewPulsePath`。

- [ ] **Step 1: 写入失败的结构断言**

```js
assert.match(html, /class="topbar premium-topbar workspace-pulse-dock"/);
assert.match(html, /id="overviewProfitFocus"/);
assert.match(html, /id="overviewPulseChart"/);
assert.doesNotMatch(html, /workspace-rail/);
```

- [ ] **Step 2: 运行聚焦测试并确认旧结构失败**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL，提示缺少 `workspace-pulse-dock` 或经营脉冲节点。

- [ ] **Step 3: 重组首屏语义 HTML 与源码清单**

将顶部导航类名替换为 `workspace-pulse-dock`，把旧信号带替换为焦点面、七天脉冲画布和真实指标容器；在 `scripts/app-sources.mjs` 中把 `11-overview-pulse-model.js` 放在 `10-overview.js` 之后。

- [ ] **Step 4: 运行结构测试**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: PASS。

### Task 2: 纯模型与真实利润焦点

**Files:**
- Create: `src/app/workbench/11-overview-pulse-model.js`
- Modify: `src/app/workbench/10-overview.js`
- Test: `scripts/test-overview-pulse-model.mjs`

**Interfaces:**
- Consumes: `selectProductProfitRows(repository, dateKey)`、`selectProfitAttentionItems(productRows)` 的返回值。
- Produces: `makeOverviewPulseModel(productRows, attentionItems, activeDate)` 和 `overviewProfitPulseModel()`。

- [ ] **Step 1: 写入纯函数失败测试**

```js
const model = makeOverviewPulseModel([sampleProductRow], [sampleAttention], "2026-08-03");
assert.equal(model.productCode, "JZZ");
assert.equal(model.metrics.itemsSold, 39);
assert.equal(model.metrics.receivedAmount, 631.47);
assert.equal(model.metrics.finalProfit, 163.47);
assert.equal(model.points.filter((point) => point.synced).length, 1);
```

- [ ] **Step 2: 运行测试并确认函数尚未存在**

Run: `node scripts/test-overview-pulse-model.mjs`
Expected: FAIL，提示 `makeOverviewPulseModel` 未定义。

- [ ] **Step 3: 实现最小纯模型**

模型选择首个有效产品和链接，生成产品/店铺/链接/SKU 路径、利润指标、注意事项和七天价格/销量点；无数据时返回明确空模型，不生成假数值。

- [ ] **Step 4: 接入总览渲染与 Canvas**

`renderOverview()` 调用 `renderOverviewProfitPulse()`；画布仅对 `synced === true` 的日期绘制成交均价点和销量柱，并更新真实指标与主动作目标。

- [ ] **Step 5: 运行模型与现有利润测试**

Run: `node scripts/test-overview-pulse-model.mjs && node scripts/test-profit-template.mjs`
Expected: 两项均 PASS。

### Task 3: 顶部经营坞与方向 A 视觉系统

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/modules/19-premium-shell-overview.css`
- Modify: `src/app/workbench/70-navigation.js`

**Interfaces:**
- Consumes: Task 1 的稳定类名和 Task 2 的 `data-listing-id`。
- Produces: 横向经营坞、编辑式标题、荧光焦点、七天脉冲、一次性分层动效和具体链接跳转。

- [ ] **Step 1: 写入视觉与交互合约断言**

```js
assert.match(premiumStyles, /\.workspace-pulse-dock/);
assert.match(premiumStyles, /\.overview-profit-focus/);
assert.match(premiumStyles, /prefers-reduced-motion/);
assert.match(navigationSource, /overviewProfitAction/);
```

- [ ] **Step 2: 运行聚焦测试并确认失败**

Run: `node scripts/test-premium-shell-overview.mjs`
Expected: FAIL，提示新样式或链接动作缺失。

- [ ] **Step 3: 实现方向 A 最终级联**

桌面端恢复横向顶部经营坞；焦点面使用单一半透明荧光绿材质；首屏使用留白、细线和不对称层级，移除旧深色 KPI 带与白卡片墙视觉。

- [ ] **Step 4: 实现具体链接跳转**

点击 `#overviewProfitAction` 时，把 `profitWorkspaceState.view` 设置为 `listing`，写入 `activeListingId`，切换到 `costing` 并渲染利润详情。

- [ ] **Step 5: 运行聚焦测试**

Run: `node scripts/test-premium-shell-overview.mjs && node scripts/test-app-sources.mjs && node scripts/test-app-boundaries.mjs`
Expected: 全部 PASS。

### Task 4: 完整验证与设计 QA

**Files:**
- Create: `design-qa.md`
- Modify only if QA finds P0/P1/P2 issues: files from Tasks 1–3

**Interfaces:**
- Consumes: 已选方向 A 视觉板与本地构建。
- Produces: `design-qa.md`，最终行为必须为 `final result: passed`。

- [ ] **Step 1: 运行完整检查与构建**

Run: `pnpm check && pnpm build && git diff --check`
Expected: 所有检查通过，构建输出新的 release hash，无空白错误。

- [ ] **Step 2: 在同一浏览器检查桌面端**

打开本地工作台，检查 1440px 首屏、利润链接跳转、日期筛选、日报入口与控制台；保存首屏截图。

- [ ] **Step 3: 检查窄屏**

在约 390px 和 320px 检查导航、中文换行、主动作、趋势与表格局部滚动，确认页面整体无横向溢出。

- [ ] **Step 4: 执行同视口设计对比**

把方向 A 参考与最新实现放在同一对比输入中，记录间距、层级、焦点材质、文本断行和交互状态差异；修复全部 P0/P1/P2。

- [ ] **Step 5: 写入最终 QA 结论**

`design-qa.md` 必须包含实际检查视口、功能结果、剩余 P3（如有）以及 `final result: passed`。

## Self-Review

- Spec coverage: 四个任务覆盖全局外壳、真实利润模型、链接跳转、七天趋势、响应式、功能回归与视觉 QA。
- Placeholder scan: 无 TBD、TODO、“稍后实现”或未定义接口。
- Type consistency: `makeOverviewPulseModel`、`overviewProfitPulseModel`、`overviewProfitAction` 和 `data-listing-id` 在任务之间命名一致。
- Safety: 计划明确不提交共享脏工作树、不修改 `dist/`、不触碰利润底层逻辑。
