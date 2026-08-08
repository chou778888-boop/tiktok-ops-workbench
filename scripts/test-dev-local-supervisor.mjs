import assert from "node:assert/strict";
import { localPreviewRestartDelay, shouldRestartLocalPreview } from "./dev-local-supervisor.mjs";

assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: 1, signal: null }), true);
assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: 0, signal: null }), true);
assert.equal(shouldRestartLocalPreview({ stopping: false, exitCode: null, signal: "SIGKILL" }), true);
assert.equal(shouldRestartLocalPreview({ stopping: true, exitCode: 0, signal: null }), false);
assert.equal(shouldRestartLocalPreview({ stopping: true, exitCode: null, signal: "SIGTERM" }), false);

assert.equal(localPreviewRestartDelay(0), 800);
assert.equal(localPreviewRestartDelay(1), 1600);
assert.equal(localPreviewRestartDelay(8), 8000);

console.log(JSON.stringify({ passed: 8, phase: "resilient-local-preview" }));
