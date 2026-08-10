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

let initialPatchCalls = 0;
let initialBackupWrites = 0;
const deferredBackups = [];
const directPayloadContext = {
  window: {
    __workbenchInitialStatePromise: Promise.resolve(fullPayload),
    setTimeout(callback) {
      deferredBackups.push(callback);
      return deferredBackups.length;
    }
  },
  state: { tasks: [{ id: "local-old" }], reports: [] },
  cloudBaseline: {},
  cloudRevision: 0,
  uiRevision: 1,
  cloudEndpoint: "/api/state",
  cloudAvailable: () => true,
  setSyncStatus() {},
  normalizeState: (value) => value,
  structuredClone,
  buildCloudPatch() {
    initialPatchCalls += 1;
    return { collections: {}, creatorEdits: { upserts: {}, deletes: [] } };
  },
  applyCloudPatch: (remote) => remote,
  cloudPatchIsEmpty: () => true,
  localStorage: { setItem() { initialBackupWrites += 1; } },
  storeKey: "test",
  hydrateCostProfilesFromTeam() {},
  fetch: async () => { throw new Error("完整登录响应不应再次请求云端状态"); },
  console,
  location: { hostname: "example.com" }
};
vm.runInNewContext(`${source.slice(start, end)}\nthis.loadInitialCloudState = loadCloudStateOnce;`, directPayloadContext);
const directlyLoaded = await directPayloadContext.loadInitialCloudState();
assert.equal(directlyLoaded, true);
assert.equal(initialPatchCalls, 0, "登录响应已是主库快照时不得再逐集合比较本地旧备份");
assert.equal(initialBackupWrites, 0, "首屏渲染前不得同步序列化并写入整份本地备份");
assert.equal(deferredBackups.length, 1, "团队数据仍必须在首屏后安排本地备份");
deferredBackups[0]();
assert.equal(initialBackupWrites, 1, "延后处理仍必须保留本地容灾备份");

const initializeStart = source.indexOf("function initializeWorkbench()");
const initializeEnd = source.indexOf("function markCloudFormDirty", initializeStart);
assert.ok(initializeStart >= 0 && initializeEnd > initializeStart, "必须能载入真实工作台初始化入口");
const enterStart = source.indexOf("function enterWorkbench()");
const enterEnd = source.indexOf("function signedInWorkbenchUser", enterStart);
assert.ok(enterStart >= 0 && enterEnd > enterStart, "必须能载入真实工作台进入入口");
let startupSaveCalls = 0;
let startupRenderCalls = 0;
let startupPatchCalls = 0;
const startupContext = {
  state: { local: true },
  cloudBaseline: {},
  cloudReady: false,
  renderEntranceSnapshot() {},
  render() {
    startupRenderCalls += 1;
  },
  loadCloudState: async () => {
    startupContext.state = { remote: true };
    startupContext.cloudBaseline = { remote: true };
    return true;
  },
  buildCloudPatch: (baseline, current) => {
    startupPatchCalls += 1;
    return baseline.remote === current.remote && Object.keys(current).length === 1
      ? { empty: true }
      : { empty: false };
  },
  cloudPatchIsEmpty: (patch) => patch.empty,
  restoreReportFormForToday() {},
  saveCloudState() { startupSaveCalls += 1; },
  scheduleCloudRefresh() {},
  scheduleReleaseCheck() {},
  document: {
    body: { classList: { contains: () => false, add() {}, remove() {} } },
    getElementById: () => null,
    querySelector: () => null
  },
  window: {
    requestAnimationFrame: (callback) => callback(),
    setTimeout: () => 0,
    __workbenchMarkReady() {}
  }
};
vm.runInNewContext(`${source.slice(enterStart, enterEnd)}\n${source.slice(initializeStart, initializeEnd)}\nthis.initialize = initializeWorkbench;\nthis.enter = enterWorkbench;`, startupContext);
startupContext.initialize();
startupContext.enter();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(startupSaveCalls, 0, "纯启动渲染不得产生云端写入");
assert.equal(startupRenderCalls, 1, "进入工作台并套用初始云端数据时只能完整渲染一次首屏");
assert.equal(startupPatchCalls, 0, "初始云端载入已经确认无本地变更时不得在首屏前再次全量比对");

startupSaveCalls = 0;
startupRenderCalls = 0;
startupContext.loadCloudState = async () => "pending";
startupContext.initialize();
await new Promise((resolve) => setTimeout(resolve, 0));
assert.equal(startupSaveCalls, 1, "载入期间确有本地操作时仍必须继续同步到云端");
assert.equal(startupRenderCalls, 1, "存在待同步操作也只能完整渲染一次首屏");

console.log(JSON.stringify({ passed: 16, phase: "fast-single-render-cloud-initial-state" }));
