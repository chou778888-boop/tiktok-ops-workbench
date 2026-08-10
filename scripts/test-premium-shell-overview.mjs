import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, tokens, manifest, premiumStyles, overviewSource, profitTemplate, navigationSource, runtimeSource, eventsSource] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/styles/tokens.css", "utf8"),
  readFile("src/styles/workbench.css", "utf8"),
  readFile("src/styles/modules/19-premium-shell-overview.css", "utf8"),
  readFile("src/app/workbench/10-overview.js", "utf8"),
  readFile("src/app/workbench/65-profit-template.js", "utf8"),
  readFile("src/app/workbench/70-navigation.js", "utf8"),
  readFile("src/app/workbench/00-runtime.js", "utf8"),
  readFile("src/app/workbench/80-events.js", "utf8")
]);

assert.match(tokens, /--color-brand-ink:\s*#12201b/);
assert.match(tokens, /--color-tech-blue:\s*#2f6fed/);
assert.match(tokens, /--color-pulse-ink:\s*#111611/);
assert.match(tokens, /--color-pulse-acid:\s*#78f58f/);
assert.match(tokens, /--color-pulse-canvas:\s*#f5f7f2/);
assert.match(tokens, /--color-pulse-instrument:\s*#0d1712/);
assert.match(tokens, /--color-pulse-instrument-soft:\s*#14231b/);
assert.match(tokens, /--surface-raised:/);
assert.match(tokens, /--shadow-raised:/);
assert.match(manifest, /modules\/19-premium-shell-overview\.css/);
assert.ok(manifest.indexOf("19-premium-shell-overview.css") < manifest.indexOf("20-report-command-center.css"), "总览样式必须先于后续页面专属覆盖");
assert.equal(manifest.trim().split("\n").at(-1), '@import url("./modules/20-report-command-center.css");');
assert.match(html, /class="topbar premium-topbar workspace-pulse-dock"/);
assert.doesNotMatch(html, /workspace-rail/);
assert.match(html, /class="hero-card overview-command-card"/);
assert.match(html, /class="analysis-grid overview-intelligence-grid"/);
assert.doesNotMatch(html, /class="overview-command-copy"/, "总览不得保留营销式大标题区");
assert.doesNotMatch(html, /overview-eyebrow/);
assert.doesNotMatch(html, /class="overview-page-heading"/);
assert.doesNotMatch(html, /class="overview-command-left"/);
assert.doesNotMatch(html, /class="overview-command-right"/);
assert.match(
  html,
  /class="overview-focus-surface"[\s\S]*?class="overview-command-bar"[\s\S]*?id="overviewDataDate"[\s\S]*?data-range-toolbar="overview"[\s\S]*?class="overview-decision-brief"/,
  "日期筛选后必须先展示公司级经营判断"
);
assert.equal((html.match(/id="overviewOperatingChart"/g) || []).length, 1, "总览只能存在一张 GMV 与成交订单统一经营图");
assert.match(html, /data-overview-operating-shell/);
assert.match(html, /id="overviewOperatingSummary"/);
assert.match(html, /id="overviewOperatingEmpty"[^>]*data-jump="reports"/);
assert.match(html, /class="overview-evidence-band"[^>]*id="overviewEvidenceBand"/);
assert.match(html, /id="overviewLinkDecisionMetrics"/);
assert.doesNotMatch(html, /overview-analysis-switch/);
assert.doesNotMatch(html, /id="overviewPulseChart"/);
assert.doesNotMatch(html, /id="overviewPulseDays"/);
assert.match(html, /id="overviewDecisionTitle"/);
assert.match(html, /id="overviewDecisionMetrics"/);
assert.match(html, /id="overviewRiskAction"/);
assert.match(html, /class="overview-signal-briefs"/);
assert.match(html, /id="overviewSignalPrice"/);
assert.match(html, /id="overviewSignalMotion"/);
assert.match(html, /id="overviewSignalAction"/);
assert.match(html, /id="overviewProfitFocus"/);
assert.match(html, /id="overviewProfitAction"/);
assert.match(html, /id="overviewPulsePath"/);
assert.match(html, /class="overview-link-ledger"/);
assert.match(html, /id="overviewFocusReceived"/);
assert.match(html, /id="overviewFocusReceivedLabel"/);
assert.match(html, /id="overviewFocusProfit"/);
assert.match(premiumStyles, /\.workspace-pulse-dock/);
assert.match(premiumStyles, /\.overview-profit-focus/);
assert.match(premiumStyles, /var\(--color-pulse-acid\)/);
assert.match(premiumStyles, /\.overview-decision-brief\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1\.15fr\)\s+minmax\(360px, 0\.85fr\)/, "桌面首屏必须先展示公司级判断与经营指标");
assert.match(premiumStyles, /\.overview-command-bar\s*\{[\s\S]*?grid-area:\s*toolbar/);
assert.match(premiumStyles, /\.overview-operating-panel\s*\{[\s\S]*?overflow:\s*hidden/);
assert.match(premiumStyles, /\.overview-operating-stage\s*\{[\s\S]*?background:\s*linear-gradient\(145deg, #14221a 0%, var\(--color-pulse-instrument\) 100%\)/, "统一经营图必须使用深绿仪表画布");
assert.match(premiumStyles, /#overviewOperatingChart\s*\{[\s\S]*?height:\s*clamp\(230px, 20vw, 300px\)/, "桌面统一图应保留足够判断高度但不能过度占屏");
assert.match(premiumStyles, /\.overview-operating-summary\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(premiumStyles, /\.overview-evidence-band\s*\{[\s\S]*?grid-template-columns:\s*minmax\(300px, 0\.78fr\) minmax\(0, 1\.22fr\)/, "来源贡献应小于需要更多信息的重点链接决策区");
assert.match(premiumStyles, /\.overview-link-decision-metrics\s*\{[\s\S]*?grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
assert.match(premiumStyles, /scrollbar-color:\s*var\(--color-brand-green\)/);
assert.match(premiumStyles, /@media \(max-width: 1320px\)[\s\S]*?\.data-menu-trigger\s*\{[\s\S]*?font-size:\s*0/);
assert.match(premiumStyles, /\.overview-command-card\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?width:\s*100%/);
assert.match(premiumStyles, /\.overview-command-card\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(premiumStyles, /\.overview-product-panel \.table-wrap\s*\{[\s\S]*?max-height:\s*520px;[\s\S]*?overflow:\s*auto/, "真实SKU增长后产品区必须有受控高度和固定表头滚动容器");
assert.match(premiumStyles, /\.overview-product-panel thead\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*0;/, "产品表头必须在长列表内部滚动时保持可见");
assert.doesNotMatch(premiumStyles, /\.overview-command-copy h1\s*\{/);
assert.match(premiumStyles, /@media \(max-width: 1180px\)[\s\S]*?\.overview-decision-brief\s*\{[\s\S]*?grid-template-columns:\s*1fr/, "窄屏整体经营判断必须转为单列");
assert.match(premiumStyles, /\.overview-signal-briefs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(premiumStyles, /@media \(max-width: 760px\)[\s\S]*?\.sync-pill\s*\{[\s\S]*?font-size:\s*0/);
assert.match(premiumStyles, /@media \(max-width: 760px\)[\s\S]*?#overviewOperatingChart\s*\{[\s\S]*?height:\s*220px/, "移动端统一图必须保留可读高度");
assert.match(premiumStyles, /@media \(max-width: 760px\)[\s\S]*?\.overview-evidence-band\s*\{[\s\S]*?grid-template-columns:\s*1fr/, "移动端证据区必须单列且不产生整页横向溢出");
assert.match(premiumStyles, /@media \(max-width: 760px\)[\s\S]*?\.overview-product-panel th:nth-child\(3\)[\s\S]*?min-width:\s*156px/, "移动端产品列必须保留可读宽度，避免真实长名称碎裂");
assert.doesNotMatch(premiumStyles, /\.workspace-rail/);
assert.match(premiumStyles, /@media \(max-width: 340px\)/);
assert.match(premiumStyles, /@media \(max-width: 340px\)[\s\S]*?\.overview-signal-briefs\s*\{\s*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(premiumStyles, /@media \(max-width: 340px\)[\s\S]*?\.overview-signal-briefs > div:last-child\s*\{[\s\S]*?grid-column:\s*1 \/ -1/);
assert.match(premiumStyles, /prefers-reduced-motion/);
assert.match(overviewSource, /function renderOverviewOperatingSurface\(/);
assert.match(overviewSource, /function drawOverviewOperatingChart\(model\)/);
assert.match(overviewSource, /renderOverviewProfitPulse\(\)/);
assert.match(overviewSource, /function renderOverviewDecisionBrief\(/);
assert.doesNotMatch(overviewSource, /function setOverviewAnalysisMode\(/);
assert.doesNotMatch(overviewSource, /\["实际 \/ 预估到手"/);
assert.match(overviewSource, /overviewFocusReceived/);
assert.match(overviewSource, /overviewFocusProfit/);
assert.match(overviewSource, /overviewSignalPrice/);
assert.match(overviewSource, /getPropertyValue\("--color-pulse-acid"\)/);
assert.equal((overviewSource.match(/function overviewProfitPulseModel/g) || []).length, 1);
assert.equal((overviewSource.match(/function renderOverviewProfitPulse/g) || []).length, 1);
assert.match(navigationSource, /overviewProfitAction/);
assert.doesNotMatch(runtimeSource, /activeOverviewAnalysisMode/);
assert.doesNotMatch(eventsSource, /data-overview-analysis-mode/);
assert.match(profitTemplate, /renderProfitListingDetail/);
assert.match(profitTemplate, /renderProfitSkuTrend/);

console.log(JSON.stringify({ passed: 60, phase: "operating-pulse-overview-contract" }));
