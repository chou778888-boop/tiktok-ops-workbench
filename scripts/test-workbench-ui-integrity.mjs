import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function topLevelSelectors(source) {
  const selectors = [];
  let depth = 0;
  let buffer = "";
  let comment = false;
  let quote = "";

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (comment) {
      if (char === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (!quote && char === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (quote) {
      if (char === quote && source[index - 1] !== "\\") quote = "";
      if (depth === 0) buffer += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      if (depth === 0) buffer += char;
      continue;
    }
    if (char === "{") {
      if (depth === 0) {
        const selector = buffer.trim();
        if (selector && !selector.startsWith("@")) selectors.push(selector.replace(/\s+/g, " "));
        buffer = "";
      }
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth = Math.max(0, depth - 1);
      if (depth === 0) buffer = "";
      continue;
    }
    if (depth === 0) buffer += char;
  }
  return selectors;
}

const ownerFiles = [
  "src/styles/modules/03-costing.css",
  "src/styles/modules/04-operations.css",
  "src/styles/modules/07-creators.css",
  "src/styles/modules/18-profit-template.css",
  "src/styles/modules/19-premium-shell-overview.css",
  "src/styles/modules/20-report-command-center.css",
  "src/styles/modules/21-task-command-center.css"
];

for (const file of ownerFiles) {
  const selectors = topLevelSelectors(await readFile(file, "utf8"));
  const seen = new Set();
  const duplicates = [...new Set(selectors.filter((selector) => seen.has(selector) || !seen.add(selector)))];
  assert.deepEqual(duplicates, [], `${file} 存在重复顶层选择器：${duplicates.join("、")}`);
}

const [tokens, overview, reports, tasks, costing, creators, academy] = await Promise.all([
  readFile("src/styles/tokens.css", "utf8"),
  readFile("src/styles/modules/19-premium-shell-overview.css", "utf8"),
  readFile("src/styles/modules/20-report-command-center.css", "utf8"),
  readFile("src/styles/modules/21-task-command-center.css", "utf8"),
  readFile("src/styles/modules/03-costing.css", "utf8"),
  readFile("src/styles/modules/07-creators.css", "utf8"),
  readFile("src/styles/modules/04-operations.css", "utf8")
]);

assert.match(tokens, /--text-view-title:\s*clamp\(/, "全工作台必须由设计令牌统一首屏标题尺度");
for (const [name, source] of [
  ["总览", overview],
  ["日报", reports],
  ["任务", tasks],
  ["利润", costing],
  ["达人", creators],
  ["学院", academy]
]) {
  assert.match(source, /font-size:\s*var\(--text-view-title\)/, `${name}首屏标题必须消费统一标题令牌`);
}

console.log(JSON.stringify({ passed: ownerFiles.length + 7, phase: "workbench-ui-integrity" }));
