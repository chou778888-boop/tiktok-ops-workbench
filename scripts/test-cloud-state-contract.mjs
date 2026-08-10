import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildEntrySummary } from "../functions/api/state.js";

const [runtime, stateApi, bootstrap, buildScript] = await Promise.all([
  readFile("src/app/workbench/00-runtime.js", "utf8"),
  readFile("functions/api/state.js", "utf8"),
  readFile("functions/api/bootstrap.js", "utf8"),
  readFile("scripts/build-cloudflare.mjs", "utf8")
]);

function objectKeys(source, pattern, label) {
  const body = source.match(pattern)?.[1];
  assert.ok(body, `未找到${label}`);
  return [...body.matchAll(/^\s+([A-Za-z][A-Za-z0-9]*):/gm)]
    .map((match) => match[1])
    .sort();
}

const clientCollections = objectKeys(
  runtime,
  /const cloudArrayKeys = \{([\s\S]*?)\n\s{4}\};/,
  "前端云端集合定义"
);
const serverCollections = objectKeys(
  stateApi,
  /const arrayKeys = \{([\s\S]*?)\n\};/,
  "服务端云端集合定义"
);

assert.deepEqual(
  clientCollections,
  serverCollections,
  "前端增量同步集合必须与服务端合并集合完全一致，避免部署后静默丢字段"
);

for (const name of serverCollections) {
  assert.match(runtime, new RegExp(`\\b${name}:[^\\n]*Array\\.isArray\\(data\\?\\.${name}\\)`), `前端必须兼容云端缺失的 ${name}`);
  assert.match(stateApi, new RegExp(`\\b${name}:[^\\n]*Array\\.isArray\\(data\\?\\.${name}\\)`), `服务端必须规范化旧数据的 ${name}`);
}

assert.match(runtime, /creatorEdits:\s*data\?\.creatorEdits[\s\S]*?\? data\.creatorEdits : \{\}/, "前端必须保留达人编辑映射");
assert.match(stateApi, /creatorEdits:\s*data\?\.creatorEdits[\s\S]*?\? data\.creatorEdits : \{\}/, "服务端必须保留达人编辑映射");
assert.match(bootstrap, /import \{ normalizeData \} from "\.\/state\.js"/, "登录启动必须复用服务端统一数据规范");
assert.match(bootstrap, /data:\s*state\?\.data \? normalizeData\(JSON\.parse\(state\.data\)\) : normalizeData\(null\)/, "启动接口必须兼容历史云端数据");
assert.match(buildScript, /loadDeploymentBackendSources/, "发布指纹必须包含 Pages Functions 与部署配置");
assert.match(buildScript, /update\(backendSources\)/, "接口逻辑变化必须生成新的 release");

const storeCoverage = buildEntrySummary({
  reports: [{
    id: "report-1",
    date: "2026-08-08",
    role: "售后组",
    author: "团队汇总",
    status: "已提交",
    roleMetrics: [
      "DreamWeave",
      "sweet dream",
      "Dreamland",
      "Dreamdaily",
      "MoonDream",
      "Himood Smile",
      "六店汇总",
      "临时测试店"
    ].map((store) => ({ store }))
  }]
}, "2026-08-08");
assert.equal(storeCoverage.stores, 6, "店铺覆盖只能统计标准六店，团队汇总和测试行不能形成 7/6");
assert.equal(storeCoverage.storeTarget, 6);

console.log(JSON.stringify({
  passed: 2 * serverCollections.length + 8,
  collections: serverCollections.length,
  phase: "cloud-state-contract"
}));
