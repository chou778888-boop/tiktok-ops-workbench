# 利润工作台桌面端高密度实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 仅在宽度大于 900px 的桌面端压缩单条链接利润详情页约 25%–30%，让 1440×900 首屏出现平台结算入口，同时保持手机端尺寸与交互不变。

**Architecture:** 在现有利润模块 CSS 末端增加独立的桌面高密度媒体查询，通过覆盖详情页间距、链接信息卡、指标卡、趋势区和结算区的尺寸实现；不更改模板结构或数据模型。回归测试直接检查媒体查询边界与关键尺寸令牌，浏览器测试负责验证真实首屏占用和移动端隔离。

**Tech Stack:** 原生 JavaScript、CSS Grid/Flexbox、Node.js 断言测试、Codex 内置浏览器。

## Global Constraints

- 仅在桌面断点（宽度大于 900px）启用高密度规则，现有平板和手机规则保持不变。
- 单条链接详情页模块间距为 12px，主要内容模块内边距为 15px。
- 五项核心指标保持一行，卡片最小高度为 78px。
- 桌面主趋势图高度为 156px，必须保留 7 个销量柱、1 条价格线和 2 个当日强调标记。
- 不使用页面整体缩放，不修改利润计算、结算状态、数据录入逻辑或其他工作台模块。
- 当前工作树包含用户的其他未提交改动；只修改本计划列出的文件，不提交或合并。

---

### Task 1: 锁定桌面高密度行为基线

**Files:**
- Inspect: `http://127.0.0.1:8797/`
- Test: Codex 内置浏览器 1440×900 真实计算尺寸

**Interfaces:**
- Consumes: 当前 `JZZ 主链接` 的浏览器渲染结果。
- Produces: 信息卡高度、指标卡高度、趋势 SVG 高度和首屏结算可见性的失败基线。

- [ ] **Step 1: 在真实桌面视口读取当前尺寸**

读取 `.profit-listing-context`、`.profit-summary-band.listing-summary .profit-metric`、`.profit-seven-day-section .profit-trend-plot svg` 的 `getBoundingClientRect().height`，并检查 `.profit-settlement-panel` 是否进入 1440×900 首屏。

- [ ] **Step 2: 确认当前行为不符合目标**

Expected: 指标卡高度大于 78px、趋势 SVG 高度大于 156px，且平台结算标题未进入首屏。

- [ ] **Step 3: 保留失败基线并进入 Task 2**

记录全部实际尺寸；此任务不修改生产样式。

### Task 2: 实施桌面端紧凑布局并验收

**Files:**
- Modify: `src/styles/modules/18-profit-template.css`
- Verify: `scripts/test-profit-template.mjs`、Codex 内置浏览器

**Interfaces:**
- Consumes: Task 1 的真实浏览器失败基线。
- Produces: 只在桌面端生效的高密度布局，不新增 JavaScript 接口。

- [ ] **Step 1: 加入最小桌面覆盖规则**

在现有响应式规则之前加入：

```css
@media (min-width: 901px) {
  .profit-detail-page { gap: 12px; }
  .profit-detail-page .profit-breadcrumb { font-size: 9px; }
  .profit-detail-page .profit-listing-context { gap: 16px; padding: 14px 16px; }
  .profit-detail-page .profit-listing-context .profit-code-mark { width: 44px; height: 44px; border-radius: 12px; }
  .profit-detail-page .profit-listing-context h2 { font-size: 18px; }
  .profit-detail-page .profit-listing-context p { margin-top: 3px; }
  .profit-summary-band.listing-summary .profit-metric { min-height: 78px; padding: 11px 14px; }
  .profit-summary-band.listing-summary .profit-metric > b { margin-top: 4px; font-size: clamp(18px, 1.65vw, 24px); }
  .profit-summary-band.listing-summary .profit-metric > small { margin-top: 4px; }
  .profit-detail-page :is(.profit-seven-day-section, .profit-settlement-panel, .profit-entry-section, .profit-expense-section) { padding: 15px; }
  .profit-detail-page .profit-block-title { margin-bottom: 10px; }
  .profit-detail-page .profit-block-title h3 { font-size: 16px; }
  .profit-detail-page .profit-block-title p { margin-top: 3px; }
  .profit-detail-page .profit-trend-chart { gap: 8px; padding: 11px 13px 9px; }
  .profit-seven-day-section .profit-trend-plot svg { width: 100%; height: 156px; aspect-ratio: auto; }
  .profit-detail-page .profit-trend-axis > span { gap: 2px; }
  .profit-detail-page .profit-settlement-grid > div { padding: 10px 12px; }
}
```

- [ ] **Step 2: 运行聚焦回归测试确认业务模板未受影响**

Run: `node scripts/test-profit-template.mjs`

Expected: PASS，输出 `product-listing-profit-redesign`；不新增只检查 CSS 文本的脆弱断言。

- [ ] **Step 3: 运行完整项目检查与生产构建**

Run: `npm run check`

Expected: exit 0，全部测试通过。

Run: `node scripts/build-cloudflare.mjs`

Expected: exit 0，输出 `Cloudflare static bundle ready`。

- [ ] **Step 4: 浏览器桌面验收**

在 `http://127.0.0.1:8797/` 进入“利润与成本 → JZZ → JZZ 主链接”，以 1440×900 检查：无横向溢出；五项指标同排；趋势图完整；首屏出现“平台结算”标题；图表包含 7 个柱、1 条线、2 个当日标记。

- [ ] **Step 5: 浏览器手机验收**

以 390×844 检查：无横向溢出；SKU 表切换为卡片；图表高度仍遵循现有手机规则；结算内容单列；页面不存在桌面高密度规则导致的文字挤压。

- [ ] **Step 6: 保留工作树供继续迭代**

只报告 `scripts/test-profit-template.mjs`、`src/styles/modules/18-profit-template.css`、规格和计划文件的改动；不提交、不合并、不清理其他文件。
