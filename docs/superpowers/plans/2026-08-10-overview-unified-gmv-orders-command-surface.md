# 总览统一 GMV / 成交订单指挥面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将总览首屏改为紧凑经营指挥面，并用一张深绿色双轴折线图统一展示店群近 7 日 GMV 与成交订单，待同步日不得误画为零。

**Architecture:** 在 `11-overview-pulse-model.js` 增加纯趋势模型和最近完整日模型，`10-overview.js` 只消费模型并负责 DOM/Canvas 渲染。删除总览的双分析模式与第二张大型链接趋势图，保留重点链接模型、利润口径和下钻入口；来源贡献与重点链接改为主图下方的紧凑证据带。

**Tech Stack:** 原生 HTML、CSS、JavaScript Canvas、Cloudflare Pages/D1、本地 Node 断言测试、Codex in-app Browser。

## Global Constraints

- 双线指标固定为店群 GMV 与店群成交订单数，使用同一滚动近 7 日范围。
- 没有日报记录的日期是“待同步”而不是真实零；存在日报但 GMV/订单为零时才显示零。
- 客单价只作为 `GMV ÷ 成交订单数` 派生信息，不增加第三条线。
- 单日待同步时，最近完整日指标必须明确标注日期，不得暗示为今日数据。
- 重点链接继续分开显示成交均价、实际到手和利润，不修改利润核算公式或持久化模型。
- 桌面端和约 320px 窄屏均不得整体横向溢出。
- 保留日报、任务、利润、达人和学院现有入口与用户数据。

---

### Task 1: 店群双线趋势与最近完整日纯模型

**Files:**
- Modify: `src/app/workbench/11-overview-pulse-model.js`
- Modify: `scripts/test-overview-pulse-model.mjs`

**Interfaces:**
- Consumes: `entries: Array<{date: string, gmv?: number, orders?: number}>`，`range: {start: string, end: string, days?: number}`。
- Produces: `makeOverviewOperatingTrendModel(entries, range)` 和 `latestCompleteOverviewDay(entries, selectedDate)`。
- `makeOverviewOperatingTrendModel` 返回 `{ points, summary }`；每个点为 `{dateKey, synced, gmv, orders, averageOrderValue}`。
- `latestCompleteOverviewDay` 返回 `null` 或 `{dateKey, gmv, orders, units, adSpend, adGmv, roi}`。

- [ ] **Step 1: 写入失败测试，证明待同步与真实零被区分**

在 `scripts/test-overview-pulse-model.mjs` 的 runtime export 中加入两个新函数，并加入以下手算 fixture：

```js
const operatingTrend = makeOverviewOperatingTrendModel([
  { date: "2026-08-03", gmv: 100, orders: 4 },
  { date: "2026-08-03", gmv: 50, orders: 1 },
  { date: "2026-08-04", gmv: 0, orders: 0 },
  { date: "2026-08-06", gmv: 20, orders: 2 }
], { start: "2026-08-03", end: "2026-08-09", days: 7 });

assert.deepEqual(operatingTrend.points[0], {
  dateKey: "2026-08-03", synced: true, gmv: 150, orders: 5, averageOrderValue: 30
});
assert.deepEqual(operatingTrend.points[1], {
  dateKey: "2026-08-04", synced: true, gmv: 0, orders: 0, averageOrderValue: null
});
assert.deepEqual(operatingTrend.points[2], {
  dateKey: "2026-08-05", synced: false, gmv: null, orders: null, averageOrderValue: null
});
assert.deepEqual(operatingTrend.summary, {
  gmv: 170, orders: 7, averageOrderValue: 24.29, syncedDays: 3, expectedDays: 7
});

assert.deepEqual(latestCompleteOverviewDay([
  { date: "2026-08-08", gmv: 200, orders: 10, units: 12, adSpend: 20, adGmv: 80 },
  { date: "2026-08-10", gmv: 999, orders: 99 }
], "2026-08-09"), {
  dateKey: "2026-08-08", gmv: 200, orders: 10, units: 12, adSpend: 20, adGmv: 80, roi: 4
});
assert.equal(latestCompleteOverviewDay([], "2026-08-09"), null);
```

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `node scripts/test-overview-pulse-model.mjs`

Expected: FAIL，因为 `makeOverviewOperatingTrendModel` 和 `latestCompleteOverviewDay` 尚未定义。

- [ ] **Step 3: 实现最小纯模型**

在 `11-overview-pulse-model.js` 中实现独立 UTC 日期展开、按日聚合和最近完整日查找。关键逻辑必须等价于：

