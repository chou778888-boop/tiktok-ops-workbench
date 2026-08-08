import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile("src/app/workbench/30-reports.js", "utf8");

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

const rangeContext = vm.createContext({ Date, today: "2026-08-07" });
vm.runInContext([
  functionSource("localDate"),
  functionSource("dateKey"),
  functionSource("weekRange"),
  functionSource("addDays"),
  functionSource("effectiveRangeEnd"),
  functionSource("previousComparableRange"),
  functionSource("reportRangeHasCompleteRoleCoverage"),
  functionSource("weeklyComparePercent"),
  functionSource("weeklyComparePoints"),
  "this.api = { weekRange, addDays, previousComparableRange, reportRangeHasCompleteRoleCoverage, weeklyComparePercent, weeklyComparePoints };"
].join("\n"), rangeContext);

const currentRange = structuredClone(rangeContext.api.weekRange("2026-08-07"));
assert.deepEqual(
  currentRange,
  { start: "2026-07-31", end: "2026-08-06" },
  "8月7日生成周报时必须统计截至昨日的7月31日至8月6日"
);
assert.deepEqual(
  structuredClone(rangeContext.api.previousComparableRange(currentRange)),
  { start: "2026-07-24", end: "2026-07-30" },
  "对比周期必须是紧邻当前窗口之前的完整7天"
);

const completeDates = ["2026-07-24", "2026-07-25", "2026-07-26", "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30"];
const coreRoles = ["售后组", "BD", "店铺维护", "店群运营"];
const completePreviousReports = completeDates.flatMap((date) => coreRoles.map((role) => ({ date, role, status: "已提交" })));
const incompletePreviousReports = completePreviousReports.filter((report) => !(report.date === "2026-07-26" && report.role === "BD"));
assert.equal(
  rangeContext.api.reportRangeHasCompleteRoleCoverage(completePreviousReports, { start: "2026-07-24", end: "2026-07-30" }, coreRoles),
  true,
  "前一周期7天且四个核心岗位每天都有提交时才允许生成整体环比"
);
assert.equal(
  rangeContext.api.reportRangeHasCompleteRoleCoverage(incompletePreviousReports, { start: "2026-07-24", end: "2026-07-30" }, coreRoles),
  false,
  "前一周期任意一天缺少核心岗位数据时必须禁止整体环比"
);
assert.equal(rangeContext.api.weeklyComparePercent(120, 100, false), "上周期数据不完整");
assert.equal(rangeContext.api.weeklyComparePercent(120, 100, true), "+20.0%");
assert.equal(rangeContext.api.weeklyComparePoints(4.2, 3.9, true), "+0.30");

const stores = ["DreamWeave", "sweet dream", "Dreamland", "Dreamdaily", "MoonDream", "Himood Smile"];
const schemas = {
  "店群运营": {
    columns: [
      { key: "gmv", label: "GMV" },
      { key: "orders", label: "订单" },
      { key: "adSpend", label: "广告成本" },
      { key: "adRoi", label: "广告ROI", aggregate: "latest" }
    ]
  },
  "BD": { columns: [{ key: "samplesSent", label: "寄样" }] },
  "售后组": { columns: [{ key: "sps", label: "SPS", aggregate: "latest" }, { key: "returns", label: "退货退款" }] },
  "店铺维护": { columns: [{ key: "linksAdded", label: "新上架" }] },
  "其他": { columns: [{ key: "completedItems", label: "完成事项" }] }
};

const roles = Object.keys(schemas);
const longText = "实际业务明细".repeat(180);
const reports = [];
for (let offset = 0; offset < 14; offset += 1) {
  const date = new Date(2026, 6, 24 + offset, 12);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  roles.forEach((role, roleIndex) => {
    reports.push({
      id: `${dateKey}-${role}`,
      date: dateKey,
      role,
      author: ["售后组", "店铺维护"].includes(role) ? "团队" : `成员${roleIndex}`,
      risk: offset % 5 === 0 ? "高" : "低",
      status: "已提交",
      roleMetrics: stores.map((store, storeIndex) => ({
        store,
        values: {
          gmv: 1000 + offset * 10 + storeIndex,
          orders: 70 + storeIndex,
          adSpend: 80,
          adRoi: 8.5,
          samplesSent: 5,
          sps: 4.2,
          returns: 2,
          linksAdded: 1,
          completedItems: 1
        }
      })),
      roleData: {
        extraCompletedWork: longText,
        samples: [{ product: "MT", sent: 5 }],
        privateRawRows: longText
      },
      results: longText,
      anomalies: `${longText}\n${longText}`,
      reviews: longText,
      tasksText: longText,
      approvals: longText
    });
  });
}

const buildStart = source.indexOf("function clientFingerprint(");
const buildEnd = source.indexOf("function aiAnalysisKey(", buildStart);
assert.ok(buildStart >= 0 && buildEnd > buildStart, "AI payload production functions must be extractable");

const buildContext = vm.createContext({
  state: { reports, tasks: [] },
  REPORT_STORES: stores.map((name) => ({ name, group: "测试" })),
  REPORT_SCHEMAS: schemas,
  uniqueReportsBySlot: (items) => items,
  effectiveRangeEnd: (range) => range.end,
  previousComparableRange: () => ({ start: "2026-07-24", end: "2026-07-30" }),
  reportRangeHasCompleteRoleCoverage: rangeContext.api.reportRangeHasCompleteRoleCoverage,
  addDays: rangeContext.api.addDays,
  reportLines: (value) => String(value || "").split(/\n+/).filter(Boolean),
  reportResultsText: (report) => report.results || "",
  taskCountsInPerformance: () => true
});
vm.runInContext(`${source.slice(buildStart, buildEnd)}\nthis.buildAiAnalysisPayload = buildAiAnalysisPayload;`, buildContext);
const payload = structuredClone(buildContext.buildAiAnalysisPayload("运营总览", currentRange));
const payloadText = JSON.stringify(payload);

assert.ok(payload.reports.length <= roles.length, "AI当前周期输入必须按岗位聚合，不能逐份发送原始日报");
assert.ok(payload.previousReports.length <= roles.length, "AI对比周期输入必须按岗位聚合，不能逐份发送原始日报");
assert.ok(payloadText.length < 30000, `AI请求必须保持在安全体积内，当前为 ${payloadText.length} 字符`);
assert.doesNotMatch(payloadText, /privateRawRows|roleMetrics|roleData/, "AI请求不得继续携带完整原始表单结构");
assert.equal(payload.comparisonReady, true, "完整上周期可以进入AI环比分析");

buildContext.state.reports = reports.filter((report) => !(report.date === "2026-07-24" && report.role === "BD"));
const incompletePayload = structuredClone(buildContext.buildAiAnalysisPayload("运营总览", currentRange));
assert.equal(incompletePayload.comparisonReady, false, "上周期缺少岗位日报时AI载荷必须标记不可环比");
assert.equal(incompletePayload.previousReports.length, 0, "上周期不完整时不得把残缺数据作为AI环比证据");
assert.match(source, /function renderOverallWeeklyReport\(range\)[\s\S]*reportRangeHasCompleteRoleCoverage\(previousReports, previousRange, CORE_REPORT_ROLES\)/, "运营总览必须按四个核心岗位检查上周期完整性");
assert.match(source, /环比口径：[\s\S]*上周期[\s\S]*数据不完整，已禁止生成环比/, "周报正文必须向团队明确说明为何没有环比");

console.log(JSON.stringify({ passed: 15, phase: "report-rolling-seven-day-and-ai-payload" }));
