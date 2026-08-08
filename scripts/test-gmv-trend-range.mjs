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
assert.match(source, /overviewTrendComparisonState\(trendTotals\.dataDays, priorTrendTotals\.dataDays\)/, "GMV 环比必须经过完整周期判断");
assert.match(source, /overviewCompactMoney\(value\)/, "GMV 纵轴必须使用紧凑金额，避免真实数字撑坏图表");
assert.match(source, /overviewPulseDateLabel\(point\.date\)/, "GMV 横轴必须使用短日期标签");

console.log(JSON.stringify({ passed: 5, behavior: "GMV 与来源统一滚动近7日" }));
