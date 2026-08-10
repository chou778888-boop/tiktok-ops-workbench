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
          if (activeViewName() === "overview") renderOverviewOperatingSurface(true);
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

      renderOverviewOperatingSurface();
    }

    function renderOverviewDecisionBrief(model, range = selectedDataRange()) {
      const brief = document.getElementById("overviewDecisionBrief");
      const status = document.getElementById("overviewDecisionStatus");
      const riskAction = document.getElementById("overviewRiskAction");
      const latestComplete = !model.available && range.isSingle
        ? latestCompleteOverviewDay(state.entries, range.end)
        : null;
      const displayMetrics = latestComplete || model.metrics;
      const displayAvailable = model.available || Boolean(latestComplete);
      const statusLabel = latestComplete ? "今日待同步" : model.statusLabel;
      if (brief) brief.dataset.tone = latestComplete ? "watch" : model.tone;
      if (status) status.textContent = statusLabel;
      document.getElementById("overviewDecisionTitle").textContent = latestComplete
        ? `今日数据待同步，先看 ${latestComplete.dateKey} 完整结果`
        : model.headline;
      document.getElementById("overviewDecisionDetail").textContent = latestComplete
        ? `最近完整日 GMV ${money(latestComplete.gmv)}、成交 ${num(latestComplete.orders)} 单；今日未同步，不按零计入经营判断。`
        : model.detail;
      document.getElementById("overviewDecisionPath").textContent = model.pathLabel;
      document.getElementById("overviewDecisionMetrics").innerHTML = [
        [latestComplete ? "最近完整日 GMV" : "区间 GMV", displayAvailable ? money(displayMetrics.gmv) : "—", latestComplete ? latestComplete.dateKey : model.available ? "店群成交结果" : "等待同步"],
        ["成交订单", displayAvailable ? num(displayMetrics.orders) + " 单" : "—", latestComplete ? "最近完整日" : model.available ? "所选范围汇总" : "等待同步"],
        ["成交销量", displayAvailable ? num(displayMetrics.units) + " 件" : "—", latestComplete ? "最近完整日" : model.available ? "多店合计" : "等待同步"],
        ["广告 ROI", displayMetrics.roi ? displayMetrics.roi.toFixed(2) : "—", displayMetrics.roi ? "归因产出 / 花费" : "暂无花费"]
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
        [statusLabel, "经营判断", model.available]
      ].map(([value, label, done]) => (
        '<span class="' + (done ? "done" : "") + '"><i></i><b>'
        + escapeHtml(value) + "</b><small>" + escapeHtml(label) + "</small></span>"
      )).join("");
    }

    function overviewOperatingDateLabel(dateKey) {
      const parts = String(dateKey || "").split("-");
      return parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : String(dateKey || "");
    }

    function renderOverviewSourceEvidence(totals, priorTotals = {}) {
      const legend = document.getElementById("sourceLegend");
      const insight = document.getElementById("sourceInsight");
      const stack = document.getElementById("sourceContributionBar");
      if (!legend || !insight || !stack) return;
      const known = Number(totals.affiliateGmv || 0) + Number(totals.productCardGmv || 0);
      const priorKnown = Number(priorTotals.affiliateGmv || 0) + Number(priorTotals.productCardGmv || 0);
      const slices = [
        { label: "联盟 GMV", value: Number(totals.affiliateGmv || 0), previous: Number(priorTotals.affiliateGmv || 0), color: "#78f58f" },
        { label: "商品卡", value: Number(totals.productCardGmv || 0), previous: Number(priorTotals.productCardGmv || 0), color: "#2f6fed" },
        { label: "未归类", value: Math.max(0, Number(totals.gmv || 0) - known), previous: Math.max(0, Number(priorTotals.gmv || 0) - priorKnown), color: "#aeb8b1" }
      ];
      const total = slices.reduce((sum, item) => sum + item.value, 0);
      if (!total) {
        stack.innerHTML = '<span class="is-pending" style="width:100%"></span>';
        legend.innerHTML = '<span class="overview-evidence-pending">来源明细待同步</span>';
        insight.textContent = "等待来源数据形成经营判断。";
        return;
      }
      stack.innerHTML = slices.filter((item) => item.value > 0).map((item) => (
        `<span style="width:${item.value / total * 100}%;background:${item.color}" title="${escapeHtml(item.label)} ${pct(item.value / total * 100)}"></span>`
      )).join("");
      const deltaText = (value, previous) => {
        const delta = value - previous;
        return delta === 0 ? "持平" : `${delta > 0 ? "+" : "-"}${money(Math.abs(delta))}`;
      };
      legend.innerHTML = slices.map((item) => `
        <span class="source-legend-item">
          <i class="legend-dot" style="background:${item.color}"></i>
          <b>${escapeHtml(item.label)}</b>
          <strong>${pct(item.value / total * 100)}<small>${money(item.value)} · ${deltaText(item.value, item.previous)}</small></strong>
        </span>
      `).join("");
      const totalDelta = Number(totals.gmv || 0) - Number(priorTotals.gmv || 0);
      const driver = [...slices].sort((left, right) => Math.abs(right.value - right.previous) - Math.abs(left.value - left.previous))[0];
      const driverDelta = driver.value - driver.previous;
      insight.innerHTML = `<b>${totalDelta >= 0 ? "增长" : "下滑"}主要来自 ${escapeHtml(driver.label)}</b><span>${driverDelta >= 0 ? "+" : "-"}${money(Math.abs(driverDelta))}，贡献占比 ${pct(driver.value / total * 100)}</span>`;
    }

    function renderOverviewOperatingSurface(drawChart = true) {
      const range = selectedDataRange();
      const trendRange = gmvTrendDataRange(range.end);
      const model = makeOverviewOperatingTrendModel(entriesInRange(trendRange), trendRange);
      const priorTrendRange = previousDataRange(trendRange);
      const summary = document.getElementById("overviewOperatingSummary");
      const rangeBadge = document.getElementById("overviewOperatingRange");
      const subtitle = document.getElementById("gmvTrendSubtitle");
      const canvas = document.getElementById("overviewOperatingChart");
      const empty = document.getElementById("overviewOperatingEmpty");
      if (rangeBadge) rangeBadge.textContent = dataRangeDateText(trendRange);
      if (subtitle) subtitle.textContent = `${dataRangeDateText(trendRange)} · 多店 GMV 与成交订单来自同一批日报；空缺日期保持待同步。`;
      if (summary) {
        summary.innerHTML = [
          ["GMV", model.summary.syncedDays ? money(model.summary.gmv) : "—"],
          ["成交订单", model.summary.syncedDays ? `${num(model.summary.orders)} 单` : "—"],
          ["平均客单", model.summary.averageOrderValue === null ? "—" : money(model.summary.averageOrderValue)]
        ].map(([label, value], index) => `<span class="${index === 0 ? "featured" : ""}"><small>${label}</small><strong>${value}</strong></span>`).join("");
      }
      if (empty) empty.hidden = model.summary.syncedDays > 0;
      if (canvas) canvas.hidden = model.summary.syncedDays === 0;
      renderOverviewSourceEvidence(
        aggregateByRange(trendRange),
        aggregateByRange(priorTrendRange)
      );
      renderOverviewProfitPulse();
      if (drawChart && canvas && model.summary.syncedDays > 0) drawOverviewOperatingChart(model);
    }

    function drawOverviewOperatingChart(model) {
      const canvas = document.getElementById("overviewOperatingChart");
      if (!canvas || canvas.hidden) return;
      const { ctx, width, height } = setupCanvas(canvas);
      const rootStyles = getComputedStyle(document.documentElement);
      const acid = rootStyles.getPropertyValue("--color-pulse-acid").trim() || "#78f58f";
      const orderColor = "#b7d8ff";
      const points = Array.isArray(model?.points) ? model.points : [];
      ctx.clearRect(0, 0, width, height);
      if (!points.length) return;
      const pad = { left: width < 520 ? 42 : 66, right: width < 520 ? 38 : 58, top: 26, bottom: 42 };
      const chartWidth = Math.max(1, width - pad.left - pad.right);
      const chartHeight = Math.max(1, height - pad.top - pad.bottom);
      const synced = points.filter((point) => point.synced);
      const maxGmv = Math.max(...synced.map((point) => Number(point.gmv || 0)), 1) * 1.12;
      const maxOrders = Math.max(...synced.map((point) => Number(point.orders || 0)), 1) * 1.12;
      ctx.font = `${width < 520 ? 10 : 11}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.textBaseline = "middle";
      for (let index = 0; index <= 4; index += 1) {
        const ratio = index / 4;
        const y = pad.top + chartHeight * ratio;
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(width - pad.right, y);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.52)";
        ctx.textAlign = "right";
        ctx.fillText(overviewCompactMoney(maxGmv * (1 - ratio)), pad.left - 9, y);
        ctx.textAlign = "left";
        ctx.fillText(String(Math.round(maxOrders * (1 - ratio))), width - pad.right + 9, y);
      }
      const coordinates = points.map((point, index) => {
        const x = pad.left + (points.length === 1 ? chartWidth / 2 : chartWidth * index / (points.length - 1));
        return {
          ...point,
          x,
          gmvY: point.synced ? pad.top + chartHeight - Number(point.gmv || 0) / maxGmv * chartHeight : null,
          ordersY: point.synced ? pad.top + chartHeight - Number(point.orders || 0) / maxOrders * chartHeight : null
        };
      });
      const drawSegmentedLine = (key, color, dash = []) => {
        let segmentOpen = false;
        ctx.beginPath();
        coordinates.forEach((point) => {
          if (!point.synced || point[key] === null) {
            segmentOpen = false;
            return;
          }
          if (segmentOpen) ctx.lineTo(point.x, point[key]);
          else ctx.moveTo(point.x, point[key]);
          segmentOpen = true;
        });
        ctx.setLineDash(dash);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.75;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.setLineDash([]);
      };
      drawSegmentedLine("gmvY", acid);
      drawSegmentedLine("ordersY", orderColor, [7, 6]);
      coordinates.forEach((point) => {
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = point.synced ? "rgba(255,255,255,0.66)" : "rgba(255,255,255,0.34)";
        ctx.fillText(overviewOperatingDateLabel(point.dateKey), point.x, height - 13);
        if (!point.synced) {
          ctx.beginPath();
          ctx.arc(point.x, pad.top + chartHeight, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.arc(point.x, point.gmvY, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#102019";
        ctx.fill();
        ctx.strokeStyle = acid;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = orderColor;
        ctx.fillRect(point.x - 3.5, point.ordersY - 3.5, 7, 7);
      });
      canvas._operatingPoints = coordinates;
      bindChartHover(canvas, (event) => {
        const activePoints = canvas._operatingPoints || [];
        const rect = canvas.getBoundingClientRect();
        const pointerX = event.clientX - rect.left;
        const nearest = activePoints.reduce((best, point) => {
          const distance = Math.abs(point.x - pointerX);
          return !best || distance < best.distance ? { point, distance } : best;
        }, null);
        if (!nearest || nearest.distance > Math.max(28, rect.width / Math.max(activePoints.length, 1) / 2)) {
          hideChartTooltip();
          return;
        }
        const point = nearest.point;
        showChartTooltip(event, point.synced
          ? `<b>${point.dateKey}</b><span>GMV：${money(point.gmv)}</span><span>成交订单：${num(point.orders)} 单</span><span>平均客单：${point.averageOrderValue === null ? "—" : money(point.averageOrderValue)}</span>`
          : `<b>${point.dateKey}</b><span>日报待同步，不按零计算</span>`);
      });
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

    function renderOverviewProfitPulse() {
      const model = overviewProfitPulseModel();
      const focus = document.getElementById("overviewProfitFocus");
      const action = document.getElementById("overviewProfitAction");
      const health = document.getElementById("overviewProfitHealth");
      const focusReceived = document.getElementById("overviewFocusReceived");
      const focusReceivedLabel = document.getElementById("overviewFocusReceivedLabel");
      const focusProfit = document.getElementById("overviewFocusProfit");
      const focusProfitLabel = document.getElementById("overviewFocusProfitLabel");
      const signalPrice = document.getElementById("overviewSignalPrice");
      const signalMotion = document.getElementById("overviewSignalMotion");
      const signalAction = document.getElementById("overviewSignalAction");
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
      const latestSyncedPoint = [...(model.points || [])].reverse().find((point) => point.synced);
      const averagePrice = latestSyncedPoint?.averageTransactionPrice;
      const metricRows = [
        ["成交均价", Number.isFinite(averagePrice) ? profitUiMoney(averagePrice) : "—"],
        ["销量", model.available ? `${num(model.metrics.itemsSold)} 件` : "—"],
        ["GMV", model.available ? profitUiMoney(model.metrics.gmv) : "—"],
        ["实际到手", model.available ? profitUiMoney(model.metrics.receivedAmount) : "—"],
        [model.metrics.profitLabel || "暂算利润", model.available ? profitUiMoney(model.metrics.finalProfit) : "—"]
      ];
      const metrics = document.getElementById("overviewLinkDecisionMetrics");
      if (metrics) {
        metrics.innerHTML = metricRows.map(([label, value], index) => (
          `<span class="${index === metricRows.length - 1 ? "featured" : ""}"><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></span>`
        )).join("");
      }
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
