import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const source = (await loadAppSources()).combined;
const start = source.indexOf("async function loadCloudStateOnce()");
const end = source.indexOf("async function saveCloudState()", start);
assert.ok(start >= 0 && end > start, "必须能载入真实云端初始化逻辑");

const statuses = [];
let fetchCalls = 0;
const fullPayload = { data: { tasks: [{ id: "task-1" }], reports: [] }, revision: 206 };
const context = {
  window: { __workbenchInitialStatePromise: Promise.resolve({ summary: { tasks: 1 } }) },
  state: { tasks: [], reports: [] },
  cloudBaseline: {},
  cloudRevision: 0,
  uiRevision: 1,
  cloudEndpoint: "/api/state",
  cloudAvailable: () => true,
  setSyncStatus: (text) => statuses.push(text),
  normalizeState: (value) => value,
  structuredClone,
  buildCloudPatch: () => ({ collections: {}, creatorEdits: { upserts: {}, deletes: [] } }),
  applyCloudPatch: (remote) => remote,
  cloudPatchIsEmpty: () => true,
  localStorage: { setItem() {} },
  storeKey: "test",
  hydrateCostProfilesFromTeam() {},
  fetch: async () => {
    fetchCalls += 1;
    return { ok: true, json: async () => fullPayload };
  },
  console,
  location: { hostname: "example.com" }
};
vm.runInNewContext(`${source.slice(start, end)}\nthis.loadInitialCloudState = loadCloudStateOnce;`, context);

const loaded = await context.loadInitialCloudState();
assert.equal(fetchCalls, 1, "摘要载入后必须立即请求一次完整云端数据");
assert.equal(loaded, true, "取得完整数据后必须完成云端初始化");
assert.equal(context.cloudRevision, 206, "必须采用完整数据的云端版本");
assert.equal(statuses.at(-1), "已同步", "不能停留在云端待初始化");

console.log(JSON.stringify({ passed: 4, phase: "cloud-initial-full-state" }));
