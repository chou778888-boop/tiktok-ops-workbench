    let blanketCreatorFilter = "all";

    function filterBlanketCreatorPreview() {
      const query = String(document.getElementById("blanketCreatorSearch")?.value || "").trim().toLowerCase();
      const selectedLevel = String(document.getElementById("blanketLevelFilter")?.value || "").toLowerCase();
      const selectedCategory = String(document.getElementById("blanketCategoryFilter")?.value || "").toLowerCase();
      document.querySelectorAll(".blanket-record").forEach((card) => {
        const tags = String(card.dataset.blanketTags || "").toLowerCase();
        const matchesFilter = blanketCreatorFilter === "all"
          || (blanketCreatorFilter === "risk" ? card.dataset.blanketRisk === "true" : card.dataset.blanketFilterKey === blanketCreatorFilter);
        card.hidden = !matchesFilter || (query && !tags.includes(query))
          || (selectedLevel && !tags.includes(selectedLevel))
          || (selectedCategory && !tags.includes(selectedCategory));
      });
    }

    document.getElementById("blanketCreatorSearch")?.addEventListener("input", filterBlanketCreatorPreview);
    ["blanketLevelFilter", "blanketCategoryFilter"].forEach((id) => document.getElementById(id)?.addEventListener("change", filterBlanketCreatorPreview));

    overviewAnalysisLayoutMedia.addEventListener("change", () => {
      if (document.getElementById("overview")?.classList.contains("active")) {
        renderOverviewAnalysisMode(true);
      }
    });

    const overviewAnalysisShell = document.querySelector("[data-overview-analysis-shell]");
    if (overviewAnalysisShell && typeof ResizeObserver !== "undefined") {
      const initialOverviewAnalysisRect = overviewAnalysisShell.getBoundingClientRect();
      let overviewAnalysisObservedSize = {
        width: Math.round(initialOverviewAnalysisRect.width),
        height: Math.round(initialOverviewAnalysisRect.height)
      };
      let overviewAnalysisResizeFrame = null;
      const overviewAnalysisResizeObserver = new ResizeObserver((entries) => {
        const entry = entries.find((item) => item.target === overviewAnalysisShell);
        if (!entry) return;
        const decision = overviewAnalysisResizeDecision(
          overviewAnalysisObservedSize,
          entry.contentRect,
          document.getElementById("overview")?.classList.contains("active")
        );
        overviewAnalysisObservedSize = { width: decision.width, height: decision.height };
        if (!decision.redraw || overviewAnalysisResizeFrame !== null) return;
        overviewAnalysisResizeFrame = window.requestAnimationFrame(() => {
          overviewAnalysisResizeFrame = null;
          if (document.getElementById("overview")?.classList.contains("active")) {
            renderOverviewAnalysisMode(true);
          }
        });
      });
      overviewAnalysisResizeObserver.observe(overviewAnalysisShell);
    }

    document.querySelectorAll("[data-blanket-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        blanketCreatorFilter = button.dataset.blanketFilter || "all";
        document.querySelectorAll("[data-blanket-filter]").forEach((item) => item.classList.toggle("active", item === button));
        document.querySelectorAll("[data-blanket-summary-filter]").forEach((item) => item.classList.toggle("active", item.dataset.blanketSummaryFilter === blanketCreatorFilter));
        filterBlanketCreatorPreview();
      });
    });

    document.addEventListener("change", (event) => {
      const statusSelect = event.target.closest("[data-blanket-status]");
      if (!statusSelect) return;
      const record = findCreator(statusSelect.dataset.blanketStatus);
      if (!record) return;
      state.creatorEdits ||= {};
      const previous = state.creatorEdits[record.id] || {};
      state.creatorEdits[record.id] = {
        ...previous,
        followStatus: statusSelect.value,
        owner: previous.owner || record.owner || "",
        followNote: previous.followNote || ""
      };
      appendCreatorHistory(record, {
        ...state.creatorEdits[record.id],
        relationship: record.relationship || record.note || ""
      }, "调整跟进状态");
      saveState();
      renderCreatorCenter();
      filterBlanketCreatorPreview();
      showToast("跟进状态已更新");
    });

    document.querySelectorAll("[data-creator-jump]").forEach((button) => {
      button.addEventListener("click", () => {
        document.getElementById(button.dataset.creatorJump)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    function openCreatorEntryDialog() {
      const dialog = document.getElementById("creatorEntryDialog");
      const backdrop = document.getElementById("creatorEntryBackdrop");
      dialog.hidden = false;
      dialog.classList.add("open");
      backdrop.classList.add("open");
      const form = document.getElementById("creatorForm");
      window.setTimeout(() => form?.querySelector("[name='name']")?.focus(), 80);
    }

    function closeCreatorEntryDialog() {
      const dialog = document.getElementById("creatorEntryDialog");
      dialog.classList.remove("open");
      dialog.hidden = true;
      document.getElementById("creatorEntryBackdrop")?.classList.remove("open");
    }

    document.querySelectorAll("[data-open-creator-form]").forEach((button) => {
      button.addEventListener("click", openCreatorEntryDialog);
    });
    document.getElementById("closeCreatorEntry")?.addEventListener("click", closeCreatorEntryDialog);
    document.getElementById("creatorEntryBackdrop")?.addEventListener("click", closeCreatorEntryDialog);

    document.getElementById("creatorPrevPage").addEventListener("click", () => {
      creatorPage = Math.max(1, creatorPage - 1);
      renderCreatorCenter();
    });

    document.getElementById("creatorNextPage").addEventListener("click", () => {
      creatorPage += 1;
      renderCreatorCenter();
    });

    document.getElementById("reportPrevPage").addEventListener("click", () => {
      reportPage = Math.max(1, reportPage - 1);
      renderReports();
      document.getElementById("reportCards").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("reportNextPage").addEventListener("click", () => {
      reportPage += 1;
      renderReports();
      document.getElementById("reportCards").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    document.getElementById("creatorAvatarFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      const dataUrl = file ? await readImageAsDataUrl(file) : "";
      setAvatarPreview("creatorAvatarPreview", dataUrl, document.querySelector("#creatorForm [name='name']").value || "");
    });

    document.getElementById("creatorEditAvatarFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      const form = document.getElementById("creatorEditForm");
      const dataUrl = file ? await readImageAsDataUrl(file) : form.elements.avatar.value;
      form.elements.avatar.value = dataUrl || "";
      setAvatarPreview("creatorEditAvatarPreview", dataUrl || "", form.elements.name.value || "");
    });

    document.getElementById("closeCreatorModal").addEventListener("click", closeCreatorEditor);

    document.getElementById("creatorModal").addEventListener("click", (event) => {
      if (event.target.id === "creatorModal") closeCreatorEditor();
    });

    document.getElementById("closeCreatorHistoryModal").addEventListener("click", closeCreatorHistory);

    document.getElementById("creatorHistoryModal").addEventListener("click", (event) => {
      if (event.target.id === "creatorHistoryModal") closeCreatorHistory();
    });

    document.getElementById("closeCreatorSampleModal").addEventListener("click", closeCreatorSampleDetail);

    document.getElementById("creatorSampleModal").addEventListener("click", (event) => {
      if (event.target.id === "creatorSampleModal") closeCreatorSampleDetail();
    });

    document.getElementById("creatorEditForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveCreatorEdit(event.currentTarget);
    });

    document.getElementById("closeTaskResultModal").addEventListener("click", closeTaskResultEditor);
    document.getElementById("taskResultModal").addEventListener("click", (event) => {
      if (event.target.id === "taskResultModal") closeTaskResultEditor();
    });
    document.getElementById("taskResultForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveTaskResult(event.currentTarget);
    });
    document.getElementById("closeTaskVoidModal").addEventListener("click", closeTaskVoidEditor);
    document.getElementById("cancelTaskVoid").addEventListener("click", closeTaskVoidEditor);
    document.getElementById("taskVoidModal").addEventListener("click", (event) => {
      if (event.target.id === "taskVoidModal") closeTaskVoidEditor();
    });
    document.getElementById("taskVoidForm").addEventListener("submit", (event) => {
      event.preventDefault();
      voidTask(event.currentTarget);
    });

    document.getElementById("deleteCustomCreator").addEventListener("click", deleteCustomCreator);

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!document.getElementById("creatorImportModal").hidden) {
        closeCreatorImportPreview();
        return;
      }
      if (!document.getElementById("creatorSampleModal").hidden) {
        closeCreatorSampleDetail();
        return;
      }
      if (!document.getElementById("creatorHistoryModal").hidden) {
        closeCreatorHistory();
        return;
      }
      if (!document.getElementById("creatorModal").hidden) {
        closeCreatorEditor();
        return;
      }
      if (!document.getElementById("taskVoidModal").hidden) {
        closeTaskVoidEditor();
        return;
      }
      if (!document.getElementById("taskResultModal").hidden) closeTaskResultEditor();
    });

    document.addEventListener("click", (event) => {
      const overviewAnalysisBtn = event.target.closest("[data-overview-analysis-mode]");
      const overviewRiskBtn = event.target.closest("#overviewRiskAction");
      const taskViewBtn = event.target.closest("[data-task-view]");
      const taskGroupBtn = event.target.closest("[data-task-group-toggle]");
      const taskHistoryMoreBtn = event.target.closest("[data-task-history-more]");
      const goReportAuthorBtn = event.target.closest("[data-go-report-author]");
      const addRowBtn = event.target.closest("[data-add-row]");
      const removeRowBtn = event.target.closest("[data-remove-row]");
      const bringReviewBtn = event.target.closest("[data-bring-review]");
      const aiTaskBtn = event.target.closest("[data-ai-task]");
      const viewTaskBtn = event.target.closest("[data-view-task]");
      const editReportBtn = event.target.closest("[data-edit-report]");
      const detailTaskBtn = event.target.closest("[data-task-details]");
      const startTaskBtn = event.target.closest("[data-task-start]");
      const resultTaskBtn = event.target.closest("[data-task-result]");
      const voidBtn = event.target.closest("[data-task-void]");
      const sampleDetailBtn = event.target.closest("[data-sample-detail]");
      const historyBtn = event.target.closest("[data-creator-history]");
      const editCreatorBtn = event.target.closest("[data-edit-creator]");
      const removeCreatorBtn = event.target.closest("[data-remove-creator]");
      const editableRow = event.target.closest("[data-row-edit]");
      const blanketSummaryBtn = event.target.closest("[data-blanket-summary-filter]");
      if (overviewAnalysisBtn) {
        setOverviewAnalysisMode(overviewAnalysisBtn.dataset.overviewAnalysisMode);
        return;
      }
      if (overviewRiskBtn) {
        document.querySelector("#overview .overview-risk-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (taskViewBtn) {
        activeTaskCenterView = taskViewBtn.dataset.taskView || "mine";
        if (activeTaskCenterView === "history") taskHistoryLimit = TASK_HISTORY_PAGE_SIZE;
        renderTasks();
        return;
      }
      if (taskGroupBtn) {
        const key = taskGroupBtn.dataset.taskGroupToggle;
        if (expandedTaskAssigneeGroups.has(key)) expandedTaskAssigneeGroups.delete(key);
        else expandedTaskAssigneeGroups.add(key);
        renderTasks();
        return;
      }
      if (taskHistoryMoreBtn) {
        taskHistoryLimit += TASK_HISTORY_PAGE_SIZE;
        renderTasks();
        return;
      }
      if (goReportAuthorBtn) {
        switchView("reports");
        document.querySelector("#reportForm [name='author']")?.focus();
        return;
      }
      if (blanketSummaryBtn) {
        blanketCreatorFilter = blanketSummaryBtn.dataset.blanketSummaryFilter || "all";
        document.querySelectorAll("[data-blanket-summary-filter]").forEach((item) => item.classList.toggle("active", item === blanketSummaryBtn));
        document.querySelectorAll("[data-blanket-filter]").forEach((item) => item.classList.toggle("active", item.dataset.blanketFilter === blanketCreatorFilter));
        filterBlanketCreatorPreview();
        document.getElementById("blanketCreatorCards")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (sampleDetailBtn) {
        openCreatorSampleDetail(sampleDetailBtn.dataset.sampleDetail);
        return;
      }
      if (addRowBtn) {
        addRepeatedRow(addRowBtn.dataset.addRow, addRowBtn.closest("[data-repeat-section]"));
        return;
      }
      if (removeRowBtn) {
        removeRepeatedRow(removeRowBtn.dataset.removeRow, removeRowBtn.closest("[data-repeat-section]"));
        return;
      }
      if (bringReviewBtn) {
        bringTaskIntoReview(bringReviewBtn.dataset.bringReview);
        return;
      }
      if (aiTaskBtn) {
        createTaskFromAiDiagnosis(aiTaskBtn.dataset.aiTask);
        return;
      }
      if (viewTaskBtn) {
        focusTaskFromReport(viewTaskBtn.dataset.viewTask);
        return;
      }
      if (editReportBtn) {
        editTodayReport(editReportBtn.dataset.editReport);
        return;
      }
      if (detailTaskBtn) {
        toggleTaskDetails(detailTaskBtn.dataset.taskDetails);
        return;
      }
      if (historyBtn) {
        openCreatorHistory(historyBtn.dataset.creatorHistory);
        return;
      }
      if (editCreatorBtn) {
        openCreatorEditor(editCreatorBtn.dataset.editCreator);
        return;
      }
      if (removeCreatorBtn) {
        removeCreatorFromSection(removeCreatorBtn.dataset.removeCreator, removeCreatorBtn.dataset.removeContext || "blanket");
        return;
      }
      if (editableRow && !event.target.closest("button, select, input, textarea, [data-creator-history]")) {
        openCreatorEditor(editableRow.dataset.rowEdit);
        return;
      }
      if (startTaskBtn) {
        startTask(startTaskBtn.dataset.taskStart);
        return;
      }
      if (resultTaskBtn) {
        openTaskResultEditor(resultTaskBtn.dataset.taskResult);
        return;
      }
      if (voidBtn) {
        openTaskVoidEditor(voidBtn.dataset.taskVoid);
        return;
      }
    });

    document.addEventListener("change", (event) => {
      const search = event.target.closest("[data-task-search]");
      const filter = event.target.closest("[data-task-filter]");
      if (search) {
        taskCenterFilters[search.dataset.taskSearch === "history" ? "historySearch" : "teamSearch"] = search.value;
        taskHistoryLimit = TASK_HISTORY_PAGE_SIZE;
        renderTasks();
        return;
      }
      if (!filter) return;
      const key = filter.dataset.taskFilter;
      taskCenterFilters[key] = filter.type === "checkbox" ? filter.checked : filter.value;
      taskHistoryLimit = TASK_HISTORY_PAGE_SIZE;
      renderTasks();
    });
