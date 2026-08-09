import assert from "node:assert/strict";
import {
  LOCAL_PREVIEW_LAUNCH_AGENT_LABEL,
  localPreviewLaunchAgentBootstrapDelay,
  localPreviewLaunchAgentDefinition,
  localPreviewLaunchAgentPlist,
  localPreviewLaunchAgentTargets,
  shouldRetryLaunchAgentBootstrap
} from "./local-preview-launch-agent.mjs";

const projectRoot = "/Users/example/TK工作台 & Ops";
const homeDir = "/Users/example";
const nodeExecutable = "/opt/homebrew/bin/node";

const definition = localPreviewLaunchAgentDefinition({
  projectRoot,
  homeDir,
  nodeExecutable
});

assert.equal(LOCAL_PREVIEW_LAUNCH_AGENT_LABEL, "com.tk-workbench.local-preview");
assert.equal(definition.Label, LOCAL_PREVIEW_LAUNCH_AGENT_LABEL);
assert.deepEqual(definition.ProgramArguments, [
  "/usr/bin/env",
  "node",
  `${projectRoot}/scripts/dev-local-service-entry.mjs`
]);
assert.equal(definition.WorkingDirectory, projectRoot);
assert.equal(definition.RunAtLoad, true);
assert.equal(definition.KeepAlive, true);
assert.equal(definition.ProcessType, "Interactive");
assert.equal(definition.StandardOutPath, `${projectRoot}/.local-preview/service.log`);
assert.equal(definition.StandardErrorPath, `${projectRoot}/.local-preview/service-error.log`);
assert.equal(definition.EnvironmentVariables.HOME, homeDir);
assert.match(definition.EnvironmentVariables.PATH, /^\/Users\/example\/\.local\/bin:\/opt\/homebrew\/bin:/);

const plist = localPreviewLaunchAgentPlist({ projectRoot, homeDir, nodeExecutable });
assert.match(plist, /<key>KeepAlive<\/key>\s*<true\/>/);
assert.match(plist, /<key>RunAtLoad<\/key>\s*<true\/>/);
assert.match(plist, /TK工作台 &amp; Ops/);
assert.doesNotMatch(plist, /TK工作台 & Ops/);

assert.deepEqual(localPreviewLaunchAgentTargets(501), {
  domain: "gui/501",
  service: `gui/501/${LOCAL_PREVIEW_LAUNCH_AGENT_LABEL}`
});

const launchdBusyError = { code: 5, stderr: "Bootstrap failed: 5: Input/output error" };
assert.equal(shouldRetryLaunchAgentBootstrap({ error: launchdBusyError, attempt: 0 }), true);
assert.equal(shouldRetryLaunchAgentBootstrap({ error: launchdBusyError, attempt: 4 }), true);
assert.equal(shouldRetryLaunchAgentBootstrap({ error: launchdBusyError, attempt: 5 }), false);
assert.equal(shouldRetryLaunchAgentBootstrap({ error: { code: 78 }, attempt: 0 }), false);
assert.equal(localPreviewLaunchAgentBootstrapDelay(0), 200);
assert.equal(localPreviewLaunchAgentBootstrapDelay(4), 1600);

console.log(JSON.stringify({ passed: 22, phase: "persistent-local-preview-launch-agent" }));
