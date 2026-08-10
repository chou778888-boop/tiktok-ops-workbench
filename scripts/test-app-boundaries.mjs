import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { appSourceFiles, loadAppSources } from "./app-sources.mjs";

const sources = new Map(await Promise.all(appSourceFiles.map(async (file) => [file, await readFile(file, "utf8")])));
const combined = (await loadAppSources()).combined;
const source = (suffix) => sources.get(appSourceFiles.find((file) => file.endsWith(suffix))) || "";

const ownership = [
  ["00-runtime.js", "function normalizeState"],
  ["00-runtime.js", "async function saveCloudState"],
  ["10-overview.js", "function drawOverviewOperatingChart"],
  ["20-tasks.js", "function renderTasks"],
  ["30-reports.js", "async function saveReport"],
  ["40-creators.js", "function renderCreatorCenter"],
  ["60-costing.js", "function calculateCost"],
  ["90-entry.js", "function initializeWorkbench"]
];

for (const [file, symbol] of ownership) {
  assert.ok(source(file).includes(symbol), `${symbol} 必须归属 ${file}`);
  assert.equal(combined.split(symbol).length - 1, 1, `${symbol} 在全部应用源码中必须只声明一次`);
}

assert.ok(source("00-runtime.js").includes("const defaultData"), "运行时模块必须拥有默认数据结构");
assert.ok(source("20-tasks.js").includes("function renderTasks"), "任务模块必须拥有任务中心渲染");
assert.ok(source("30-reports.js").includes("function saveReport"), "日报模块必须拥有日报保存流程");
assert.ok(source("60-costing.js").includes("function calculateCost"), "成本模块必须拥有成本计算模型");
assert.ok(source("90-entry.js").includes("initializeWorkbench();"), "入口模块必须启动工作台");
assert.equal(combined.match(/function initializeWorkbench\(/g)?.length, 1, "工作台只能有一个初始化入口");

console.log(JSON.stringify({ passed: ownership.length + 6, files: appSourceFiles.length, phase: "app-module-boundaries" }));
