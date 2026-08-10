import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("src/app/workbench/11-overview-pulse-model.js", "utf8").catch(() => "");
assert.match(source, /function makeOverviewPulseModel\(/, "经营脉冲必须拥有独立的纯展示模型");
assert.match(source, /function overviewPulseDensity\(/, "趋势密度判断必须是可测试的纯函数");
assert.match(source, /function overviewTrendComparisonState\(/, "趋势环比必须显式判断当前与前周期完整性");
assert.match(source, /function overviewCompactMoney\(/, "图表金额刻度必须使用紧凑格式");
assert.match(source, /function overviewEntrySource\(/, "总览必须保留原始数据来源并为历史数据提供兜底");
assert.match(source, /function makeOverviewDecisionModel\(/, "总览必须先形成公司级经营判断，再允许下钻链接");
assert.match(source, /function overviewAnalysisVisibility\(/, "总览分析模式必须由纯状态模型保证互斥可见");
assert.match(source, /function overviewPulseRangeLabel\(/, "链接模式必须显示自身点位的真实日期范围");

const runtime = Function(`${source}\nreturn {
  makeOverviewPulseModel,
  overviewPulseDensity,
  overviewTrendComparisonState,
  overviewCompactMoney,
  overviewEntrySource,
  makeOverviewDecisionModel,
  overviewAnalysisVisibility,
  overviewPulseRangeLabel,
  overviewViewActivationPlan: typeof overviewViewActivationPlan === "function" ? overviewViewActivationPlan : null,
  overviewAnalysisResizeDecision: typeof overviewAnalysisResizeDecision === "function" ? overviewAnalysisResizeDecision : null,
  overviewChartState: typeof overviewChartState === "function" ? overviewChartState : null,
  overviewProfitNavigationTarget: typeof overviewProfitNavigationTarget === "function" ? overviewProfitNavigationTarget : null,
  makeOverviewOperatingTrendModel: typeof makeOverviewOperatingTrendModel === "function" ? makeOverviewOperatingTrendModel : null,
  overviewOperatingRelationship: typeof overviewOperatingRelationship === "function" ? overviewOperatingRelationship : null,
  latestCompleteOverviewDay: typeof latestCompleteOverviewDay === "function" ? latestCompleteOverviewDay : null,
  overviewRiskActionState: typeof overviewRiskActionState === "function" ? overviewRiskActionState : null,
  overviewChartTypography: typeof overviewChartTypography === "function" ? overviewChartTypography : null,
  overviewReadableWrap: typeof overviewReadableWrap === "function" ? overviewReadableWrap : null
};`)();
const {
  makeOverviewPulseModel,
  overviewPulseDensity,
  overviewTrendComparisonState,
  overviewCompactMoney,
  overviewEntrySource,
  makeOverviewDecisionModel,
  overviewAnalysisVisibility,
  overviewPulseRangeLabel,
  overviewViewActivationPlan,
  overviewAnalysisResizeDecision,
  overviewChartState,
  overviewProfitNavigationTarget,
  makeOverviewOperatingTrendModel,
  overviewOperatingRelationship,
  latestCompleteOverviewDay,
  overviewRiskActionState,
  overviewChartTypography,
  overviewReadableWrap
} = runtime;

assert.equal(typeof overviewReadableWrap, "function", "经营判断等完整语义词组必须拥有统一的防孤字换行规则");
assert.equal(
  overviewReadableWrap("今日未同步，不按零计入经营判断。"),
  "今日未同步，不按零计入经\u2060营\u2060判\u2060断。",
  "经营判断应优先作为完整词组留在一行，只有整组放不下时再换行"
);

assert.equal(typeof overviewChartTypography, "function", "总览 Canvas 必须使用可测试的统一字号模型");
assert.deepEqual(overviewChartTypography(390), { axis: 12, endpoint: 12, endpointPillHeight: 24 });
assert.deepEqual(overviewChartTypography(1280), { axis: 13, endpoint: 13, endpointPillHeight: 26 });

assert.equal(typeof overviewRiskActionState, "function", "无风险时必须取消独占一行的大按钮");
assert.deepEqual(overviewRiskActionState(null, 0), {
  hidden: true,
  disabled: true,
  label: ""
});
assert.deepEqual(overviewRiskActionState({ level: "重要" }, 2), {
  hidden: false,
  disabled: false,
  label: "查看 2 项优先风险"
});

assert.equal(typeof makeOverviewOperatingTrendModel, "function", "店群趋势必须由纯模型区分待同步日期与真实零值");
assert.equal(typeof overviewOperatingRelationship, "function", "重合曲线必须由纯模型解释量价关系，不能人为错位");
assert.equal(typeof latestCompleteOverviewDay, "function", "单日待同步时必须由纯模型查找最近完整经营日");

const operatingTrend = makeOverviewOperatingTrendModel([
  { date: "2026-08-03", gmv: 100, orders: 4 },
  { date: "2026-08-03", gmv: 50, orders: 1 },
  { date: "2026-08-04", gmv: 0, orders: 0 },
  { date: "2026-08-06", gmv: 20, orders: 2 }
], { start: "2026-08-03", end: "2026-08-09", days: 7 });

assert.deepEqual(operatingTrend.points[0], {
  dateKey: "2026-08-03", synced: true, gmv: 150, orders: 5, averageOrderValue: 30
});
assert.deepEqual(operatingTrend.points[1], {
  dateKey: "2026-08-04", synced: true, gmv: 0, orders: 0, averageOrderValue: null
});
assert.deepEqual(operatingTrend.points[2], {
  dateKey: "2026-08-05", synced: false, gmv: null, orders: null, averageOrderValue: null
});
assert.deepEqual(operatingTrend.summary, {
  gmv: 170, orders: 7, averageOrderValue: 24.29, syncedDays: 3, expectedDays: 7
});

assert.deepEqual(overviewOperatingRelationship([
  { synced: true, gmv: 12321.4, orders: 370 },
  { synced: true, gmv: 13133.8, orders: 394 },
  { synced: true, gmv: 13946.2, orders: 419 },
  { synced: true, gmv: 14623.2, orders: 438 },
  { synced: true, gmv: 15435.6, orders: 464 },
  { synced: false, gmv: null, orders: null }
]), {
  mode: "volume-led",
  stable: true,
  averageOrderValue: 33.31,
  minAverageOrderValue: 33.27,
  maxAverageOrderValue: 33.39,
  spreadPercent: 0.36,
  label: "客单稳定 · GMV 由订单量驱动"
});

assert.deepEqual(overviewOperatingRelationship([
  { synced: true, gmv: 100, orders: 10 },
  { synced: true, gmv: 200, orders: 10 }
]), {
  mode: "price-changing",
  stable: false,
  averageOrderValue: 15,
  minAverageOrderValue: 10,
  maxAverageOrderValue: 20,
  spreadPercent: 66.67,
  label: "客单变化 · 需结合价格判断"
});

assert.deepEqual(overviewOperatingRelationship([
  { synced: true, gmv: 100, orders: 10 }
]), {
  mode: "insufficient",
  stable: false,
  averageOrderValue: 10,
  minAverageOrderValue: 10,
  maxAverageOrderValue: 10,
  spreadPercent: 0,
  label: "量价关系待更多数据"
});

assert.deepEqual(latestCompleteOverviewDay([
  { date: "2026-08-08", gmv: 200, orders: 10, units: 12, adSpend: 20, adGmv: 80 },
  { date: "2026-08-10", gmv: 999, orders: 99, units: 99, adSpend: 0, adGmv: 0 }
], "2026-08-09"), {
  dateKey: "2026-08-08", gmv: 200, orders: 10, units: 12, adSpend: 20, adGmv: 80, roi: 4
});
assert.equal(latestCompleteOverviewDay([], "2026-08-09"), null);

assert.equal(typeof overviewViewActivationPlan, "function", "总览重新激活必须拥有独立于业务 revision 的同步计划");
assert.deepEqual(overviewViewActivationPlan("overview", 4, 4), {
  renderFullView: false,
  syncOverviewAnalysis: true
});
assert.deepEqual(overviewViewActivationPlan("overview", 3, 4), {
  renderFullView: true,
  syncOverviewAnalysis: false
});
assert.deepEqual(overviewViewActivationPlan("reports", 4, 4), {
  renderFullView: false,
  syncOverviewAnalysis: false
});

assert.equal(typeof overviewAnalysisResizeDecision, "function", "总览分析区必须判断实际尺寸变化后再重绘");
assert.deepEqual(
  overviewAnalysisResizeDecision({ width: 690, height: 659 }, { width: 664.4, height: 659.2 }, true),
  { width: 664, height: 659, redraw: true }
);
assert.deepEqual(
  overviewAnalysisResizeDecision({ width: 664, height: 659 }, { width: 664.2, height: 659.4 }, true),
  { width: 664, height: 659, redraw: false }
);
assert.deepEqual(
  overviewAnalysisResizeDecision({ width: 664, height: 659 }, { width: 320, height: 724 }, false),
  { width: 320, height: 724, redraw: false }
);

assert.equal(typeof overviewChartState, "function", "Canvas 空态恢复必须先形成可见绘制计划");
assert.deepEqual(overviewChartState(false), { isEmpty: true, shouldDraw: false });
assert.deepEqual(overviewChartState(true), { isEmpty: false, shouldDraw: true });

assert.equal(typeof overviewProfitNavigationTarget, "function", "重点链接入口必须只导航到仓库中存在的链接");
const listingLookup = new Map([["listing-jzz-main", { id: "listing-jzz-main", productId: "product-jzz" }]]);
assert.deepEqual(
  overviewProfitNavigationTarget("listing-jzz-main", (listingId) => listingLookup.get(listingId)),
  { listingId: "listing-jzz-main", productId: "product-jzz" }
);
assert.equal(overviewProfitNavigationTarget("missing", (listingId) => listingLookup.get(listingId)), null);
const sampleProductRow = {
  product: { id: "product-jzz", code: "JZZ", name: "UFIST 颈椎按摩枕 2 件套" },
  listings: [{
    listing: { id: "listing-jzz-main", displayName: "UFIST 2-Piece Cervical Massage Pillow Set" },
    store: { name: "Ufist-DreamWeave" },
    skuRows: Array.from({ length: 6 }, (_, index) => ({ listingSku: { active: index < 5 } })),
    sevenDay: {
      averageTransactionPrice: 17.32,
      days: [
        { dateKey: "2026-07-28", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-07-29", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-07-30", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-07-31", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-08-01", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-08-02", result: { itemsSold: 0, gmv: 0, completedSkuCount: 0 } },
        { dateKey: "2026-08-03", result: { itemsSold: 39, gmv: 675.52, completedSkuCount: 6 } }
      ],
      result: {
        itemsSold: 39,
        gmv: 675.52,
        receivedAmount: 631.47,
        finalProfit: 163.47,
        profitCompleteness: "provisional"
      }
    }
  }]
};
const sampleAttention = {
  listingId: "listing-jzz-main",
  title: "JZZ · 广告、样品待补",
  detail: "已得暂算利润 163.47 美元，补齐内部费用后转为最终利润",
  tone: "warning"
};

const model = makeOverviewPulseModel([sampleProductRow], [sampleAttention], "2026-08-03");
assert.equal(model.productCode, "JZZ");
assert.equal(model.listingId, "listing-jzz-main");
assert.equal(model.metrics.itemsSold, 39);
assert.equal(model.metrics.gmv, 675.52);
assert.equal(model.metrics.receivedAmount, 631.47);
assert.equal(model.metrics.finalProfit, 163.47);
assert.equal(model.metrics.profitLabel, "暂算利润");
assert.equal(model.metrics.periodLabel, "近7日");
assert.equal(model.focusDetail, "2026-08-03 单日判断 · 已得暂算利润 163.47 美元，补齐内部费用后转为最终利润");
assert.equal(model.points.length, 7);
assert.equal(model.points.filter((point) => point.synced).length, 1);
assert.equal(model.points.at(-1).averageTransactionPrice, 17.32);
assert.match(model.pathLabel, /JZZ/);
assert.match(model.pathLabel, /Ufist-DreamWeave/);
assert.equal(model.signals.priceLabel, "$17.32 当前成交均价");
assert.equal(model.signals.motionLabel, "1/7 天已同步 · 39 件");
assert.equal(model.signals.actionLabel, "JZZ · 广告、样品待补");
assert.deepEqual(overviewPulseDensity([]), { syncedDays: 0, sparse: true });
assert.deepEqual(overviewPulseDensity([{ synced: true }]), { syncedDays: 1, sparse: true });
assert.deepEqual(overviewPulseDensity([{ synced: true }, { synced: true }]), { syncedDays: 2, sparse: false });
assert.deepEqual(overviewPulseDensity([null, { synced: false }, { synced: true }]), { syncedDays: 1, sparse: true });
assert.deepEqual(overviewTrendComparisonState(7, 7), { comparable: true, label: "" });
assert.deepEqual(overviewTrendComparisonState(7, 0), { comparable: false, label: "前7日数据不完整" });
assert.deepEqual(overviewTrendComparisonState(4, 7), { comparable: false, label: "当前仅4天数据" });
assert.equal(overviewCompactMoney(18214.01), "$18.2k");
assert.equal(overviewCompactMoney(945), "$945");
assert.equal(overviewCompactMoney(1250000), "$1.3m");
assert.equal(overviewEntrySource({ source: "本地演示数据" }), "本地演示数据");
assert.equal(overviewEntrySource({}), "历史录入");

const urgentDecision = makeOverviewDecisionModel(
  { gmv: 15435.6, orders: 452, units: 506, adSpend: 923.4, adGmv: 4210.7 },
  [
    { level: "重要", store: "MoonDream", sku: "BL-BLUE", owner: "广告投手", title: "广告ROI低于安全线", detail: "当前ROI 3.30。" },
    { level: "紧急", store: "Himood Smile", sku: "TB-WHITE", owner: "小朱", title: "SPS低于3.5", detail: "当前SPS 3.4。" },
    { level: "观察", store: "sweet dream", sku: "MZ-WHITE", owner: "阿宁", title: "达人依赖偏高", detail: "联盟占比78%。" }
  ],
  { rangeLabel: "今日", storesWithData: 6, totalStores: 6 }
);
assert.equal(urgentDecision.available, true);
assert.equal(urgentDecision.tone, "critical");
assert.equal(urgentDecision.headline, "1项紧急风险正在影响今日经营结果");
assert.equal(urgentDecision.detail, "最优先处理：SPS低于3.5。当前SPS 3.4。");
assert.equal(urgentDecision.pathLabel, "店群 → Himood Smile → TB-WHITE → 小朱");
assert.equal(urgentDecision.priority.store, "Himood Smile");
assert.deepEqual(urgentDecision.metrics, {
  gmv: 15435.6,
  orders: 452,
  units: 506,
  roi: 4.56,
  riskCount: 3,
  highPriorityCount: 2,
  storesWithData: 6,
  totalStores: 6
});

const stableDecision = makeOverviewDecisionModel(
  { gmv: 8600, orders: 240, units: 271, adSpend: 0, adGmv: 0 },
  [],
  { rangeLabel: "近7日", storesWithData: 6, totalStores: 6 }
);
assert.equal(stableDecision.tone, "healthy");
assert.equal(stableDecision.headline, "整体经营稳定，继续观察来源结构");
assert.equal(stableDecision.detail, "6/6家店铺在所选范围内有数据，当前没有系统识别出的高优先异常。");

const emptyDecision = makeOverviewDecisionModel({}, [], { rangeLabel: "昨日", storesWithData: 0, totalStores: 6 });
assert.equal(emptyDecision.available, false);
assert.equal(emptyDecision.tone, "pending");
assert.equal(emptyDecision.headline, "所选范围还没有经营数据");

assert.deepEqual(overviewAnalysisVisibility("gmv"), {
  mode: "gmv",
  dualDisplay: false,
  gmvHidden: false,
  linkHidden: true,
  gmvPressed: true,
  linkPressed: false
});
assert.deepEqual(overviewAnalysisVisibility("link"), {
  mode: "link",
  dualDisplay: false,
  gmvHidden: true,
  linkHidden: false,
  gmvPressed: false,
  linkPressed: true
});
assert.deepEqual(overviewAnalysisVisibility("gmv", true), {
  mode: "gmv",
  dualDisplay: true,
  gmvHidden: false,
  linkHidden: false,
  gmvPressed: true,
  linkPressed: false
});
assert.deepEqual(overviewAnalysisVisibility("link", true), {
  mode: "link",
  dualDisplay: true,
  gmvHidden: false,
  linkHidden: false,
  gmvPressed: false,
  linkPressed: true
});
assert.equal(overviewAnalysisVisibility("unknown", false).mode, "gmv");
assert.equal(overviewPulseRangeLabel(model.points), "2026-07-28—2026-08-03");
assert.equal(overviewPulseRangeLabel([{ dateKey: "2026-08-03" }]), "2026-08-03");
assert.equal(overviewPulseRangeLabel([{ dateKey: "2026-08-03" }, { dateKey: "2026-07-30" }]), "2026-07-30—2026-08-03");
assert.equal(overviewPulseRangeLabel([{ dateKey: "" }, null]), "链接周期待同步");

const empty = makeOverviewPulseModel([], [], "2026-08-03");
assert.equal(empty.available, false);
assert.equal(empty.listingId, "");
assert.equal(empty.points.length, 0);
assert.equal(empty.signals.priceLabel, "等待成交数据");
assert.equal(empty.signals.motionLabel, "等待同步数据");
assert.equal(empty.signals.actionLabel, "等待经营判断");

console.log(JSON.stringify({ passed: 71, phase: "overview-pulse-model" }));