```js
function overviewNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function overviewDateKeys(start, end) {
  const keys = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const limit = new Date(`${end}T00:00:00Z`);
  while (!Number.isNaN(cursor.getTime()) && cursor <= limit) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

function makeOverviewOperatingTrendModel(entries = [], range = {}) {
  const rows = Array.isArray(entries) ? entries : [];
  const dates = overviewDateKeys(range.start, range.end);
  const points = dates.map((dateKey) => {
    const dayRows = rows.filter((entry) => entry?.date === dateKey);
    if (!dayRows.length) return { dateKey, synced: false, gmv: null, orders: null, averageOrderValue: null };
    const gmv = dayRows.reduce((sum, entry) => sum + overviewNumber(entry.gmv), 0);
    const orders = dayRows.reduce((sum, entry) => sum + overviewNumber(entry.orders), 0);
    return {
      dateKey,
      synced: true,
      gmv,
      orders,
      averageOrderValue: orders > 0 ? Math.round(gmv / orders * 100) / 100 : null
    };
  });
  const synced = points.filter((point) => point.synced);
  const gmv = synced.reduce((sum, point) => sum + point.gmv, 0);
  const orders = synced.reduce((sum, point) => sum + point.orders, 0);
  return {
    points,
    summary: {
      gmv,
      orders,
      averageOrderValue: orders > 0 ? Math.round(gmv / orders * 100) / 100 : null,
      syncedDays: synced.length,
      expectedDays: dates.length
    }
  };
}
```

- [ ] **Step 4: 运行聚焦测试并确认 GREEN**

Run: `node scripts/test-overview-pulse-model.mjs`

Expected: PASS，既有 53 项加新增断言全部通过。

- [ ] **Step 5: 提交纯模型**

```bash
git add src/app/workbench/11-overview-pulse-model.js scripts/test-overview-pulse-model.mjs
git commit -m "feat: model overview gmv and order trend"
```

---

### Task 2: 统一首屏结构、双线 Canvas 与紧凑证据渲染

**Files:**
- Modify: `index.html`
- Modify: `src/app/workbench/10-overview.js`
- Modify: `src/app/workbench/00-runtime.js`
- Modify: `src/app/workbench/80-events.js`
- Modify: `scripts/test-gmv-trend-range.mjs`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: Task 1 的 `makeOverviewOperatingTrendModel(entries, range)`、`latestCompleteOverviewDay(entries, selectedDate)`，以及既有 DOM IDs `overviewDataDate`、`overviewDecisionTitle`、`overviewDecisionMetrics`、`overviewRiskAction`、`overviewProfitAction`。
- Produces: `overviewOperatingChart`、`overviewOperatingSummary`、`overviewOperatingEmpty`、`overviewEvidenceBand`、`overviewLinkDecisionMetrics`。
- Produces: `renderOverviewOperatingSurface()` 和 `drawOverviewOperatingChart(model)`。
- ResizeObserver 只观察 `[data-overview-operating-shell]`，在总览激活且容器尺寸变化时调用统一重绘。
- 删除总览 DOM：`overview-analysis-switch`、`overviewPulseChart`、`overviewPulseDays`、`overviewPulseSparse`；利润详情页不受影响。

- [ ] **Step 1: 更新结构契约测试并确认旧结构失败**

把 `scripts/test-premium-shell-overview.mjs` 中分析模式断言替换为以下行为契约：

```js
assert.match(html, /class="overview-command-bar"[\s\S]*?data-range-toolbar="overview"[\s\S]*?class="overview-decision-brief"/);
assert.equal((html.match(/id="overviewOperatingChart"/g) || []).length, 1);
assert.match(html, /id="overviewOperatingSummary"/);
assert.match(html, /id="overviewOperatingEmpty"[^>]*data-jump="reports"/);
assert.match(html, /class="overview-evidence-band"[^>]*id="overviewEvidenceBand"/);
assert.match(html, /id="overviewLinkDecisionMetrics"/);
assert.doesNotMatch(html, /overview-analysis-switch/);
assert.doesNotMatch(html, /id="overviewPulseChart"/);
assert.doesNotMatch(html, /id="overviewPulseDays"/);
assert.match(html, /id="overviewProfitAction"/);
assert.match(html, /id="overviewFocusReceived"/);
assert.match(html, /id="overviewFocusProfit"/);

assert.match(overviewSource, /function renderOverviewOperatingSurface\(/);
assert.match(overviewSource, /function drawOverviewOperatingChart\(/);
assert.doesNotMatch(overviewSource, /function setOverviewAnalysisMode\(/);
assert.doesNotMatch(runtimeSource, /activeOverviewAnalysisMode/);
assert.doesNotMatch(eventsSource, /data-overview-analysis-mode/);
```

同时更新 `scripts/test-gmv-trend-range.mjs`：

