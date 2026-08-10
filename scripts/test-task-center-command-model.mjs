import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/app/workbench/19-task-center-model.js", "utf8").catch(() => "");
const runtime = Function(`${source}\nreturn {
  makeTaskCenterCommandModel: typeof makeTaskCenterCommandModel === "function" ? makeTaskCenterCommandModel : null
};`)();
const { makeTaskCenterCommandModel } = runtime;

assert.equal(typeof makeTaskCenterCommandModel, "function", "任务中心必须用纯展示模型统一个人、团队与历史口径");

const model = makeTaskCenterCommandModel([
  { id: "overdue", title: "处理退款异常", assignee: "何晶晶", priority: "紧急", status: "待处理", due: "2026-08-09T18:00", updatedAt: "2026-08-09T12:00" },
  { id: "today", title: "复查广告计划", assignee: "何 晶晶", priority: "重要", status: "处理中", due: "2026-08-10T17:00", updatedAt: "2026-08-10T11:00" },
  { id: "review", title: "确认链接恢复", assignee: "何晶晶", priority: "观察", status: "待复盘", due: "2026-08-11T10:00", updatedAt: "2026-08-10T10:00" },
  { id: "other", title: "达人寄样", assignee: "赵旖旎", priority: "重要", status: "待处理", due: "2026-08-10T16:00", updatedAt: "2026-08-10T09:00" },
  { id: "unassigned", title: "补齐成本", assignee: "", priority: "重要", status: "待处理", due: "2026-08-12T16:00", updatedAt: "2026-08-10T08:00" },
  { id: "done", title: "已完成事项", assignee: "何晶晶", priority: "重要", status: "已完成", completedAt: "2026-08-09T20:00" },
  { id: "void", title: "作废事项", assignee: "赵旖旎", priority: "观察", status: "已作废", voidedAt: "2026-08-10T07:00" }
], { author: "何晶晶", today: "2026-08-10", focus: "all" });

assert.deepEqual(model.personal.map((task) => task.id), ["overdue", "today", "review"], "个人队列必须按逾期、优先级和截止时间排序");
assert.deepEqual(model.personalSummary, {
  total: 3,
  overdue: 1,
  dueToday: 1,
  processing: 1,
  reviewing: 1
});
assert.deepEqual(model.teamSummary, {
  total: 5,
  overdue: 1,
  dueToday: 2,
  unassigned: 1,
  assignees: 2
});
assert.deepEqual(model.historySummary, { total: 2, completed: 1, voided: 1 });
assert.deepEqual(model.recentClosed.map((task) => task.id), ["void", "done"], "最近闭环必须按真实终态时间倒序展示");

assert.deepEqual(
  makeTaskCenterCommandModel(model.personal, { author: "何晶晶", today: "2026-08-10", focus: "overdue" }).visiblePersonal.map((task) => task.id),
  ["overdue"],
  "逾期快捷筛选不能混入今天或未来任务"
);
assert.deepEqual(
  makeTaskCenterCommandModel(model.personal, { author: "何晶晶", today: "2026-08-10", focus: "today" }).visiblePersonal.map((task) => task.id),
  ["today"],
  "今日快捷筛选必须只显示当天截止任务"
);
assert.deepEqual(
  makeTaskCenterCommandModel(model.personal, { author: "何晶晶", today: "2026-08-10", focus: "review" }).visiblePersonal.map((task) => task.id),
  ["review"],
  "待复盘快捷筛选必须只显示待复盘任务"
);

console.log(JSON.stringify({ passed: 9, phase: "task-center-command-model" }));
