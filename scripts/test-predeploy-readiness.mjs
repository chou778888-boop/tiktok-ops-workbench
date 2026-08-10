import assert from "node:assert/strict";
import * as readinessModule from "./predeploy-readiness.mjs";
import {
  evaluateDeploymentReadiness,
  latestOperationalSnapshot,
  productionDataSnapshot
} from "./predeploy-readiness.mjs";

assert.equal(typeof readinessModule.retryRequest, "function", "云端只读请求必须提供可测试的重试边界");
let retryAttempts = 0;
const retriedPayload = await readinessModule.retryRequest(async () => {
  retryAttempts += 1;
  if (retryAttempts < 3) throw new Error("temporary TLS failure");
  return { release: "remote-456" };
}, { attempts: 3, delayMs: 0, label: "生产 release" });
assert.deepEqual(retriedPayload, { release: "remote-456" });
assert.equal(retryAttempts, 3, "短暂网络失败后必须完成第三次请求");

let failedAttempts = 0;
await assert.rejects(
  readinessModule.retryRequest(async () => {
    failedAttempts += 1;
    throw new Error("fetch failed");
  }, { attempts: 2, delayMs: 0, label: "生产数据摘要" }),
  /生产数据摘要.*2 次.*fetch failed/
);
assert.equal(failedAttempts, 2, "达到上限后不得继续请求");

function configWithDatabases(previewId, productionId) {
  return {
    d1_databases: [{ binding: "DB", database_id: productionId }],
    env: {
      preview: {
        d1_databases: previewId ? [{ binding: "DB", database_id: previewId }] : []
      },
      production: {
        d1_databases: productionId ? [{ binding: "DB", database_id: productionId }] : []
      }
    }
  };
}

const cloudState = {
  version: "v2",
  updatedAt: "2026-08-10T07:50:48.447Z",
  revision: 363,
  summary: {
    date: "2026-08-10",
    reports: 0,
    roles: 0,
    roleTarget: 4,
    stores: 0,
    storeTarget: 6,
    openTasks: 19
  }
};

const ready = evaluateDeploymentReadiness({
  config: configWithDatabases("preview-db", "production-db"),
  localRelease: "local-123",
  remoteRelease: "remote-456",
  remoteState: cloudState,
  recentStates: [cloudState],
  workingTreeDirty: false,
  passwordRotationConfirmed: true
});
assert.deepEqual(ready.blockers, []);
assert.equal(ready.snapshot.revision, 363);
assert.equal(ready.snapshot.openTasks, 19);

const blocked = evaluateDeploymentReadiness({
  config: configWithDatabases("same-db", "same-db"),
  localRelease: "local-123",
  remoteRelease: "remote-456",
  remoteState: cloudState,
  recentStates: [cloudState],
  workingTreeDirty: true,
  passwordRotationConfirmed: false
});
assert.deepEqual(
  blocked.blockers.map((item) => item.code).sort(),
  ["initial-passwords-unconfirmed", "shared-preview-production-db", "working-tree-dirty"]
);

const acceptedInitialPasswordRisk = evaluateDeploymentReadiness({
  config: configWithDatabases("preview-db", "production-db"),
  localRelease: "local-123",
  remoteRelease: "remote-456",
  remoteState: cloudState,
  recentStates: [cloudState],
  workingTreeDirty: false,
  passwordRotationConfirmed: false,
  initialPasswordRiskAccepted: true
});
assert.ok(
  !acceptedInitialPasswordRisk.blockers.some((item) => item.code === "initial-passwords-unconfirmed"),
  "用户明确接受初始密码风险后不得继续伪装成未确认"
);
assert.ok(
  acceptedInitialPasswordRisk.warnings.some((item) => item.code === "initial-password-risk-accepted"),
  "接受初始密码风险必须保留可见警告"
);

const missingBindings = evaluateDeploymentReadiness({
  config: configWithDatabases("", ""),
  localRelease: "local-123",
  remoteRelease: "",
  remoteState: null,
  recentStates: [],
  workingTreeDirty: false,
  passwordRotationConfirmed: true
});
assert.ok(missingBindings.blockers.some((item) => item.code === "missing-production-db"));
assert.ok(missingBindings.blockers.some((item) => item.code === "missing-preview-db"));
assert.ok(missingBindings.blockers.some((item) => item.code === "cloud-snapshot-unavailable"));

assert.deepEqual(productionDataSnapshot(cloudState), {
  version: "v2",
  updatedAt: "2026-08-10T07:50:48.447Z",
  revision: 363,
  date: "2026-08-10",
  reports: 0,
  roles: "0/4",
  stores: "0/6",
  openTasks: 19
});

const recentComplete = {
  ...cloudState,
  summary: {
    ...cloudState.summary,
    date: "2026-08-08",
    reports: 3,
    roles: 3,
    stores: 7
  }
};
assert.equal(latestOperationalSnapshot([
  recentComplete,
  { ...cloudState, summary: { ...cloudState.summary, date: "2026-08-09" } }
]).date, "2026-08-08");

const overflow = evaluateDeploymentReadiness({
  config: configWithDatabases("preview-db", "production-db"),
  localRelease: "local-123",
  remoteRelease: "remote-456",
  remoteState: cloudState,
  recentStates: [recentComplete],
  workingTreeDirty: false,
  passwordRotationConfirmed: true
});
assert.ok(overflow.warnings.some((item) => item.code === "store-coverage-overflow"));

console.log(JSON.stringify({ passed: 19, phase: "predeploy-readiness" }));