```js
assert.match(source, /makeOverviewOperatingTrendModel\(entriesInRange\(trendRange\), trendRange\)/);
assert.match(source, /function drawOverviewOperatingChart\(model\)/);
assert.match(source, /point\.synced/);
assert.match(source, /averageOrderValue/);
assert.match(source, /overviewOperatingChart/);
assert.doesNotMatch(source, /function drawGmvTrend\(/);
```

- [ ] **Step 2: 运行聚焦测试并确认 RED**

Run: `node scripts/test-gmv-trend-range.mjs`

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: 两者 FAIL，因为统一经营图、证据带和新绘图路径尚不存在。

- [ ] **Step 3: 重写总览主结构**

在 `index.html` 中：

1. 保留 `overview-focus-surface`，将日期控制条、判断区和同步动作区组织为连续表面。
2. 将 `overview-intelligence-grid` 内部替换为单个 `overview-operating-panel`。
3. 新主图结构包含标题“近 7 日 GMV 与成交订单”、周期徽标、摘要容器、Canvas 和统一空态按钮。
4. 主图下方创建两列 `overview-evidence-band`：左侧复用 `sourceInsight`、`sourceLegend`；右侧复用 `overviewProfitFocusTitle`、`overviewProfitFocusDetail`、实际到手、利润、价格/动销/动作和 `overviewProfitAction`。
5. 删除旧双面板切换、旧 GMV Canvas、来源 Canvas、链接趋势 Canvas 和日期格；不删除利润详情 DOM。

- [ ] **Step 4: 实现统一经营渲染路径**

在 `10-overview.js` 中：

1. `renderOverview()` 结束时调用 `renderOverviewOperatingSurface()`。
2. `renderOverviewOperatingSurface()` 以所选日期为锚点生成滚动 7 日范围，调用纯模型，填充周期、合计 GMV、订单、客单价、有效天数和来源贡献。
3. `drawOverviewOperatingChart(model)` 使用同一个 Canvas 绘制双轴、两条折线和待同步断点；遇到 `!point.synced` 时关闭当前 path，不能连接到零。
4. Hover 命中点显示日期、GMV、订单、客单价和“已同步/待同步”。
5. 所选单日没有数据时调用 `latestCompleteOverviewDay(allEntries, selectedDate)`，把最近完整日日期写入指标区标签并渲染该日指标；没有历史数据时使用 `—`。
6. `renderOverviewProfitPulse()` 改为只填充紧凑链接决策卡，不再计算密度或绘制链接 Canvas；指标包含成交均价、销量、GMV、实际到手和利润。
7. 来源贡献继续使用原聚合口径，但只渲染文本、占比条与金额列表，不再调用来源 Canvas。

- [ ] **Step 5: 删除旧分析模式状态与事件**

- 从 `00-runtime.js` 删除 `activeOverviewAnalysisMode`。
- 从 `10-overview.js` 删除 `overviewAnalysisLayoutMedia`、`renderOverviewAnalysisMode`、`setOverviewAnalysisMode`、`drawOverviewProfitPulse`、`drawGmvTrend` 和旧 Canvas 空态分支。
- 从 `80-events.js` 删除模式按钮委托；把 ResizeObserver 目标改为 `[data-overview-operating-shell]`，重绘函数改为 `renderOverviewOperatingSurface(true)`。
- 总览重新激活时始终同步统一经营表面，保持现有 revision 缓存策略。

- [ ] **Step 6: 运行全部结构与运行契约并确认 GREEN**

Run: `node scripts/test-overview-pulse-model.mjs`

Run: `node scripts/test-gmv-trend-range.mjs`

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: 全部 PASS，且旧模式、旧 Canvas 和缺失日补零路径不存在。旧 CSS 仍可保留到 Task 3，但运行时不得引用旧 DOM。

- [ ] **Step 7: 提交可运行结构与渲染**

```bash
git add index.html src/app/workbench/00-runtime.js src/app/workbench/10-overview.js src/app/workbench/80-events.js scripts/test-gmv-trend-range.mjs scripts/test-premium-shell-overview.mjs
git commit -m "feat: render unified gmv and order chart"
```

---

### Task 3: 高级首屏视觉、证据带与响应式

**Files:**
- Modify: `src/styles/modules/19-premium-shell-overview.css`
- Modify: `scripts/test-premium-shell-overview.mjs`

**Interfaces:**
- Consumes: Task 2 产生的 `.overview-operating-panel`、`.overview-operating-stage`、`.overview-evidence-band`、`.overview-link-decision`。
- Produces: 桌面 12 列首屏、全宽深绿主图、`0.88fr / 1.12fr` 证据带、760/320px 响应式。

- [ ] **Step 1: 写入样式契约失败测试**

