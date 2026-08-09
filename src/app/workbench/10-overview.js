    function pct(value) {
      if (!Number.isFinite(value)) return "-";
      return value.toFixed(1) + "%";
    }

    function num(value) {
      return Number(value || 0).toLocaleString("en-US");
    }

    function channelValue(entry, key) {
      if (key === "productCardGmv") return Number(entry.productCardGmv ?? entry.videoCardGmv ?? 0);
      return Number(entry[key] || 0);
    }

    function changeText(current, previous, suffix = "", lowerIsBetter = false, comparisonLabel = "较昨日") {
      const cur = Number(current || 0);
      const prev = Number(previous || 0);
      if (!prev && !cur) return { text: `${comparisonLabel} -`, cls: "" };
      if (!prev) return { text: `${comparisonLabel} 新增`, cls: lowerIsBetter ? "down" : "up" };
      const change = (cur - prev) / prev * 100;
      const sign = change >= 0 ? "+" : "";
      const improved = lowerIsBetter ? change <= 0 : change >= 0;
      return { text: `${comparisonLabel} ${sign}${change.toFixed(1)}%${suffix}`, cls: improved ? "up" : "down" };
    }

    function selectedDataRange() {
      if (activeDataRangePreset === "yesterday") {
        const date = addDays(today, -1);
        return { key: "yesterday", label: "昨日", metricLabel: "昨日", start: date, end: date, days: 1, isSingle: true };
      }
      if (activeDataRangePreset === "7d") {
        return { key: "7d", label: "近7日", metricLabel: "近7日", start: addDays(today, -6), end: today, days: 7, isSingle: false };
      }
      if (activeDataRangePreset === "30d") {
        return { key: "30d", label: "近30日", metricLabel: "近30日", start: addDays(today, -29), end: today, days: 30, isSingle: false };
      }
      if (activeDataRangePreset === "custom") {
        const date = activeCustomDataDate || today;
        return { key: "custom", label: "指定日", metricLabel: "指定日", start: date, end: date, days: 1, isSingle: true };
      }
      return { key: "today", label: "今日", metricLabel: "今日", start: today, end: today, days: 1, isSingle: true };
    }

    function gmvTrendDataRange(anchorDate = selectedDataRange().end) {
      const end = anchorDate || today;
      return { key: "7d", label: "近7日", metricLabel: "近7日", start: addDays(end, -6), end, days: 7, isSingle: false };
    }

    function selectedReportDataRange() {
      const date = activeReportDate && activeReportDate <= today ? activeReportDate : today;
      const key = date === today ? "today" : date === yesterday ? "yesterday" : "custom";
      const label = key === "today" ? "今日" : key === "yesterday" ? "昨日" : "当日";
      return { key, label, metricLabel: label, start: date, end: date, days: 1, isSingle: true };
    }

    function previousDataRange(range) {
      return {
        start: addDays(range.start, -range.days),
        end: addDays(range.end, -range.days),
        days: range.days,
        isSingle: range.isSingle
      };
    }

    function dataRangeDateText(range) {
      return range.isSingle ? range.start : `${range.start}—${range.end}`;
    }

    function dataRangeComparisonLabel(range) {
      if (range.key === "today") return "较昨日";
      if (range.key === "yesterday" || range.key === "custom") return "较前一日";
      return `较前${range.days}日`;
    }

    function dataRangeMeaning(range) {
      if (range.isSingle) return `${range.start} 单日数据；GMV、订单、退货取当日值，ROI按当日广告花费加权。`;
      return `${range.start}—${range.end}；GMV、订单、退货求和，ROI按广告花费加权，SPS取区间最新值。`;
    }

    function renderDataRangeControls(range = selectedDataRange()) {
      document.querySelectorAll("[data-range-preset]").forEach((button) => {
        button.classList.toggle("active", button.dataset.rangePreset === range.key);
        button.setAttribute("aria-pressed", String(button.dataset.rangePreset === range.key));
      });
      document.querySelectorAll("[data-range-date]").forEach((input) => {
        input.max = today;
        input.value = range.key === "custom" ? range.start : range.end;
      });
      document.querySelectorAll(".data-range-custom").forEach((label) => {
        label.classList.toggle("active", range.key === "custom");
      });
      document.querySelectorAll("[data-range-meaning]").forEach((node) => {
        node.textContent = dataRangeMeaning(range);
      });
    }

    function renderReportDateControl(range = selectedReportDataRange()) {
      const input = document.querySelector("[data-report-date]");
      if (!input) return;
      input.max = today;
      input.value = range.start;
    }

    function setDataRange(preset, customDate = "") {
      activeDataRangePreset = ["today", "yesterday", "7d", "30d", "custom"].includes(preset) ? preset : "today";
      if (activeDataRangePreset === "custom") activeCustomDataDate = customDate || today;
      reportPage = 1;
      render();
    }

    function overviewEntries() {
      const bySlot = new Map((state.entries || []).map((entry) => [
        `${entry.date}|${entry.store}`,
        { ...entry, source: overviewEntrySource(entry) }
      ]));
      const reports = uniqueReportsBySlot((state.reports || [])
        .filter((report) => report.status === "已提交" && Array.isArray(report.roleMetrics))
        .sort((a, b) => String(a.updatedAt || a.createdAt || "").localeCompare(String(b.updatedAt || b.createdAt || ""))));

      reports.forEach((report) => {
        (report.roleMetrics || []).forEach((row) => {
          if (!REPORT_STORES.some((store) => store.name === row.store)) return;
          const key = `${report.date}|${row.store}`;
          const entry = bySlot.get(key) || {
            id: `report-${report.date}-${row.store}`,
            date: report.date,
            store: row.store,
            gmv: 0,
            orders: 0,
            units: 0,
            sampleQty: 0,
            returns: 0,
            badReviews: 0,
            adSpend: 0,
            adGmv: 0,
            affiliateGmv: 0,
            productCardGmv: 0,
            sps: "",
            source: "日报同步"
          };
          const values = row.values || {};
          entry.owner = report.author || entry.owner || "";
          entry.source = "日报同步";
          if (report.role === "店群运营") {
            ["gmv", "orders", "units", "productCardGmv", "affiliateGmv", "adSpend"].forEach((field) => {
              if (values[field] !== "" && values[field] !== null && values[field] !== undefined) {
                entry[field] = Number(values[field]) || 0;
              }
            });
            if (values.adRoi !== "" && values.adRoi !== null && values.adRoi !== undefined) {
              entry.adGmv = Number(entry.adSpend || 0) * (Number(values.adRoi) || 0);
            }
          } else if (report.role === "售后组") {
            ["returns", "returnAmount"].forEach((field) => {
              if (values[field] !== "" && values[field] !== null && values[field] !== undefined) {
                entry[field] = Number(values[field]) || 0;
              }
            });
            if (values.sps !== "" && values.sps !== null && values.sps !== undefined) entry.sps = Number(values.sps) || 0;
          } else if (report.role === "BD" && values.samplesSent !== "" && values.samplesSent !== null && values.samplesSent !== undefined) {
            if (!entry._bdSynced) {
              entry.sampleQty = 0;
              entry._bdSynced = true;
            }
            entry.sampleQty = Number(entry.sampleQty || 0) + (Number(values.samplesSent) || 0);
          }
          bySlot.set(key, entry);
        });
      });
      return [...bySlot.values()].map((entry) => {
        const normalized = { ...entry };
        delete normalized._bdSynced;
        return normalized;
      });
    }

    function aggregateEntryRows(rows) {
      const ordered = [...(rows || [])].sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
      const totals = ordered.reduce((acc, entry) => {
        acc.gmv += Number(entry.gmv || 0);
        acc.orders += Number(entry.orders || 0);
        acc.units += Number(entry.units || 0);
        acc.sampleQty += Number(entry.sampleQty || 0);
        acc.returns += Number(entry.returns || 0);
        acc.badReviews += Number(entry.badReviews || 0);
        acc.adSpend += Number(entry.adSpend || 0);
        acc.adGmv += Number(entry.adGmv || 0);
        acc.affiliateGmv += Number(entry.affiliateGmv || 0);
        acc.productCardGmv += channelValue(entry, "productCardGmv");
        return acc;
      }, { gmv: 0, orders: 0, units: 0, sampleQty: 0, returns: 0, badReviews: 0, adSpend: 0, adGmv: 0, affiliateGmv: 0, productCardGmv: 0 });
      const latest = ordered.at(-1) || {};
      const latestSps = [...ordered].reverse().find((entry) => entry.sps !== "" && entry.sps !== null && entry.sps !== undefined);
      return {
        ...latest,
        ...totals,
        sps: latestSps?.sps ?? "",
        dataDays: new Set(ordered.map((entry) => entry.date).filter(Boolean)).size
      };
    }

    function entriesInRange(range) {
      return overviewEntries().filter((entry) => entry.date >= range.start && entry.date <= range.end);
    }

    function aggregateByDate(date) {
      return aggregateEntryRows(overviewEntries().filter((entry) => entry.date === date));
    }

    function aggregateByRange(range) {
      return aggregateEntryRows(entriesInRange(range));
    }

    function aggregateStoresByRange(range) {
      const grouped = new Map();
      entriesInRange(range).forEach((entry) => {
        if (!grouped.has(entry.store)) grouped.set(entry.store, []);
        grouped.get(entry.store).push(entry);
      });
      return new Map([...grouped.entries()].map(([store, rows]) => [store, aggregateEntryRows(rows)]));
    }

    function dateKeysInRange(range) {
      const dates = [];
      let cursor = range.start;
      while (cursor <= range.end && dates.length < 366) {
        dates.push(cursor);
        cursor = addDays(cursor, 1);
      }
      return dates;
    }

    function latestDate() {
      return [...new Set(overviewEntries().map((entry) => entry.date).filter(Boolean))].sort().pop() || today;
    }

    function previousDate(currentDate) {
      const dates = [...new Set(overviewEntries().map((entry) => entry.date).filter(Boolean))].sort();
      const index = dates.indexOf(currentDate);
      return index > 0 ? dates[index - 1] : "";
    }

    function roi(entry) {
      const spend = Number(entry.adSpend || 0);
      if (!spend) return 0;
      return Number(entry.adGmv || 0) / spend;
    }

    function returnRate(entry) {
      const orders = Number(entry.orders || 0);
      if (!orders) return 0;
      return Number(entry.returns || 0) / orders * 100;
    }

    function badReviewRate(entry) {
      const orders = Number(entry.orders || 0);
      if (!orders) return 0;
      return Number(entry.badReviews || 0) / orders * 100;
    }

    function getLatestEntries() {
      const byStore = new Map();
      overviewEntries().sort((a, b) => String(b.date).localeCompare(String(a.date))).forEach((entry) => {
        if (!byStore.has(entry.store)) byStore.set(entry.store, entry);
      });
      return [...byStore.values()];
    }

    function detectAnomalies(sourceEntries = getLatestEntries(), range = null) {
      const latest = sourceEntries;
      const anomalies = [];
      latest.forEach((entry) => {
        const entryRoi = roi(entry);
        const rr = returnRate(entry);
        const br = badReviewRate(entry);
        const gmv = Number(entry.gmv || 0);
        const affiliateShare = gmv ? Number(entry.affiliateGmv || 0) / gmv * 100 : 0;
        const productCardShare = gmv ? channelValue(entry, "productCardGmv") / gmv * 100 : 0;

        if (Number(entry.sps || 0) && Number(entry.sps) < 3.5) {
          anomalies.push({
            id: `${entry.id}-sps`,
            level: "紧急",
            type: "SPS风险",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} SPS低于3.5，达人计划能力受限`,
            detail: `当前SPS ${entry.sps}，优先排查商品满意度、退货、差评、履约和客服。`,
            owner: entry.owner || "店铺运营"
          });
        }
        if (rr >= 5) {
          anomalies.push({
            id: `${entry.id}-return`,
            level: "紧急",
            type: "退货风险",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} 退货率偏高`,
            detail: `退货率 ${pct(rr)}，退货数 ${entry.returns || 0}。需要拆原因：质量、描述不符、物流损坏或客户预期。`,
            owner: "售后/产品运营"
          });
        }
        if (br >= 1.5) {
          anomalies.push({
            id: `${entry.id}-review`,
            level: "重要",
            type: "差评风险",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} 差评率偏高`,
            detail: `差评率 ${pct(br)}，差评数 ${entry.badReviews || 0}。需要提取关键词并反推产品页和售后动作。`,
            owner: "客服/产品运营"
          });
        }
        if (Number(entry.adSpend || 0) > 0 && entryRoi < 4) {
          anomalies.push({
            id: `${entry.id}-roi`,
            level: "重要",
            type: "广告ROI",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} 广告ROI低于安全线`,
            detail: `当前ROI ${entryRoi.toFixed(2)}。需检查素材疲劳、售价利润、退款损耗和广告归因。`,
            owner: "广告投手"
          });
        }
        if (affiliateShare >= 75) {
          anomalies.push({
            id: `${entry.id}-affiliate`,
            level: "观察",
            type: "达人依赖",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} GMV高度依赖达人/联盟`,
            detail: `达人/联盟占比 ${pct(affiliateShare)}。需要维护旧视频复投，同时恢复新达人供给。`,
            owner: "达人BD"
          });
        }
        if (productCardShare < 12 && gmv > 0) {
          anomalies.push({
            id: `${entry.id}-card`,
            level: "观察",
            type: "商品卡偏弱",
            store: entry.store,
            sku: entry.topSku,
            title: `${entry.store} 商品卡GMV占比偏低`,
            detail: `商品卡占比 ${pct(productCardShare)}。检查内容素材、主推产品、价格、评价和推荐资格。`,
            owner: "产品运营"
          });
        }
      });
      const reportRange = range || { start: latestDate(), end: latestDate() };
      uniqueReportsBySlot((state.reports || []).filter((report) =>
        report.status === "已提交"
        && report.date >= reportRange.start
        && report.date <= reportRange.end
      )).forEach((report) => {
        (report.closureItems?.anomalies || []).forEach((item, index) => {
          if (!item.issue) return;
          anomalies.push({
            id: item.id || `${report.id}-reported-${index}`,
            level: item.risk === "高" ? "紧急" : item.risk === "中" ? "重要" : "观察",
            type: "日报异常",
            store: item.object || report.stores || "未指定店铺",
            sku: "",
            title: item.issue,
            detail: [item.reason ? `原因：${item.reason}` : "", item.impact ? `影响：${item.impact}` : ""].filter(Boolean).join("｜") || "来自已提交日报",
            owner: report.author || "待分配"
          });
        });
        (report.roleData?.inspectionIssues || []).forEach((item, index) => {
          if (!item.issue) return;
          anomalies.push({
            id: `${report.id}-inspection-${index}`,
            level: item.result && !/待|未/.test(item.result) ? "观察" : "重要",
            type: "店铺维护异常",
            store: item.store || "未选店铺",
            sku: "",
            title: `${item.store || "未选店铺"}：${item.issue}`,
            detail: `原因：${item.reason || "未填写"}｜处理：${item.result || "待处理"}`,
            owner: report.author || "店铺维护"
          });
        });
      });
      return anomalies;
    }

    function showToast(text) {
      const toast = document.getElementById("toast");
      toast.textContent = text;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 1600);
    }

    function renderEntranceSnapshot() {
      const reports = uniqueReportsBySlot((state.reports || []).filter((report) =>
        report.status === "已提交" && report.date === today
      ));
      const coreRoles = new Set(["售后组", "BD", "店铺维护", "店群运营"]);
      const coveredRoles = new Set(reports.map((report) => report.role).filter((role) => coreRoles.has(role)));
      const stores = new Set(reports.flatMap((report) => (report.roleMetrics || [])
        .map((row) => row.store)
        .filter((store) => REPORT_STORES.some((item) => item.name === store))));
      const openTasks = (state.tasks || []).filter(taskIsActive);
      const reportMetric = document.getElementById("entryReportMetric");
      const storeMetric = document.getElementById("entryStoreMetric");
      const taskMetric = document.getElementById("entryTaskMetric");
      const dateMetric = document.getElementById("entryCoverDate");
      if (reportMetric) reportMetric.textContent = `${coveredRoles.size}/${coreRoles.size}`;
      if (storeMetric) storeMetric.textContent = `${stores.size}/${REPORT_STORES.length}`;
      if (taskMetric) taskMetric.textContent = String(openTasks.length);
      if (dateMetric) dateMetric.innerHTML = `${today}<br />${cloudReady ? "团队数据已同步" : "正在同步团队数据"}`;
    }

    function enterWorkbench() {
      document.body.classList.remove("cover-active");
      document.body.classList.add("workbench-entered");
      const app = document.getElementById("workbenchApp");
      if (app) app.removeAttribute("inert");
      window.requestAnimationFrame(() => window.requestAnimationFrame(render));
      window.setTimeout(() => document.querySelector(".topbar .tab.active")?.focus(), 180);
    }

    function signedInWorkbenchUser() {
      return window.__workbenchUser && typeof window.__workbenchUser === "object" ? window.__workbenchUser : null;
    }

    function applySignedInUser() {
      const user = signedInWorkbenchUser();
      if (!user) return;
      const badge = document.getElementById("currentUserBadge");
      if (badge) {
        badge.textContent = `${user.name}${user.role === "admin" ? " · 管理员" : ""}`;
        badge.hidden = false;
      }
      const authorInput = document.querySelector("#reportForm [name='author']");
      if (authorInput) {
        authorInput.value = user.name || "";
        authorInput.readOnly = true;
        authorInput.title = "姓名来自当前登录账号；日报岗位仍可自由选择";
      }
    }

    let creatorDataLoadPromise = null;

    function activeViewName() {
      return document.querySelector(".view.active")?.id || "overview";
    }

    function ensureCreatorDataLoaded() {
      if (window.IMPORTED_CREATOR_DATA) return Promise.resolve(window.IMPORTED_CREATOR_DATA);
      if (creatorDataLoadPromise) return creatorDataLoadPromise;
      creatorDataLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/creator-data.js";
        script.async = true;
        script.onload = () => resolve(window.IMPORTED_CREATOR_DATA || {});
        script.onerror = () => reject(new Error("达人数据载入失败"));
        document.head.appendChild(script);
      });
      return creatorDataLoadPromise;
    }

    function renderCreatorLoadingState(message = "达人数据载入中…") {
      const importMeta = document.getElementById("creatorImportMeta");
      const metrics = document.getElementById("creatorMetrics");
      const productBars = document.getElementById("creatorProductBars");
      const actionList = document.getElementById("creatorActionList");
      if (importMeta) importMeta.textContent = message;
      if (metrics) metrics.innerHTML = "";
      if (productBars) productBars.innerHTML = '<div class="empty">正在准备达人数据…</div>';
      if (actionList) actionList.innerHTML = '<div class="empty">载入完成后自动显示</div>';
    }

    function renderCreatorView() {
      if (window.IMPORTED_CREATOR_DATA) {
        renderCreatorCenter();
        return;
      }
      renderCreatorLoadingState();
      ensureCreatorDataLoaded().then(() => {
        if (activeViewName() === "creators") renderCreatorCenter();
      }).catch((error) => {
        console.warn("Creator data unavailable", error);
        if (activeViewName() === "creators") renderCreatorLoadingState("载入失败，请刷新重试");
      });
    }

    function setView(viewName) {
      document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewName));
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewName));
      renderEntranceSnapshot();
      const activationPlan = overviewViewActivationPlan(viewName, renderedViewRevisions.get(viewName), uiRevision);
      if (activationPlan.syncOverviewAnalysis) {
        window.requestAnimationFrame(() => {
          if (activeViewName() === "overview") renderOverviewAnalysisMode(true);
        });
      }
      if (!activationPlan.renderFullView) return;
      window.requestAnimationFrame(() => render());
    }

    function render() {
      renderEntranceSnapshot();
      const viewName = activeViewName();
      if (viewName === "overview") {
        renderOverview();
        renderEntries();
        renderProducts(selectedDataRange());
        renderedViewRevisions.set(viewName, uiRevision);
        return;
      }
      if (viewName === "entry") {
        renderEntries();
        renderProducts();
        renderedViewRevisions.set(viewName, uiRevision);
        return;
      }
      if (viewName === "reports") {
        renderReports();
        renderedViewRevisions.set(viewName, uiRevision);
        return;
      }
      if (viewName === "tasks") {
        renderTasks();
        renderedViewRevisions.set(viewName, uiRevision);
        return;
      }
      if (viewName === "creators") renderCreatorView();
      renderedViewRevisions.set(viewName, uiRevision);
    }

    function renderOverview() {
      const range = selectedDataRange();
      const trendRange = gmvTrendDataRange(range.end);
      const priorTrendRange = previousDataRange(trendRange);
      const trendTotals = aggregateByRange(trendRange);
      const priorTrendTotals = aggregateByRange(priorTrendRange);
      const priorRange = previousDataRange(range);
      const storeEntries = aggregateStoresByRange(range);
      const scopedEntries = [...storeEntries.values()];
      const anomalies = detectAnomalies(scopedEntries, range);
      const totals = aggregateByRange(range);
      const prior = aggregateByRange(priorRange);
      const currentRoi = totals.adSpend ? totals.adGmv / totals.adSpend : 0;
      const priorRoi = prior.adSpend ? prior.adGmv / prior.adSpend : 0;
      const comparisonLabel = dataRangeComparisonLabel(range);
      const selectedDay = range.isSingle ? localDate(range.start) : null;
      const isRestDayWithoutData = Boolean(selectedDay && [0, 6].includes(selectedDay.getDay()) && !storeEntries.size);
      const comparison = (current, previous, lowerIsBetter = false) => isRestDayWithoutData
        ? { text: "休息日 · 暂无值班数据", cls: "" }
        : changeText(current, previous, "", lowerIsBetter, comparisonLabel);
      const operationStores = new Set(uniqueReportsBySlot((state.reports || []).filter((report) =>
        report.status === "已提交"
        && report.role === "店群运营"
        && report.date >= range.start
        && report.date <= range.end
        && Array.isArray(report.roleMetrics)
      )).flatMap((report) => (report.roleMetrics || [])
        .filter((row) => REPORT_STORES.some((store) => store.name === row.store))
        .map((row) => row.store)));
      const missingOperationStores = REPORT_STORES
        .map((store) => store.name)
        .filter((store) => !operationStores.has(store));

      document.getElementById("overviewDataDate").textContent = `${dataRangeDateText(range)} · ${range.label}经营总览`;
      renderOverviewDecisionBrief(makeOverviewDecisionModel(totals, anomalies, {
        rangeLabel: range.label,
        storesWithData: storeEntries.size,
        totalStores: REPORT_STORES.length
      }));
      document.getElementById("riskCount").textContent = `${anomalies.length} 项风险`;
      document.getElementById("storeCount").textContent = `${storeEntries.size}/${REPORT_STORES.length} 家范围内有数据`;
      document.getElementById("overviewRiskTitle").textContent = `${range.label}异常摘要`;
      document.getElementById("overviewRiskSubtitle").textContent = range.isSingle
        ? "基于当日店铺数据与已提交日报识别风险。"
        : "基于区间汇总指标与期间已提交日报识别风险；SPS使用各店铺最新值。";
      document.getElementById("gmvTrendSubtitle").textContent = `${dataRangeDateText(trendRange)} · GMV 与来源使用同一批多店铺数据。`;
      const trendComparison = overviewTrendComparisonState(trendTotals.dataDays, priorTrendTotals.dataDays);
      const trendChange = trendComparison.comparable
        ? changeText(trendTotals.gmv, priorTrendTotals.gmv, "", false, "较前7日")
        : { text: trendComparison.label, cls: "" };
      const trendSummary = document.getElementById("gmvTrendSummary");
      trendSummary.textContent = trendTotals.dataDays ? `${money(trendTotals.gmv)} · ${trendChange.text}` : "等待近 7 日数据";
      trendSummary.className = trendTotals.dataDays ? trendChange.cls : "";
      renderDataRangeControls(range);

      const priority = anomalies.slice(0, 5);
      document.getElementById("priorityList").innerHTML = priority.length ? priority.map((item) => `
        <div class="item">
          <span class="dot ${item.level === "紧急" ? "red" : item.level === "重要" ? "amber" : "green"}"></span>
          <div><b>${item.title}</b><small>${item.detail}</small></div>
          <span class="badge ${item.level === "紧急" ? "red" : item.level === "重要" ? "amber" : "green"}">${item.level}</span>
        </div>
      `).join("") : `<div class="empty">所选范围暂无异常。完成该范围日报后，这里会显示优先处理事项。</div>`;

      document.getElementById("storeRows").innerHTML = REPORT_STORES.map((store) => {
        const entry = storeEntries.get(store.name);
        if (!entry) {
          return `
            <tr>
              <td><b>${escapeHtml(store.name)}</b><br><small>${escapeHtml(store.group)} · 所选范围无数据</small></td>
              <td>${escapeHtml(dataRangeDateText(range))}</td>
              <td colspan="9"><span class="badge amber">等待该范围日报</span></td>
            </tr>
          `;
        }
        const sourceText = range.isSingle
          ? `${entry.owner || "-"} · ${entry.source || "日报同步"}`
          : `${entry.dataDays || 0}天有数据 · 最新 ${entry.owner || "-"}`;
        return `
          <tr>
            <td><b>${escapeHtml(entry.store)}</b><br><small>${escapeHtml(sourceText)}</small></td>
            <td>${escapeHtml(dataRangeDateText(range))}</td>
            <td>${money(entry.gmv)}</td>
            <td>${num(entry.orders)}</td>
            <td>${num(entry.units)}</td>
            <td>${num(entry.sampleQty)}</td>
            <td>${money(entry.adSpend)}</td>
            <td>${roi(entry) ? roi(entry).toFixed(2) : "-"}</td>
            <td>${money(entry.affiliateGmv)}</td>
            <td>${money(channelValue(entry, "productCardGmv"))}</td>
            <td>${entry.sps || "-"}</td>
          </tr>
        `;
      }).join("");

      renderOverviewAnalysisMode();
    }

    function renderOverviewDecisionBrief(model) {
      const brief = document.getElementById("overviewDecisionBrief");
      const status = document.getElementById("overviewDecisionStatus");
      const riskAction = document.getElementById("overviewRiskAction");
      if (brief) brief.dataset.tone = model.tone;
      if (status) status.textContent = model.statusLabel;
      document.getElementById("overviewDecisionTitle").textContent = model.headline;
      document.getElementById("overviewDecisionDetail").textContent = model.detail;
      document.getElementById("overviewDecisionPath").textContent = model.pathLabel;
      document.getElementById("overviewDecisionMetrics").innerHTML = [
        ["区间 GMV", money(model.metrics.gmv), model.available ? "店群成交结果" : "等待同步"],
        ["成交订单", num(model.metrics.orders) + " 单", model.available ? "所选范围汇总" : "等待同步"],
        ["成交销量", num(model.metrics.units) + " 件", model.available ? "多店合计" : "等待同步"],
        ["广告 ROI", model.metrics.roi ? model.metrics.roi.toFixed(2) : "—", model.metrics.roi ? "归因产出 / 花费" : "暂无花费"]
      ].map(([label, value, detail], index) => (
        '<div class="mini ' + (index === 0 ? "featured" : "") + '">'
        + "<span>" + escapeHtml(label) + "</span>"
        + "<strong>" + escapeHtml(value) + "</strong>"
        + "<small>" + escapeHtml(detail) + "</small>"
        + "</div>"
      )).join("");
      if (riskAction) {
        riskAction.disabled = !model.priority;
        riskAction.innerHTML = model.priority
          ? `查看优先风险 <span aria-hidden="true">↓</span>`
          : `暂无高优先风险 <span aria-hidden="true">✓</span>`;
      }
      document.getElementById("overviewDataHealth").innerHTML = [
        ["16:00", "店铺更新", model.available],
        ["17:00", "工作台同步", model.available],
        [`${model.metrics.storesWithData}/${model.metrics.totalStores}店`, "范围内有数据", model.metrics.storesWithData > 0],
        [model.statusLabel, "经营判断", model.available]
      ].map(([value, label, done]) => (
        '<span class="' + (done ? "done" : "") + '"><i></i><b>'
        + escapeHtml(value) + "</b><small>" + escapeHtml(label) + "</small></span>"
      )).join("");
    }

    const overviewAnalysisLayoutMedia = window.matchMedia("(min-width: 1180px)");

    function isOverviewDualDimensionLayout() {
      return overviewAnalysisLayoutMedia.matches;
    }

    function renderOverviewAnalysisMode(drawActiveCharts = true) {
      const visibility = overviewAnalysisVisibility(
        activeOverviewAnalysisMode,
        isOverviewDualDimensionLayout()
      );
      activeOverviewAnalysisMode = visibility.mode;
      document.querySelector("[data-overview-analysis-shell]")
        ?.classList.toggle("is-dual-dimension", visibility.dualDisplay);
      document.querySelectorAll("[data-overview-analysis-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.overviewAnalysisPanel === "gmv" ? visibility.gmvHidden : visibility.linkHidden;
      });
      document.querySelectorAll("[data-overview-analysis-mode]").forEach((button) => {
        const pressed = button.dataset.overviewAnalysisMode === "gmv" ? visibility.gmvPressed : visibility.linkPressed;
        button.classList.toggle("active", pressed);
        button.setAttribute("aria-pressed", String(pressed));
      });

      const range = selectedDataRange();
      const trendRange = gmvTrendDataRange(range.end);
      const subtitle = document.getElementById("gmvTrendSubtitle");
      const overviewGmvRange = document.getElementById("overviewGmvRange");
      if (overviewGmvRange) overviewGmvRange.textContent = dataRangeDateText(trendRange);
      if (visibility.dualDisplay) {
        if (subtitle) subtitle.textContent = "同时查看多店整体结果与重点链接价量，快速定位经营变化。";
        if (!drawActiveCharts) return;
        drawGmvTrend(trendRange);
        drawSourceDonut(
          aggregateByRange(trendRange),
          aggregateByRange(previousDataRange(trendRange))
        );
        renderOverviewProfitPulse();
        return;
      }
      if (visibility.mode === "link") {
        if (subtitle) subtitle.textContent = "按需下钻当前重点链接，查看价量、实际到手与利润。";
        if (drawActiveCharts) renderOverviewProfitPulse();
        return;
      }

      if (subtitle) subtitle.textContent = `${dataRangeDateText(trendRange)} · GMV 与来源使用同一批多店铺数据。`;
      if (!drawActiveCharts) return;
      drawGmvTrend(trendRange);
      drawSourceDonut(aggregateByRange(trendRange), aggregateByRange(previousDataRange(trendRange)));
    }

    function setOverviewAnalysisMode(mode) {
      activeOverviewAnalysisMode = overviewAnalysisVisibility(mode).mode;
      renderOverviewAnalysisMode();
    }


    function metricHtml([label, value, desc, color]) {
      const cls = color === "blue" ? "up" : color || "";
      return `<div class="metric"><label>${label}</label><strong>${value}</strong><span class="${cls}">${desc}</span></div>`;
    }

    function setupCanvas(canvas) {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const ctx = canvas.getContext("2d");
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { ctx, width: rect.width, height: rect.height };
    }

    function showChartTooltip(event, html) {
      const tooltip = document.getElementById("chartTooltip");
      tooltip.innerHTML = html;
      tooltip.style.left = `${event.clientX}px`;
      tooltip.style.top = `${event.clientY}px`;
      tooltip.classList.add("show");
    }

    function hideChartTooltip() {
      document.getElementById("chartTooltip").classList.remove("show");
    }

    function bindChartHover(canvas, handler) {
      if (canvas.dataset.hoverBound === "1") return;
      canvas.dataset.hoverBound = "1";
      canvas.addEventListener("mousemove", (event) => handler(event));
      canvas.addEventListener("mouseleave", hideChartTooltip);
    }

    function setOverviewChartEmptyState(id, isEmpty) {
      const emptyState = document.getElementById(id);
      if (!emptyState) return;
      emptyState.hidden = !isEmpty;
      const canvas = emptyState.parentElement?.querySelector("canvas");
      if (canvas) canvas.hidden = isEmpty;
    }

    function overviewProfitPulseModel() {
      try {
        const rows = selectProductProfitRows(
          profitWorkspaceState.repository,
          profitWorkspaceState.activeDate,
          {
            storeId: profitWorkspaceState.storeFilter,
            lifecycleStatus: profitWorkspaceState.lifecycleFilter
          }
        );
        return makeOverviewPulseModel(
          rows,
          selectProfitAttentionItems(rows),
          profitWorkspaceState.activeDate
        );
      } catch (error) {
        console.warn("Overview profit pulse unavailable", error);
        return makeOverviewPulseModel([], [], "");
      }
    }

    function overviewPulseDateLabel(dateKey) {
      const parts = String(dateKey || "").split("-");
      return parts.length === 3 ? Number(parts[1]) + "/" + Number(parts[2]) : String(dateKey || "");
    }

    function drawOverviewProfitPulse(model) {
      const canvas = document.getElementById("overviewPulseChart");
      if (!canvas) return;
      const { ctx, width, height } = setupCanvas(canvas);
      const rootStyles = getComputedStyle(document.documentElement);
      const acid = rootStyles.getPropertyValue("--color-pulse-acid").trim() || "#78f58f";
      const instrument = rootStyles.getPropertyValue("--color-pulse-instrument").trim() || "#0d1712";
      ctx.clearRect(0, 0, width, height);
      const points = Array.isArray(model?.points) ? model.points : [];
      if (!points.length) return;

      const pad = { left: 26, right: 26, top: 20, bottom: 22 };
      const chartWidth = Math.max(1, width - pad.left - pad.right);
      const chartHeight = Math.max(1, height - pad.top - pad.bottom);
      const barBaseline = pad.top + chartHeight;
      const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;
      const synced = points.filter((point) => point.synced);
      const prices = synced.map((point) => point.averageTransactionPrice).filter((value) => Number.isFinite(value));
      const units = synced.map((point) => Number(point.itemsSold || 0));
      const minPrice = prices.length ? Math.min(...prices) : 0;
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      const priceRange = Math.max(maxPrice - minPrice, 1);
      const maxUnits = Math.max(...units, 1);
      const barWidth = Math.min(34, Math.max(14, step * 0.34));

      ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
      ctx.lineWidth = 1;
      [0.2, 0.5, 0.8].forEach((ratio) => {
        const y = pad.top + chartHeight * ratio;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
      });

      const coordinates = points.map((point, index) => {
        const x = pad.left + step * index;
        const barHeight = point.synced ? Math.max(4, Number(point.itemsSold || 0) / maxUnits * chartHeight * 0.42) : 0;
        if (point.synced) {
          ctx.save();
          ctx.globalAlpha = index === points.length - 1 ? 0.78 : 0.34;
          ctx.fillStyle = acid;
          ctx.fillRect(x - barWidth / 2, barBaseline - barHeight, barWidth, barHeight);
          ctx.restore();
        } else {
          ctx.save();
          ctx.setLineDash([2, 5]);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
          ctx.beginPath();
          ctx.moveTo(x, pad.top + 6);
          ctx.lineTo(x, barBaseline - 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(x, barBaseline - 4, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
          ctx.fill();
          ctx.restore();
        }
        const price = point.averageTransactionPrice;
        const y = Number.isFinite(price)
          ? pad.top + chartHeight * 0.58 - ((price - minPrice) / priceRange) * chartHeight * 0.45
          : null;
        return { ...point, x, y };
      });

      let segmentOpen = false;
      ctx.beginPath();
      coordinates.forEach((point) => {
        if (!point.synced || point.y === null) {
          segmentOpen = false;
          return;
        }
        if (!segmentOpen) {
          ctx.moveTo(point.x, point.y);
          segmentOpen = true;
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.strokeStyle = acid;
      ctx.lineWidth = 2.75;
      ctx.lineJoin = "round";
      ctx.stroke();

      const activePoints = coordinates.filter((point) => point.synced && point.y !== null);
      activePoints.forEach((point) => {
        const isCurrent = point === activePoints.at(-1);
        ctx.save();
        if (isCurrent) {
          ctx.shadowColor = acid;
          ctx.shadowBlur = 16;
        }
        ctx.beginPath();
        ctx.arc(point.x, point.y, isCurrent ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isCurrent ? acid : instrument;
        ctx.fill();
        ctx.strokeStyle = isCurrent ? "#ffffff" : acid;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });
    }

    function renderOverviewProfitPulse() {
      const model = overviewProfitPulseModel();
      const density = overviewPulseDensity(model.points);
      const focus = document.getElementById("overviewProfitFocus");
      const action = document.getElementById("overviewProfitAction");
      const health = document.getElementById("overviewProfitHealth");
      const pulseCanvas = document.getElementById("overviewPulseChart");
      const pulseSparse = document.getElementById("overviewPulseSparse");
      const pulseSparseDetail = document.getElementById("overviewPulseSparseDetail");
      const pulseRibbon = pulseSparse?.closest(".overview-pulse-ribbon");
      const focusReceived = document.getElementById("overviewFocusReceived");
      const focusReceivedLabel = document.getElementById("overviewFocusReceivedLabel");
      const focusProfit = document.getElementById("overviewFocusProfit");
      const focusProfitLabel = document.getElementById("overviewFocusProfitLabel");
      const signalPrice = document.getElementById("overviewSignalPrice");
      const signalMotion = document.getElementById("overviewSignalMotion");
      const signalAction = document.getElementById("overviewSignalAction");
      const overviewLinkRange = document.getElementById("overviewLinkRange");
      if (overviewLinkRange) overviewLinkRange.textContent = overviewPulseRangeLabel(model.points);
      document.getElementById("overviewProfitFocusTitle").textContent = model.focusTitle;
      document.getElementById("overviewProfitFocusDetail").textContent = model.focusDetail;
      document.getElementById("overviewPulsePath").textContent = model.pathLabel;
      if (health) {
        health.textContent = model.healthLabel;
        health.dataset.tone = model.healthTone;
      }
      if (focus) focus.dataset.tone = model.healthTone;
      if (focusReceived) focusReceived.textContent = model.available ? profitUiMoney(model.metrics.receivedAmount) : "—";
      if (focusReceivedLabel) focusReceivedLabel.textContent = `${model.metrics.periodLabel || "近7日"}实际到手`;
      if (focusProfit) focusProfit.textContent = model.available ? profitUiMoney(model.metrics.finalProfit) : "—";
      if (focusProfitLabel) focusProfitLabel.textContent = `${model.metrics.periodLabel || "近7日"}${model.metrics.profitLabel || "暂算利润"}`;
      if (signalPrice) signalPrice.textContent = model.signals.priceLabel;
      if (signalMotion) signalMotion.textContent = model.signals.motionLabel;
      if (signalAction) signalAction.textContent = model.signals.actionLabel;
      if (action) {
        action.disabled = !model.available || !model.listingId;
        action.dataset.listingId = model.listingId;
      }
      if (pulseCanvas) pulseCanvas.hidden = density.sparse;
      if (pulseSparse) pulseSparse.hidden = !density.sparse;
      if (pulseSparseDetail) {
        pulseSparseDetail.textContent = `已同步 ${density.syncedDays}/7 天，至少需要 2 个有效数据日。`;
      }
      pulseRibbon?.classList.toggle("is-sparse", density.sparse);

      const metricRows = [
        ["近 7 天销量", num(model.metrics.itemsSold) + " 件", model.available ? model.productCode + " · " + model.activeSkuCount + " 个在售 SKU" : "等待同步"],
        ["近 7 天 GMV", profitUiMoney(model.metrics.gmv), model.available ? "产品链接成交总额" : "等待同步"],
        ["有效数据", density.syncedDays + "/7 天", density.sparse ? "至少 2 天后展示趋势" : "成交趋势可用于判断"],
        ["经营状态", model.healthLabel, model.available ? "费用与经营判断已形成" : "等待同步后判断"]
      ];
      document.getElementById("overviewLinkMetrics").innerHTML = metricRows.map(([label, value, detail], index) => (
        '<div class="mini ' + (index === 1 ? "featured" : "") + '">'
        + "<span>" + escapeHtml(label) + "</span>"
        + "<strong>" + escapeHtml(value) + "</strong>"
        + "<small>" + escapeHtml(detail) + "</small>"
        + "</div>"
      )).join("");

      document.getElementById("overviewPulseDays").innerHTML = model.points.map((point) => (
        '<span class="' + (point.synced ? "synced" : "pending") + '">'
        + "<b>" + escapeHtml(overviewPulseDateLabel(point.dateKey)) + "</b>"
        + "<small>" + (point.synced ? num(point.itemsSold) + " 件" : "待同步") + "</small>"
        + "</span>"
      )).join("");

      if (!density.sparse) drawOverviewProfitPulse(model);
    }

    function drawGmvTrend(range = selectedDataRange()) {
      const canvas = document.getElementById("gmvTrendChart");
      if (!canvas) return;
      const dates = dateKeysInRange(range);
      const scopedRows = entriesInRange(range);
      const gmvByDate = scopedRows.reduce((map, entry) => {
        map.set(entry.date, (map.get(entry.date) || 0) + Number(entry.gmv || 0));
        return map;
      }, new Map());
      const points = dates.map((date) => ({ date, value: gmvByDate.get(date) || 0 }));
      const chartState = overviewChartState(scopedRows.length > 0);
      setOverviewChartEmptyState("gmvTrendEmpty", chartState.isEmpty);
      if (!chartState.shouldDraw) return;

      const { ctx, width, height } = setupCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const pad = { left: 58, right: 24, top: 24, bottom: 42 };
      const chartW = width - pad.left - pad.right;
      const chartH = height - pad.top - pad.bottom;
      const maxValue = Math.max(...points.map((point) => point.value), 1);
      const yMax = maxValue * 1.18;

      ctx.strokeStyle = "rgba(12,15,20,0.08)";
      ctx.lineWidth = 1;
      ctx.fillStyle = "#7a808a";
      ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
      for (let i = 0; i <= 4; i += 1) {
        const y = pad.top + chartH * i / 4;
        const value = yMax * (1 - i / 4);
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillText(overviewCompactMoney(value), 8, y + 4);
      }

      const coords = points.map((point, index) => {
        const x = pad.left + (points.length === 1 ? chartW / 2 : chartW * index / (points.length - 1));
        const y = pad.top + chartH - (point.value / yMax) * chartH;
        return { ...point, x, y };
      });

      const gradient = ctx.createLinearGradient(0, pad.top, 0, height - pad.bottom);
      gradient.addColorStop(0, "rgba(44,110,232,0.2)");
      gradient.addColorStop(1, "rgba(44,110,232,0)");
      ctx.beginPath();
      coords.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.lineTo(coords[coords.length - 1].x, height - pad.bottom);
      ctx.lineTo(coords[0].x, height - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      coords.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = "#2c6ee8";
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.stroke();

      const dateLabelStep = coords.length <= 7 ? 1 : Math.ceil((coords.length - 1) / 6);
      coords.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = "#2c6ee8";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#48505c";
        ctx.font = "12px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        if (index === 0 || index === coords.length - 1 || index % dateLabelStep === 0) {
          ctx.fillText(overviewPulseDateLabel(point.date), point.x, height - 14);
        }
      });
      ctx.textAlign = "left";
      canvas._trendPoints = coords;
      bindChartHover(canvas, (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const nearest = canvas._trendPoints.reduce((best, point) => {
          const distance = Math.abs(point.x - x);
          return !best || distance < best.distance ? { point, distance } : best;
        }, null);
        if (!nearest || nearest.distance > 42) {
          hideChartTooltip();
          return;
        }
        const point = nearest.point;
        showChartTooltip(event, `<b>${point.date}</b><span>GMV：${money(point.value)}</span><span>多店铺汇总</span>`);
      });
    }

    function drawSourceDonut(totals, priorTotals = {}) {
      const canvas = document.getElementById("sourceDonutChart");
      const legend = document.getElementById("sourceLegend");
      const insight = document.getElementById("sourceInsight");
      if (!canvas || !legend || !insight) return;
      const known = totals.affiliateGmv + totals.productCardGmv;
      const other = Math.max(0, totals.gmv - known);
      const priorKnown = Number(priorTotals.affiliateGmv || 0) + Number(priorTotals.productCardGmv || 0);
      const priorOther = Math.max(0, Number(priorTotals.gmv || 0) - priorKnown);
      const slices = [
        { label: "联盟GMV", value: Number(totals.affiliateGmv || 0), previous: Number(priorTotals.affiliateGmv || 0), color: "#12201b" },
        { label: "商品卡", value: Number(totals.productCardGmv || 0), previous: Number(priorTotals.productCardGmv || 0), color: "#2f6fed" },
        { label: "未归类成交", value: other, previous: priorOther, color: "#aab3ad" }
      ];
      const total = slices.reduce((sum, item) => sum + item.value, 0);
      const chartState = overviewChartState(total > 0);
      setOverviewChartEmptyState("sourceDonutEmpty", chartState.isEmpty);

      if (!chartState.shouldDraw) {
        legend.innerHTML = "";
        insight.textContent = "等待来源数据形成经营判断。";
        return;
      }

      const { ctx, width, height } = setupCanvas(canvas);
      ctx.clearRect(0, 0, width, height);

      const barX = 4;
      const barY = Math.max(8, (height - 24) / 2);
      const barWidth = Math.max(1, width - 8);
      const barHeight = 24;
      ctx.fillStyle = "rgba(18,32,27,0.08)";
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 12);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(barX, barY, barWidth, barHeight, 12);
      ctx.clip();
      let cursor = barX;
      const sliceMeta = [];
      slices.filter((slice) => slice.value > 0).forEach((slice) => {
        const segmentWidth = barWidth * slice.value / total;
        ctx.fillStyle = slice.color;
        ctx.fillRect(cursor, barY, segmentWidth, barHeight);
        sliceMeta.push({ ...slice, total, startX: cursor, endX: cursor + segmentWidth, top: barY, bottom: barY + barHeight });
        cursor += segmentWidth;
      });
      ctx.restore();

      const adRoi = totals.adSpend ? totals.adGmv / totals.adSpend : 0;
      const sourceDeltaText = (current, previous) => {
        const delta = current - previous;
        if (!delta) return "持平";
        return `${delta > 0 ? "+" : "-"}${money(Math.abs(delta))}`;
      };
      legend.innerHTML = slices.map((slice) => `
        <span class="source-legend-item">
          <i class="legend-dot" style="background:${slice.color}"></i>
          <b>${slice.label}</b>
          <strong>${money(slice.value)}<small>${pct(slice.value / total * 100)} · ${sourceDeltaText(slice.value, slice.previous)}</small></strong>
        </span>
      `).join("") + (totals.adGmv || totals.adSpend ? `
        <span class="source-legend-item source-legend-ad" title="广告归因可能与联盟、商品卡或自然成交重叠，因此不计入交易来源占比">
          <i class="legend-dot" style="background:#18885a"></i>
          <b>广告归因</b>
          <strong>${money(totals.adGmv)}<small>ROI ${adRoi ? adRoi.toFixed(2) : "-"}</small></strong>
        </span>
      ` : "");
      const totalDelta = Number(totals.gmv || 0) - Number(priorTotals.gmv || 0);
      const driver = [...slices].sort((a, b) => totalDelta === 0
        ? b.value - a.value
        : totalDelta > 0
          ? (b.value - b.previous) - (a.value - a.previous)
          : (a.value - a.previous) - (b.value - b.previous))[0];
      const driverDelta = driver.value - driver.previous;
      insight.innerHTML = totalDelta === 0
        ? `<b>来源结构稳定：${driver.label}</b><span>本期占比 ${pct(driver.value / total * 100)}，较前 7 日持平</span>`
        : `<b>${totalDelta > 0 ? "增长" : "下滑"}主因：${driver.label}</b><span>${driverDelta >= 0 ? "+" : "-"}${money(Math.abs(driverDelta))}，较前 7 日${driverDelta >= 0 ? "增加" : "减少"}</span>`;
      canvas._sourceSegments = sliceMeta;
      bindChartHover(canvas, (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const slice = canvas._sourceSegments.find((item) => x >= item.startX && x <= item.endX && y >= item.top && y <= item.bottom);
        if (!slice) {
          hideChartTooltip();
          return;
        }
        const delta = slice.value - slice.previous;
        showChartTooltip(event, `<b>${slice.label}</b><span>近 7 日：${money(slice.value)}</span><span>占比：${pct(slice.value / slice.total * 100)}</span><span>较前 7 日：${delta >= 0 ? "+" : "-"}${money(Math.abs(delta))}</span>`);
      });
    }

    function renderEntries() {
      const rows = [...state.entries].sort((a, b) => String(b.date).localeCompare(String(a.date)));
      document.getElementById("entryRows").innerHTML = rows.length ? rows.map((entry) => `
        <tr>
          <td>${entry.date || "-"}</td>
          <td><b>${entry.store}</b><br><small>${entry.owner || "-"}</small></td>
          <td>${money(entry.gmv)}</td>
          <td>${num(entry.orders)}</td>
          <td>${roi(entry) ? roi(entry).toFixed(2) : "-"}</td>
          <td>${entry.topSku || "-"}</td>
          <td>${entry.returns || 0}</td>
          <td>${entry.badReviews || 0}</td>
          <td>${entry.note || "-"}</td>
        </tr>
      `).join("") : `<tr><td colspan="9"><div class="empty">暂无录入。</div></td></tr>`;
    }

    function renderProducts(range = null) {
      const rows = [...state.products]
        .filter((item) => !range || (item.date >= range.start && item.date <= range.end))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
      const count = document.getElementById("productCount");
      const body = document.getElementById("productRows");
      if (!count || !body) return;
      count.textContent = `${rows.length} 条SKU记录`;
      body.innerHTML = rows.length ? rows.map((item) => `
        <tr>
          <td>${item.date || "-"}</td>
          <td>${item.store || "-"}</td>
          <td><b>${item.product || "-"}</b></td>
          <td>${item.sku || "-"}</td>
          <td>${num(item.units)}</td>
          <td>${money(item.gmv)}</td>
          <td>${money(item.productCardGmv)}</td>
          <td>${money(item.affiliateGmv)}</td>
          <td>${money(item.price)}</td>
          <td>${num(item.stock)}</td>
          <td>${num(item.returns)}</td>
          <td>${num(item.badReviews)}</td>
        </tr>
      `).join("") : `<tr><td colspan="12"><div class="empty">暂无产品明细。</div></td></tr>`;
    }

    function renderAnomalies() {
      const anomalies = detectAnomalies();
      const urgent = anomalies.filter((item) => item.level === "紧急").length;
      const important = anomalies.filter((item) => item.level === "重要").length;
      const watch = anomalies.filter((item) => item.level === "观察").length;
      document.getElementById("anomalyMetrics").innerHTML = [
        ["全部异常", num(anomalies.length), "自动识别风险项", "down"],
        ["紧急", num(urgent), "需要当天处理", "down"],
        ["重要", num(important), "本周必须推进", "warn"],
        ["观察", num(watch), "持续跟踪", "up"]
      ].map(metricHtml).join("");

      document.getElementById("anomalyList").innerHTML = anomalies.length ? anomalies.map((item) => `
        <div class="item">
          <span class="dot ${item.level === "紧急" ? "red" : item.level === "重要" ? "amber" : "green"}"></span>
          <div>
            <b>${item.title}</b>
            <small>${item.store} · ${item.sku || "无SKU"} · 建议责任人：${item.owner}<br>${item.detail}</small>
          </div>
          <span class="badge ${item.level === "紧急" ? "red" : item.level === "重要" ? "amber" : "green"}">${item.type}</span>
        </div>
      `).join("") : `<div class="empty">暂无异常。系统会根据SPS、退货、差评、ROI、渠道占比识别风险。</div>`;
    }
