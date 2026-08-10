import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { loadAppSources } from "./app-sources.mjs";

const source = (await loadAppSources()).combined;

assert.match(
  source,
  /let activeDataRangePreset = "today";/,
  "总览其他指标必须继续默认今日"
);
assert.match(
  source,
  /function gmvTrendDataRange\(anchorDate = selectedDataRange\(\)\.end\)[\s\S]*?key: "7d"[\s\S]*?start: addDays\(end, -6\)[\s\S]*?end[\s\S]*?days: 7[\s\S]*?isSingle: false/,
  "增长归因必须定义锚定所选日期的滚动近 7 日范围"
);
assert.match(source, /model\.summary\.syncedDays/, "统一经营图必须显式消费完整数据日数量，禁止把缺报日期当零");
assert.match(source, /overviewCompactMoney\(value\)/, "GMV 纵轴必须使用紧凑金额，避免真实数字撑坏图表");
assert.match(source, /makeOverviewOperatingTrendModel\(entriesInRange\(trendRange\), trendRange\)/, "店群 GMV 与成交订单必须消费同一滚动周期模型");
assert.match(source, /function drawOverviewOperatingChart\(model\)/, "总览必须使用统一双线经营图");
assert.match(source, /point\.synced/, "待同步日期必须作为断点处理");
assert.match(source, /averageOrderValue/, "统一图悬浮信息必须包含派生客单价");
assert.match(source, /overviewOperatingChart/, "统一经营图必须绑定唯一 Canvas");
assert.doesNotMatch(source, /function drawGmvTrend\(/, "旧 GMV 单线图不得继续存在");

console.log(JSON.stringify({ passed: 10, behavior: "GMV 与成交订单统一滚动近7日" }));