```js
assert.match(premiumStyles, /\.overview-decision-brief\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 5fr\)\s+minmax\(0, 4fr\)\s+minmax\(240px, 3fr\)/);
assert.match(premiumStyles, /\.overview-operating-stage\s*\{[\s\S]*?background:\s*linear-gradient\([^;]*var\(--color-pulse-instrument\)/);
assert.match(premiumStyles, /\.overview-evidence-band\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 0\.88fr\)\s+minmax\(0, 1\.12fr\)/);
assert.match(premiumStyles, /@media \(max-width: 760px\)[\s\S]*?\.overview-evidence-band\s*\{[\s\S]*?grid-template-columns:\s*1fr/);
assert.match(premiumStyles, /@media \(max-width: 340px\)/);
assert.doesNotMatch(premiumStyles, /\.overview-analysis-switch\s*\{/);
```

- [ ] **Step 2: 运行样式契约并确认 RED**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: FAIL，因为旧双卡和切换器样式仍存在。

- [ ] **Step 3: 实现视觉系统**

1. 把 `.overview-decision-brief` 调整为 5/4/3 列，降低无数据状态最小高度；结论区使用明确状态条、较强标题层级和单一主动作。
2. `.overview-operating-stage` 使用深墨绿渐变、微弱网格、内边框和克制阴影；Canvas 高度桌面约 300px，移动端约 240px。
3. 图表头摘要使用四个紧凑指标，不创建第二排大型卡片。
4. 来源贡献使用横向占比条；重点链接使用五项 2×3 紧凑指标和满宽主动作。
5. 删除 `.overview-analysis-panels`、`.overview-analysis-switch`、`.overview-pulse-stage`、双卡 52/48 和旧链接图专属样式。
6. 在 `1180px`、`760px`、`340px` 断点实现规范中的堆叠、两列指标、长文本和满宽按钮。

- [ ] **Step 4: 运行样式契约并确认 GREEN**

Run: `node scripts/test-premium-shell-overview.mjs`

Expected: PASS，旧切换样式不存在，所有新布局契约成立。

- [ ] **Step 5: 提交视觉实现**

```bash
git add src/styles/modules/19-premium-shell-overview.css scripts/test-premium-shell-overview.mjs
git commit -m "style: focus overview command surface"
```

---

### Task 4: 全量构建与真实浏览器验收

**Files:**
- Verify: `http://127.0.0.1:52098/`
- Verify: `.local-preview/service.log`

**Interfaces:**
- Consumes: Tasks 1—3 的完整工作台构建。
- Produces: 可复现 release hash、桌面和窄屏证据、无错误日志。

- [ ] **Step 1: 运行完整静态与业务检查**

Run: `npm run check`

Expected: exit 0，所有阶段通过。

- [ ] **Step 2: 构建并确认常驻服务发布新版本**

Run: `npm run build`

Run: `curl -sS --max-time 5 http://127.0.0.1:52098/release.json`

Expected: 构建 hash 与服务返回 hash 一致。

- [ ] **Step 3: 1440×1000 真实数据验收**

在浏览器点击今日、昨日、近 7 日、近 30 日和指定日期，记录：

- 首屏经营结论、四项指标和主图主要部分在首屏内可见。
- 2026-08-09/当前未同步日是断点而不是零点。
- GMV 与订单双轴和图例清晰；Hover 同时显示 GMV、订单和客单价。
- 来源金额与占比、广告归因、重点链接五项指标和利润入口均正确。
- “处理此链接”进入正确产品、店铺、链接与 SKU 明细。

- [ ] **Step 4: 响应式与动态状态验收**

检查 1179、760、390 和 320px：

- 页面 `scrollWidth === innerWidth`。
- 双线图 backing size 与 CSS width 按 DPR 匹配。
- 指标保持两列或按规范堆叠，按钮文案完整。
- 长产品名、动态数字、待同步状态和空仓库状态不产生孤字或大面积空白。
- 离开总览、改变尺寸后返回，Canvas 以当前尺寸重绘。

- [ ] **Step 5: 检查日志和差异**

Run: `git diff --check`

浏览器读取新鲜 `warn/error` 日志，Expected: `[]`。

- [ ] **Step 6: 提交验收记录或最终修复**

如果无需源码修复，不创建无意义提交；如果发现问题，先写失败测试，再提交一组聚焦修复：

```bash
git add index.html src/app/workbench/00-runtime.js src/app/workbench/10-overview.js src/app/workbench/11-overview-pulse-model.js src/app/workbench/80-events.js src/styles/modules/19-premium-shell-overview.css scripts/test-gmv-trend-range.mjs scripts/test-overview-pulse-model.mjs scripts/test-premium-shell-overview.mjs
git commit -m "fix: harden overview command surface"
```
