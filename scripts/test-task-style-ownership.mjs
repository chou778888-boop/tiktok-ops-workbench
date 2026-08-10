import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadStyleSources } from "./style-sources.mjs";

const [bundle, html] = await Promise.all([
  loadStyleSources(),
  readFile("index.html", "utf8")
]);

const ownersOf = (selector) => bundle.files.filter((file, index) => bundle.sources[index].includes(selector));

const taskSelectors = [
  ".task-center-nav",
  ".task-center-panel",
  ".task-summary-grid",
  ".task-command-layout",
  ".task-team-summary",
  ".task-history-summary"
];
const selectorOwners = taskSelectors.map((selector) => ownersOf(selector));
for (const [index, owners] of selectorOwners.entries()) {
  assert.equal(owners.length, 1, `${taskSelectors[index]} 必须由任务中心单一模块维护，禁止在后置样式中重复覆盖`);
}
assert.equal(new Set(selectorOwners.flat()).size, 1, "任务中心核心布局必须归属于同一个样式模块");

assert.doesNotMatch(html, /class="[^"]*\btask-board\b/, "旧任务看板已经退出页面，不应保留无效结构");
assert.doesNotMatch(html, /id="taskBoard"/, "旧任务看板占位节点没有运行时消费者，不应继续进入页面");
assert.doesNotMatch(bundle.combined, /\.task-board\b/, "旧任务看板样式已无消费者，不应继续进入生产包");

console.log(JSON.stringify({ passed: 10, phase: "single-owner-task-styles" }));
