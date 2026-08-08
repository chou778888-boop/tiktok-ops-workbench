import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile("src/app/workbench/20-tasks.js", "utf8");
const styles = await readFile("src/styles/modules/06-tasks.css", "utf8");

function functionSource(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing production function ${name}`);
  const bodyStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated production function ${name}`);
}

const context = vm.createContext({});
vm.runInContext([
  functionSource("normalizedTaskFingerprintPart"),
  functionSource("taskDuplicateFingerprint"),
  functionSource("groupTaskHistoryRecords"),
  "this.api = { taskDuplicateFingerprint, groupTaskHistoryRecords };"
].join("\n"), context);

const shared = {
  title: "TPGold颈椎枕拍卖合作跟进样品",
  assignee: "赵旖旎",
  source: "BD日报",
  store: "DreamWeave、Dreamland、Dreamdaily、Himood Smile",
  action: "完成标准：样品和物流部同步",
  acceptance: "样品和物流部同步",
  due: "2026-08-07T18:00",
  reviewAt: "2026-08-08T10:00",
  sourceReport: "report-2026-08-06-bd",
  status: "已作废"
};
const records = [
  { ...shared, id: "duplicate-latest", voidedAt: "2026-08-06T17:48:46" },
  { ...shared, id: "duplicate-middle", voidedAt: "2026-08-06T17:48:42" },
  { ...shared, id: "duplicate-oldest", voidedAt: "2026-08-06T17:48:14" },
  { ...shared, id: "other-report", sourceReport: "report-2026-08-07-bd", voidedAt: "2026-08-07T17:00:00" },
  { ...shared, id: "completed-outcome", status: "已完成", completedAt: "2026-08-06T18:00:00" }
];

assert.equal(
  context.api.taskDuplicateFingerprint(records[0]),
  context.api.taskDuplicateFingerprint(records[1]),
  "同一日报产生的同内容同状态任务必须命中同一审计分组"
);
assert.notEqual(
  context.api.taskDuplicateFingerprint(records[0]),
  context.api.taskDuplicateFingerprint(records[3]),
  "不同日报中合法重复出现的同名任务不能被误分组"
);
assert.notEqual(
  context.api.taskDuplicateFingerprint(records[0]),
  context.api.taskDuplicateFingerprint(records[4]),
  "处理结果不同的历史任务必须分别保留"
);

const groups = structuredClone(context.api.groupTaskHistoryRecords(records));
assert.equal(groups.length, 3, "五条历史记录应形成一个重复组和两个独立组");
assert.equal(groups[0].primary.id, "duplicate-latest", "分组主记录必须保留历史列表中的最新记录");
assert.deepEqual(groups[0].duplicates.map((task) => task.id), ["duplicate-middle", "duplicate-oldest"]);
assert.equal(groups.reduce((count, group) => count + 1 + group.duplicates.length, 0), records.length, "折叠只能改变展示，不能删除审计记录");
assert.match(source, /const groups = groupTaskHistoryRecords\(history\)/, "历史面板必须按审计组分页，而不是继续平铺重复记录");
assert.match(source, /另有 \$\{group\.duplicates\.length\} 条重复归档[\s\S]*保留完整审计记录/, "重复组必须明确说明原始审计记录仍被保留");
assert.match(styles, /\.task-history-cluster-records/, "重复归档展开区必须有独立布局样式");

console.log(JSON.stringify({ passed: 10, phase: "non-destructive-task-history-clustering" }));
