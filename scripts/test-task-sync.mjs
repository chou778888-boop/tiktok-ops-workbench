import assert from "node:assert/strict";
import { applyPatch, mergeTaskRecord, normalizePatch } from "../functions/api/state.js";

const baseTask = {
  id: "qa-task",
  title: "任务同步回归测试",
  status: "待处理",
  syncVersion: 1,
  updatedAt: "2026-08-02T01:00:00.000Z"
};

const processing = mergeTaskRecord(baseTask, {
  ...baseTask,
  status: "处理中",
  syncVersion: 2,
  startedAt: "2026-08-02T01:01:00.000Z",
  updatedAt: "2026-08-02T01:01:00.000Z"
});
assert.equal(processing.status, "处理中");
assert.equal(processing.syncVersion, 2);

const stalePending = mergeTaskRecord(processing, {
  ...baseTask,
  status: "待处理",
  syncVersion: 99,
  updatedAt: "2026-08-02T01:02:00.000Z"
});
assert.equal(stalePending.status, "处理中", "旧页面不能把任务退回待处理");
assert.equal(stalePending.syncVersion, 2);

const voided = mergeTaskRecord(processing, {
  ...processing,
  title: "旧页面标题不应覆盖",
  status: "已作废",
  syncVersion: 2,
  voidCategory: "重复任务",
  voidReason: "本地回归测试",
  voidedAt: "2026-08-02T01:03:00.000Z",
  updatedAt: "2026-08-02T01:03:00.000Z"
});
assert.equal(voided.status, "已作废", "作废必须从当前状态向前推进");
assert.equal(voided.syncVersion, 3, "跨状态写入由服务端保证版本递增");
assert.equal(voided.title, processing.title, "旧页面只能推进状态，不能覆盖任务主体");

const staleProcessing = mergeTaskRecord(voided, {
  ...processing,
  status: "处理中",
  syncVersion: 100,
  updatedAt: "2026-08-02T01:04:00.000Z"
});
assert.equal(staleProcessing.status, "已作废", "终态不能被旧页面恢复");
assert.equal(staleProcessing.syncVersion, 3);

const patch = normalizePatch({
  patch: {
    collections: {
      tasks: {
        upserts: [{ ...baseTask, status: "处理中", syncVersion: 2 }],
        deletes: [baseTask.id]
      }
    }
  }
});
const patched = applyPatch({ tasks: [baseTask] }, patch);
assert.equal(patched.tasks.length, 1, "任务不可无痕删除");
assert.equal(patched.tasks[0].status, "处理中");

console.log(JSON.stringify({
  passed: 5,
  scenarios: [
    "待处理进入处理中",
    "旧页面不能回退状态",
    "处理中可以作废",
    "终态不可恢复",
    "任务删除请求转为保留记录"
  ]
}));
