import assert from "node:assert/strict";
import { loadAppSources } from "./app-sources.mjs";

const bundle = await loadAppSources();
assert.equal(new Set(bundle.files).size, bundle.files.length, "应用源码清单不能包含重复文件");
assert.equal(bundle.files.at(-1), "src/app/workbench/90-entry.js", "初始化入口必须最后执行");
assert.ok(bundle.combined.includes("initializeWorkbench()"), "合并源码必须包含工作台初始化");
const profitModules = [
  "src/app/workbench/61-profit-domain.js",
  "src/app/workbench/62-profit-repository.js",
  "src/app/workbench/63-profit-selectors.js",
  "src/app/workbench/65-profit-template.js"
];
const costingIndex = bundle.files.indexOf("src/app/workbench/60-costing.js");
assert.deepEqual(
  bundle.files.slice(costingIndex + 1, costingIndex + 1 + profitModules.length),
  profitModules,
  "利润领域、仓库、选择器与页面控制器必须紧跟成本模块并按依赖顺序执行"
);
assert.equal(
  bundle.files.indexOf("src/app/workbench/70-navigation.js"),
  bundle.files.indexOf("src/app/workbench/65-profit-template.js") + 1,
  "导航模块必须在利润中心模板完成绑定后执行"
);

console.log(JSON.stringify({ passed: 5, files: bundle.files.length, phase: "ordered-app-sources" }));
