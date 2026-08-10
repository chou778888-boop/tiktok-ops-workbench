import assert from "node:assert/strict";
import {
  localPreviewProcessGroupTarget,
  localPreviewHealthCheck,
  localPreviewRestartDelay,
  shouldRecycleUnhealthyPreview,
  shouldRestartLocalPreview,
  terminateLocalPreviewProcessTree
} from "./dev-local-supervisor.mjs";

assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: 1, signal: null }), true);
assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: 0, signal: null }), true);
assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: null, signal: "SIGKILL" }), true);
assert.equal(shouldRestartLocalPreview({ stopping: true, exitCode: 0, signal: null }), false);
assert.equal(shouldRestartLocalPreview({ stopping: true, exitCode: null, signal: "SIGTERM" }), false);

assert.equal(localPreviewRestartDelay(0), 800);
assert.equal(localPreviewRestartDelay(1), 1600);
assert.equal(localPreviewRestartDelay(8), 8000);

assert.equal(localPreviewProcessGroupTarget({ pid: 2468 }, "darwin"), -2468);
assert.equal(localPreviewProcessGroupTarget({ pid: 2468 }, "linux"), -2468);
assert.equal(localPreviewProcessGroupTarget({ pid: 2468 }, "win32"), null);
assert.equal(localPreviewProcessGroupTarget({ pid: 0 }, "darwin"), null);

const terminationCalls = [];
assert.equal(terminateLocalPreviewProcessTree(
  { pid: 2468, killed: true },
  { platform: "darwin", killProcess: (...args) => terminationCalls.push(args) }
), true);
assert.deepEqual(terminationCalls, [[-2468, "SIGTERM"]]);

assert.equal(terminateLocalPreviewProcessTree(
  { pid: 2468, killed: false, kill: (signal) => terminationCalls.push(["child", signal]) },
  { platform: "win32", killProcess: () => assert.fail("Windows 不应按进程组发送信号") }
), true);
assert.deepEqual(terminationCalls.at(-1), ["child", "SIGTERM"]);

assert.equal(shouldRecycleUnhealthyPreview(1), false);
assert.equal(shouldRecycleUnhealthyPreview(2), false);
assert.equal(shouldRecycleUnhealthyPreview(3), true);
assert.equal(await localPreviewHealthCheck({
  fetchPreview: async (url) => ({ ok: url === "http://127.0.0.1:52098/release.json" })
}), true);
assert.equal(await localPreviewHealthCheck({ fetchPreview: async () => ({ ok: false }) }), false);
assert.equal(await localPreviewHealthCheck({ fetchPreview: async () => { throw new Error("offline"); } }), false);

console.log(JSON.stringify({ passed: 22, phase: "resilient-local-preview" }));
