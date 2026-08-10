import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as previewSupervisor from "./dev-local-supervisor.mjs";
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

assert.equal(typeof previewSupervisor.prepareLocalPreviewSnapshot, "function", "本地预览必须从不可变发布快照启动，不能直接监听正在重建的 dist");
assert.equal(typeof previewSupervisor.localPreviewWranglerArgs, "function", "Wrangler 启动参数必须由稳定快照路径生成");

const previewRoot = await mkdtemp(path.join(os.tmpdir(), "tk-preview-snapshot-"));
try {
  const sourceDirectory = path.join(previewRoot, "dist");
  await mkdir(sourceDirectory, { recursive: true });
  await writeFile(path.join(sourceDirectory, "release.json"), JSON.stringify({ release: "stable-123" }));
  await writeFile(path.join(sourceDirectory, "index.html"), "stable build");
  const snapshot = await previewSupervisor.prepareLocalPreviewSnapshot({ projectRoot: previewRoot, sourceDirectory });
  assert.equal(snapshot.release, "stable-123");
  assert.equal(snapshot.directory, path.join(previewRoot, ".local-preview", "releases", "stable-123"));
  assert.equal(await readFile(path.join(snapshot.directory, "index.html"), "utf8"), "stable build");
  assert.deepEqual(previewSupervisor.localPreviewWranglerArgs(snapshot.directory).slice(0, 3), ["pages", "dev", snapshot.directory]);
} finally {
  await rm(previewRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({ passed: 28, phase: "resilient-local-preview" }));
