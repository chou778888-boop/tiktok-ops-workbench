import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, styleManifest, commandStyles] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/styles/workbench.css", "utf8"),
  readFile("src/styles/modules/20-report-command-center.css", "utf8").catch(() => "")
]);

for (const className of [
  "report-page-intro",
  "report-operating-pulse",
  "report-command-grid",
  "report-command-context",
  "report-coverage-panel",
  "report-entry-panel",
  "report-management-section",
  "report-results-panel",
  "report-digest-panel"
]) {
  assert.match(html, new RegExp(`class="[^"]*${className}[^"]*"`), `日报中心必须包含 .${className}`);
}

const pulseIndex = html.indexOf('class="report-summary report-results-panel report-operating-pulse');
const commandIndex = html.indexOf('class="report-command-grid');
const formIndex = html.indexOf('id="reportForm"');
const metricsIndex = html.indexOf('id="reportMetrics"');
const priorityIndex = html.indexOf('id="reportPrioritySignals"');
const boardIndex = html.indexOf('id="dailyManagementBoard"');
assert.ok(pulseIndex >= 0 && commandIndex >= 0 && formIndex >= 0 && metricsIndex >= 0 && priorityIndex >= 0 && boardIndex >= 0, "日报中心关键容器必须保留");
assert.ok(pulseIndex < commandIndex && commandIndex < boardIndex, "页面顺序必须是经营脉搏、岗位填写工作台、行动重点");
assert.ok(metricsIndex < priorityIndex && priorityIndex < formIndex, "经营脉搏和经营重点必须位于岗位表单之前");
assert.match(html, /id="reportDetails"\s+hidden/, "岗位详细字段必须继续渐进展开");
assert.match(html, /id="reportPulseTitle"/, "经营脉搏标题必须支持日期状态更新");
assert.match(html, /id="reportRoleCoverage"/, "岗位覆盖面板必须显示四个核心岗位的实际提交状态");

assert.match(styleManifest, /@import url\("\.\/modules\/20-report-command-center\.css"\);/, "样式清单必须加载日报中心专属模块");
assert.match(commandStyles, /\.report-command-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(300px,\s*0\.34fr\)\s+minmax\(0,\s*0\.66fr\)/, "桌面岗位工作台必须使用协调的 34/66 双栏");
assert.match(commandStyles, /\.report-command-grid:has\(#reportDetails:not\(\[hidden\]\)\)\s*\{[\s\S]*?grid-template-columns:\s*1fr/, "岗位展开后工作台必须切换为全宽单列，避免左短右长");
assert.match(commandStyles, /\.report-command-grid:has\(#reportDetails:not\(\[hidden\]\)\)\s+\.report-command-context\s*\{[\s\S]*?grid-template-columns:\s*minmax\(280px,\s*0\.4fr\)\s+minmax\(0,\s*0\.6fr\)/, "岗位展开后覆盖与摘要必须变成横向紧凑上下文条");
assert.match(commandStyles, /\.report-command-grid:has\(#reportDetails:not\(\[hidden\]\)\)\s+\.report-entry-panel\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/, "岗位展开后的详细表单必须使用完整可用宽度");
assert.match(commandStyles, /\.report-command-context\s*\{[\s\S]*?border:\s*1px solid var\(--report-line\)[\s\S]*?background:\s*#fff/, "岗位覆盖与团队摘要必须合并为统一浅色工作表面");
assert.doesNotMatch(commandStyles, /\.report-coverage-panel\s*\{[\s\S]*?background:\s*#173a2d/, "岗位覆盖不能形成第二个深色视觉中心");
assert.match(commandStyles, /\.report-priority-grid\s*\{[\s\S]*?grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/, "经营重点必须使用三列信号布局");
assert.match(commandStyles, /\.report-priority-grid\s*\{[\s\S]*?gap:\s*0[\s\S]*?background:\s*var\(--report-soft\)/, "经营重点必须合并为连续信息带");
assert.match(commandStyles, /\.report-priority-card\s*\{[\s\S]*?border:\s*0[\s\S]*?border-radius:\s*0[\s\S]*?box-shadow:\s*none/, "经营重点不能继续使用三张嵌套卡片");
assert.match(commandStyles, /\.report-priority-card:not\(:first-child\)\s*\{[\s\S]*?border-left:\s*1px solid var\(--report-line\)/, "经营重点分段必须只使用轻量分隔线");
assert.match(commandStyles, /\.report-entry-panel\s*\{[\s\S]*?width:\s*100%/, "岗位填写卡必须使用完整宽度");
assert.match(commandStyles, /\.daily-management-board\s*\{[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/, "桌面行动重点必须恢复四列并排");
assert.match(commandStyles, /@media\s*\(max-width:\s*1080px\)[\s\S]*?\.report-command-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/, "中小屏岗位工作台必须切换单列");
assert.match(commandStyles, /@media\s*\(max-width:\s*760px\)[\s\S]*?#reportForm\s*>\s*\.field:not\(\.full\)\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/, "手机端基础字段必须单列");
assert.doesNotMatch(commandStyles, /linear-gradient|radial-gradient|filter:\s*blur/, "日报视觉不得使用渐变或模糊发光");
assert.doesNotMatch(commandStyles, /font-size:\s*(?:9|10|11)px/, "日报中心可见文字不得小于 12px");

console.log(JSON.stringify({ passed: 35, phase: "report-expanded-layout-contract" }));
