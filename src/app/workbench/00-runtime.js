window.__workbenchMainReady = true;
    const clientPlatform = navigator.platform || "";
    const clientAgent = navigator.userAgent || "";
    const isMobileClient = /Android|iPhone|iPad|iPod|Mobile/i.test(clientAgent) || window.matchMedia("(max-width: 760px)").matches;
    const isWindowsClient = /^Win/i.test(clientPlatform) || /Windows/i.test(clientAgent);
    const isMacClient = !isMobileClient && (/^Mac/i.test(clientPlatform) || /Macintosh|Mac OS X/i.test(clientAgent));
    document.documentElement.classList.toggle("windows-performance", isWindowsClient);
    document.documentElement.classList.toggle("mac-client", isMacClient);
    document.documentElement.classList.toggle("mobile-client", isMobileClient);
    const storeKey = "tiktok_ops_workbench_v1";
    const currentAuthorKey = "tiktok_ops_current_author";
    const reportResumeKey = "tiktok_ops_report_resume_v1";
    const cloudEndpoint = "/api/state";
    const workbenchRelease = "__WORKBENCH_RELEASE__";
    function localDateValue(date = new Date()) {
      const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localTime.toISOString().slice(0, 10);
    }
    function localDateTimeValue(date = new Date()) {
      const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localTime.toISOString().slice(0, 16);
    }
    const today = localDateValue();
    const yesterday = localDateValue(new Date(Date.now() - 86400000));
    function isPastDue(value) {
      if (!value) return false;
      const text = String(value);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text < today;
      const timestamp = new Date(text).getTime();
      return Number.isFinite(timestamp) && timestamp < Date.now();
    }

    const defaultData = {
      entries: [],
      products: [],
      tasks: [],
      reports: [],
      reportAnalyses: [],
      customCreators: [],
      deletedCreators: [],
      blanketRemovedCreators: [],
      headRemovedCreators: [],
      creatorEdits: {},
      creatorHistory: [],
      costProfiles: [],
      profitStores: [],
      profitProducts: [],
      profitSkuMasters: [],
      profitListings: [],
      profitListingSkus: [],
      profitDailyFacts: [],
      profitDailyExpenses: [],
      profitDailySettlements: [],
      profitProductCostHistory: [],
      profitSyncRecords: [],
      profitPriceObservations: []
    };

    let state = loadState();
    let reportPage = 1;
    const reportPageSize = 10;
    let creatorPage = 1;
    const creatorPageSize = 10;
    let cloudReady = false;
    let cloudLoadPromise = null;
    let cloudSaveTimer = null;
    let cloudSaveInFlight = false;
    let cloudSaveQueued = false;
    let cloudSaveRetryCount = 0;
    let cloudBaseline = normalizeState({});
    let cloudRevision = 0;
    let cloudRefreshInFlight = false;
    let cloudRefreshTimer = null;
    let cloudRefreshFailureCount = 0;
    let cloudRenderDeferred = false;
    let releaseCheckTimer = null;
    let releaseReloadDeferred = false;
    let activeAiAnalysisContext = null;
    let lastReportReceipt = null;
    let activeReportEditUpdatedAt = "";
    let activeReportEditTaskSnapshot = new Map();
    let pendingCloudGuard = null;
    let pendingCreatorImportRows = [];
    let activeDataRangePreset = "today";
    let activeCustomDataDate = today;
    let activeReportDate = today;
    let activeOverviewAnalysisMode = "gmv";
    const expandedTaskIds = new Set();
    let activeTaskCenterView = "mine";
    const TASK_HISTORY_PAGE_SIZE = 20;
    let taskHistoryLimit = TASK_HISTORY_PAGE_SIZE;
    const expandedTaskAssigneeGroups = new Set();
    const taskCenterFilters = {
      teamSearch: "",
      teamStatus: "all",
      teamPriority: "all",
      teamOverdue: false,
      historySearch: "",
      historyStatus: "all"
    };
    let uiRevision = 1;
    const renderedViewRevisions = new Map();

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(storeKey));
        return normalizeState(saved || structuredClone(defaultData));
      } catch {
        return structuredClone(defaultData);
      }
    }

    function uniqueTasks(records) {
      const tasksById = new Map();
      (records || []).forEach((task, index) => {
        const normalizedTask = {
          ...task,
          syncVersion: Math.max(1, Number(task?.syncVersion || 0))
        };
        tasksById.set(String(normalizedTask.id || `legacy-task-${index}`), normalizedTask);
      });
      return [...tasksById.values()];
    }

    function normalizeState(data) {
      return {
        entries: Array.isArray(data?.entries) ? data.entries : [],
        products: Array.isArray(data?.products) ? data.products : [],
        tasks: uniqueTasks(Array.isArray(data?.tasks) ? data.tasks : []),
        reports: Array.isArray(data?.reports) ? data.reports : [],
        reportAnalyses: Array.isArray(data?.reportAnalyses) ? data.reportAnalyses : [],
        customCreators: Array.isArray(data?.customCreators) ? data.customCreators : [],
        deletedCreators: Array.isArray(data?.deletedCreators) ? data.deletedCreators : [],
        blanketRemovedCreators: Array.isArray(data?.blanketRemovedCreators) ? data.blanketRemovedCreators : [],
        headRemovedCreators: Array.isArray(data?.headRemovedCreators) ? data.headRemovedCreators : [],
        creatorEdits: data?.creatorEdits && typeof data.creatorEdits === "object" ? data.creatorEdits : {},
        creatorHistory: Array.isArray(data?.creatorHistory) ? data.creatorHistory : [],
        costProfiles: Array.isArray(data?.costProfiles) ? data.costProfiles : [],
        profitStores: Array.isArray(data?.profitStores) ? data.profitStores : [],
        profitProducts: Array.isArray(data?.profitProducts) ? data.profitProducts : [],
        profitSkuMasters: Array.isArray(data?.profitSkuMasters) ? data.profitSkuMasters : [],
        profitListings: Array.isArray(data?.profitListings) ? data.profitListings : [],
        profitListingSkus: Array.isArray(data?.profitListingSkus) ? data.profitListingSkus : [],
        profitDailyFacts: Array.isArray(data?.profitDailyFacts) ? data.profitDailyFacts : [],
        profitDailyExpenses: Array.isArray(data?.profitDailyExpenses) ? data.profitDailyExpenses : [],
        profitDailySettlements: Array.isArray(data?.profitDailySettlements) ? data.profitDailySettlements : [],
        profitProductCostHistory: Array.isArray(data?.profitProductCostHistory) ? data.profitProductCostHistory : [],
        profitSyncRecords: Array.isArray(data?.profitSyncRecords) ? data.profitSyncRecords : [],
        profitPriceObservations: Array.isArray(data?.profitPriceObservations) ? data.profitPriceObservations : []
      };
    }

    function saveState({ immediate = false } = {}) {
      uiRevision += 1;
      localStorage.setItem(storeKey, JSON.stringify(state));
      scheduleCloudSave(immediate ? 0 : 420);
    }

    function setSyncStatus(text, mode = "") {
      const el = document.getElementById("syncStatus");
      if (!el) return;
      const explicitText = text === "已同步"
        ? "团队云端已同步"
        : text === "保存中"
          ? "正在同步团队云端"
          : text === "连接云端"
            ? "正在连接团队云端"
            : text;
      el.textContent = explicitText;
      el.setAttribute("aria-label", explicitText);
      el.className = `sync-pill ${mode}`.trim();
      if (lastReportReceipt) {
        lastReportReceipt.cloudStatus = mode === "error"
          ? "云端同步失败，请重试"
          : mode === "saving" ? explicitText : text === "已同步" ? "云端已同步" : explicitText;
        renderReportSaveReceipt();
      }
    }

    function cloudAvailable() {
      return location.protocol !== "file:";
    }

    const cloudArrayKeys = {
      entries: "id",
      products: "id",
      tasks: "id",
      reports: "id",
      reportAnalyses: "key",
      customCreators: "id",
      deletedCreators: "id",
      blanketRemovedCreators: "id",
      headRemovedCreators: "id",
      creatorHistory: "id",
      costProfiles: "id",
      profitStores: "id",
      profitProducts: "id",
      profitSkuMasters: "id",
      profitListings: "id",
      profitListingSkus: "id",
      profitDailyFacts: "id",
      profitDailyExpenses: "id",
      profitDailySettlements: "id",
      profitProductCostHistory: "id",
      profitSyncRecords: "id",
      profitPriceObservations: "id"
    };

    function cloudRecordMap(records, keyField) {
      const map = new Map();
      (records || []).forEach((record, index) => {
        const key = String(record?.[keyField] || `legacy:${index}:${JSON.stringify(record)}`);
        map.set(key, record);
      });
      return map;
    }

    function buildCloudPatch(baseData, nextData) {
      const base = normalizeState(baseData);
      const next = normalizeState(nextData);
      const collections = {};

      Object.entries(cloudArrayKeys).forEach(([name, keyField]) => {
        const baseMap = cloudRecordMap(base[name], keyField);
        const nextMap = cloudRecordMap(next[name], keyField);
        const upserts = [];
        const deletes = [];

        nextMap.forEach((record, key) => {
          const previous = baseMap.get(key);
          if (!previous || JSON.stringify(previous) !== JSON.stringify(record)) upserts.push(record);
        });
        baseMap.forEach((_, key) => {
          if (!nextMap.has(key)) deletes.push(key);
        });
        collections[name] = { upserts, deletes };
      });

      const editUpserts = {};
      const editDeletes = [];
      Object.entries(next.creatorEdits).forEach(([key, value]) => {
        if (!Object.hasOwn(base.creatorEdits, key) || JSON.stringify(base.creatorEdits[key]) !== JSON.stringify(value)) {
          editUpserts[key] = value;
        }
      });
      Object.keys(base.creatorEdits).forEach((key) => {
        if (!Object.hasOwn(next.creatorEdits, key)) editDeletes.push(key);
      });

      return {
        collections,
        creatorEdits: { upserts: editUpserts, deletes: editDeletes }
      };
    }

    function taskStatusRank(status) {
      return ({ "待处理": 1, "处理中": 2, "待复盘": 3, "已完成": 4, "已作废": 4 })[String(status || "")] || 0;
    }

    function mergeTaskTransition(previous, incoming, syncVersion) {
      const next = { ...previous };
      [
        "status", "startedAt", "result", "evidence", "reviewAt", "resultSubmittedAt",
        "reviewResult", "reviewedAt", "completedAt", "voidCategory", "voidReason",
        "voidedAt", "voidedBy", "updatedAt", "updatedBy"
      ].forEach((key) => {
        if (Object.hasOwn(incoming, key)) next[key] = incoming[key];
      });
      next.syncVersion = syncVersion;
      return next;
    }

    function mergeCloudTask(previous, incoming) {
      if (!previous) return {
        ...incoming,
        syncVersion: Math.max(1, Number(incoming?.syncVersion || 0))
      };
      const previousStatus = String(previous?.status || "");
      const incomingStatus = String(incoming?.status || "");
      if (["已完成", "已作废"].includes(previousStatus) && incomingStatus !== previousStatus) return previous;
      const previousRank = taskStatusRank(previousStatus);
      const incomingRank = taskStatusRank(incomingStatus);
      if (previousRank && incomingRank && incomingRank < previousRank) return previous;
      const previousVersion = Number(previous?.syncVersion || 0);
      const incomingVersion = Number(incoming?.syncVersion || 0);
      if (incomingRank > previousRank) {
        const nextVersion = Math.max(previousVersion + 1, incomingVersion, 1);
        return incomingVersion > previousVersion
          ? { ...previous, ...incoming, syncVersion: nextVersion }
          : mergeTaskTransition(previous, incoming, nextVersion);
      }
      if (incomingVersion !== previousVersion) return incomingVersion > previousVersion
        ? { ...previous, ...incoming, syncVersion: Math.max(1, incomingVersion) }
        : previous;
      const previousTime = Date.parse(previous?.updatedAt || previous?.voidedAt || previous?.resultSubmittedAt || previous?.startedAt || "");
      const incomingTime = Date.parse(incoming?.updatedAt || incoming?.voidedAt || incoming?.resultSubmittedAt || incoming?.startedAt || "");
      if (Number.isFinite(previousTime) && !Number.isFinite(incomingTime)) return previous;
      if (Number.isFinite(previousTime) && Number.isFinite(incomingTime) && incomingTime < previousTime) return previous;
      return { ...previous, ...incoming, syncVersion: Math.max(previousVersion, incomingVersion, 1) };
    }

    function applyCloudPatch(baseData, patch) {
      const next = normalizeState(baseData);
      Object.entries(cloudArrayKeys).forEach(([name, keyField]) => {
        const operations = patch?.collections?.[name] || { upserts: [], deletes: [] };
        const deleted = new Set((operations.deletes || []).map(String));
        const records = cloudRecordMap(next[name], keyField);
        deleted.forEach((key) => records.delete(key));
        (operations.upserts || []).forEach((record, index) => {
          const key = String(record?.[keyField] || `incoming:${index}:${JSON.stringify(record)}`);
          if (deleted.has(key)) return;
          if (name === "tasks") {
            records.set(key, mergeCloudTask(records.get(key), record));
            return;
          }
          records.set(key, record);
        });
        next[name] = [...records.values()];
      });

      next.creatorEdits = { ...next.creatorEdits, ...(patch?.creatorEdits?.upserts || {}) };
      (patch?.creatorEdits?.deletes || []).forEach((key) => delete next.creatorEdits[key]);
      return next;
    }

    function cloudPatchIsEmpty(patch) {
      const collectionChanges = Object.values(patch.collections).some((operations) => {
        return operations.upserts.length || operations.deletes.length;
      });
      return !collectionChanges
        && !Object.keys(patch.creatorEdits.upserts).length
        && !patch.creatorEdits.deletes.length;
    }

    async function loadCloudState() {
      if (cloudLoadPromise) return cloudLoadPromise;
      cloudLoadPromise = loadCloudStateOnce();
      try {
        return await cloudLoadPromise;
      } finally {
        cloudLoadPromise = null;
      }
    }

    async function loadCloudStateOnce() {
      if (!cloudAvailable()) {
        setSyncStatus("本地模式", "local");
        return false;
      }
      const localStateAtLoadStart = normalizeState(structuredClone(state));
      setSyncStatus("连接云端", "saving");
      try {
        let payload = window.__workbenchInitialStatePromise
          ? await window.__workbenchInitialStatePromise
          : null;
        window.__workbenchInitialStatePromise = null;
        if (!payload?.data) {
          const response = await fetch(cloudEndpoint, { headers: { "accept": "application/json" } });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          payload = await response.json();
        }
        if (payload?.data) {
          const remoteState = normalizeState(payload.data);
          const changesMadeWhileLoading = buildCloudPatch(localStateAtLoadStart, normalizeState(state));
          state = applyCloudPatch(structuredClone(remoteState), changesMadeWhileLoading);
          if (typeof hydrateProfitWorkspaceFromState === "function") hydrateProfitWorkspaceFromState();
          uiRevision += 1;
          cloudBaseline = normalizeState(structuredClone(remoteState));
          cloudRevision = Number(payload.revision || 0);
          localStorage.setItem(storeKey, JSON.stringify(state));
          hydrateCostProfilesFromTeam();
          setSyncStatus(cloudPatchIsEmpty(changesMadeWhileLoading) ? "已同步" : "正在同步新内容", cloudPatchIsEmpty(changesMadeWhileLoading) ? "" : "saving");
          return true;
        }
        cloudBaseline = normalizeState({});
        setSyncStatus("云端待初始化", "saving");
        return false;
      } catch (error) {
        console.warn("Cloud sync unavailable", error);
        const isLocalPreview = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
        setSyncStatus(isLocalPreview ? "本地预览" : "本地备份", isLocalPreview ? "local" : "error");
        return false;
      }
    }

    async function saveCloudState() {
      if (!cloudReady || !cloudAvailable()) return;
      if (cloudRefreshInFlight) {
        cloudSaveQueued = true;
        return;
      }
      if (cloudSaveInFlight) {
        cloudSaveQueued = true;
        return;
      }

      const snapshot = normalizeState(structuredClone(state));
      const patch = buildCloudPatch(cloudBaseline, snapshot);
      if (cloudPatchIsEmpty(patch)) {
        return;
      }

      cloudSaveInFlight = true;
      cloudSaveQueued = false;
      const cloudGuard = pendingCloudGuard;
      let saved = false;
      setSyncStatus("保存中", "saving");
      try {
        let response;
        let payload;
        for (let attempt = 0; attempt < 4; attempt += 1) {
          response = await fetch(cloudEndpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ version: "v2", patch, guard: cloudGuard })
          });
          payload = await response.json();
          if (response.ok) break;
          if (response.status !== 409 || payload?.retryable === false || attempt === 3) {
            const saveError = new Error(payload.error || `HTTP ${response.status}`);
            saveError.retryable = payload?.retryable !== false;
            saveError.remoteState = payload?.data || null;
            throw saveError;
          }
          setSyncStatus(`同步冲突，重试 ${attempt + 1}/3`, "saving");
          await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
        }

        const remoteState = normalizeState(payload.data);
        const pendingPatch = buildCloudPatch(snapshot, normalizeState(state));
        state = applyCloudPatch(structuredClone(remoteState), pendingPatch);
        if (typeof hydrateProfitWorkspaceFromState === "function") hydrateProfitWorkspaceFromState();
        uiRevision += 1;
        cloudBaseline = normalizeState(structuredClone(remoteState));
        cloudRevision = Number(payload.revision || cloudRevision);
        if (lastReportReceipt?.taskIds?.length) {
          const currentTaskIds = new Set((state.tasks || []).map((task) => task.id));
          const missingReceiptTasks = lastReportReceipt.taskIds.filter((id) => !currentTaskIds.has(id));
          if (missingReceiptTasks.length) {
            const snapshotTasks = new Map((snapshot.tasks || []).map((task) => [task.id, task]));
            missingReceiptTasks.forEach((id) => {
              const task = snapshotTasks.get(id);
              if (task) state.tasks.push(task);
            });
            cloudSaveQueued = true;
            setSyncStatus(`补同步 ${missingReceiptTasks.length} 条任务`, "saving");
          }
        }
        localStorage.setItem(storeKey, JSON.stringify(state));
        hydrateCostProfilesFromTeam();
        saved = true;
        cloudSaveRetryCount = 0;
        if (pendingCloudGuard === cloudGuard) pendingCloudGuard = null;
        if (!cloudSaveQueued) setSyncStatus("已同步", "");
        render();
      } catch (error) {
        console.warn("Cloud save failed", error);
        if (error.remoteState) {
          const remoteState = normalizeState(error.remoteState);
          const changesMadeWhileSaving = buildCloudPatch(snapshot, normalizeState(state));
          state = applyCloudPatch(structuredClone(remoteState), changesMadeWhileSaving);
          if (typeof hydrateProfitWorkspaceFromState === "function") hydrateProfitWorkspaceFromState();
          uiRevision += 1;
          cloudBaseline = normalizeState(structuredClone(remoteState));
          localStorage.setItem(storeKey, JSON.stringify(state));
          pendingCloudGuard = null;
          cloudSaveQueued = !cloudPatchIsEmpty(changesMadeWhileSaving);
          cloudSaveRetryCount = 0;
          setSyncStatus(
            cloudSaveQueued ? "云端状态已变化，正在保留并同步刚才的操作" : (error.message || "云端状态已变化，请刷新后重试"),
            cloudSaveQueued ? "saving" : "error"
          );
          render();
          return;
        }
        cloudSaveRetryCount += 1;
        cloudSaveQueued = error.retryable !== false && cloudSaveRetryCount <= 3;
        setSyncStatus(
          cloudSaveQueued ? `同步重试中 ${cloudSaveRetryCount}/3` : "同步失败，请再次保存",
          cloudSaveQueued ? "saving" : "error"
        );
      } finally {
        cloudSaveInFlight = false;
        const needsAnotherSave = cloudSaveQueued
          || (saved && JSON.stringify(normalizeState(state)) !== JSON.stringify(cloudBaseline));
        cloudSaveQueued = false;
        if (needsAnotherSave) {
          clearTimeout(cloudSaveTimer);
          cloudSaveTimer = setTimeout(saveCloudState, saved ? 80 : 500 * cloudSaveRetryCount);
        }
      }
    }

    function scheduleCloudSave(delay = 420) {
      if (!cloudReady || !cloudAvailable()) return;
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer = setTimeout(saveCloudState, delay);
    }

    function cloudUiBusy() {
      if (document.querySelector(".modal-backdrop:not([hidden])")) return true;
      return [...document.querySelectorAll('form[data-cloud-dirty="true"]')]
        .some((form) => form.getClientRects().length > 0);
    }

    function renderReceivedCloudState() {
      hydrateCostProfilesFromTeam();
      if (document.body.classList.contains("cover-active")) renderEntranceSnapshot();
      else render();
      cloudRenderDeferred = false;
    }

    function applyDeferredCloudUi() {
      if (cloudUiBusy()) return;
      if (releaseReloadDeferred) {
        location.reload();
        return;
      }
      if (cloudRenderDeferred) {
        renderReceivedCloudState();
        setSyncStatus("已同步", "");
      }
    }

    async function refreshCloudState({ force = false } = {}) {
      if (!cloudAvailable() || cloudRefreshInFlight || cloudSaveInFlight) return false;
      cloudRefreshInFlight = true;
      const stateAtRefreshStart = normalizeState(structuredClone(state));
      const pendingAtRefreshStart = buildCloudPatch(cloudBaseline, stateAtRefreshStart);
      try {
        if (!cloudReady) {
          cloudReady = Boolean(await loadCloudState());
          if (cloudReady) {
            renderReceivedCloudState();
            cloudRefreshFailureCount = 0;
          }
          return cloudReady;
        }

        if (!force) {
          const metaResponse = await fetch(`${cloudEndpoint}?meta=1&t=${Date.now()}`, {
            cache: "no-store",
            headers: { "accept": "application/json" }
          });
          if (!metaResponse.ok) throw new Error(`HTTP ${metaResponse.status}`);
          const meta = await metaResponse.json();
          if (Number(meta.revision || 0) <= cloudRevision) {
            cloudRefreshFailureCount = 0;
            return false;
          }
        }

        const response = await fetch(`${cloudEndpoint}?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "accept": "application/json" }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        if (!payload?.data || Number(payload.revision || 0) <= cloudRevision) return false;

        const remoteState = normalizeState(payload.data);
        const changesMadeWhileRefreshing = buildCloudPatch(stateAtRefreshStart, normalizeState(state));
        state = applyCloudPatch(
          applyCloudPatch(structuredClone(remoteState), pendingAtRefreshStart),
          changesMadeWhileRefreshing
        );
        if (typeof hydrateProfitWorkspaceFromState === "function") hydrateProfitWorkspaceFromState();
        uiRevision += 1;
        cloudBaseline = normalizeState(structuredClone(remoteState));
        cloudRevision = Number(payload.revision || cloudRevision);
        localStorage.setItem(storeKey, JSON.stringify(state));
        cloudRefreshFailureCount = 0;

        if (cloudUiBusy()) {
          cloudRenderDeferred = true;
          setSyncStatus("已接收更新，填写完成后显示", "saving");
        } else {
          renderReceivedCloudState();
          setSyncStatus("已同步", "");
        }
        const mergedPendingPatch = buildCloudPatch(cloudBaseline, normalizeState(state));
        if (!cloudPatchIsEmpty(mergedPendingPatch)) scheduleCloudSave();
        return true;
      } catch (error) {
        cloudRefreshFailureCount += 1;
        console.warn("Cloud refresh failed", error);
        if (cloudRefreshFailureCount >= 3) {
          setSyncStatus("云端连接不稳定，正在重试", "error");
        }
        return false;
      } finally {
        cloudRefreshInFlight = false;
        if (cloudSaveQueued) {
          cloudSaveQueued = false;
          clearTimeout(cloudSaveTimer);
          cloudSaveTimer = setTimeout(saveCloudState, 80);
        }
      }
    }

    function scheduleCloudRefresh(delay = 20000) {
      clearTimeout(cloudRefreshTimer);
      if (!cloudAvailable()) return;
      cloudRefreshTimer = setTimeout(async () => {
        if (!document.hidden) await refreshCloudState();
        scheduleCloudRefresh();
      }, delay);
    }

    async function checkWorkbenchRelease() {
      if (!cloudAvailable() || workbenchRelease.includes("__WORKBENCH_")) return;
      try {
        const response = await fetch(`/release.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json();
        if (!payload?.release || payload.release === workbenchRelease) return;
        if (cloudUiBusy()) {
          releaseReloadDeferred = true;
          setSyncStatus("工作台有新版本，填写完成后刷新", "saving");
        } else {
          location.reload();
        }
      } catch (error) {
        console.warn("Release check failed", error);
      }
    }

    function scheduleReleaseCheck(delay = 45000) {
      clearTimeout(releaseCheckTimer);
      if (!cloudAvailable()) return;
      releaseCheckTimer = setTimeout(async () => {
        if (!document.hidden) await checkWorkbenchRelease();
        scheduleReleaseCheck();
      }, delay);
    }
