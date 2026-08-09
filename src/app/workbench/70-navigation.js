    const creatorNavMenu = document.getElementById("creatorNavMenu");
    const creatorNavTrigger = document.getElementById("creatorNavTrigger");
    const creatorPageTitles = {
      blanket: "毛毯项目跟进",
      head: "头部达人跟进",
      all: "达人库"
    };

    function setCreatorPage(pageName = "blanket") {
      document.getElementById("creators").dataset.creatorPage = pageName;
      document.querySelectorAll("[data-creator-section]").forEach((section) => {
        section.hidden = section.dataset.creatorSection !== pageName;
      });
      document.querySelectorAll("[data-creator-page]").forEach((item) => {
        item.classList.toggle("active", item.dataset.creatorPage === pageName);
      });
      const title = document.getElementById("creatorPageTitle");
      if (title) title.textContent = creatorPageTitles[pageName] || creatorPageTitles.blanket;
    }

    creatorNavTrigger?.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !creatorNavMenu.classList.contains("open");
      creatorNavMenu.classList.toggle("open", willOpen);
      creatorNavTrigger.setAttribute("aria-expanded", String(willOpen));
      if (!document.getElementById("creators").dataset.creatorPage) setCreatorPage("blanket");
    });

    document.querySelectorAll("[data-creator-page]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        setView("creators");
        setCreatorPage(button.dataset.creatorPage);
        creatorNavMenu?.classList.remove("open");
        creatorNavTrigger?.setAttribute("aria-expanded", "false");
        window.setTimeout(() => document.getElementById("creators")?.scrollIntoView({ behavior: "auto", block: "start" }), 0);
      });
    });

    document.addEventListener("click", (event) => {
      if (creatorNavMenu?.contains(event.target)) return;
      creatorNavMenu?.classList.remove("open");
      creatorNavTrigger?.setAttribute("aria-expanded", "false");
    });

    document.querySelectorAll("[data-jump]").forEach((btn) => {
      btn.addEventListener("click", () => setView(btn.dataset.jump));
    });

    document.getElementById("overviewProfitAction")?.addEventListener("click", (event) => {
      const target = overviewProfitNavigationTarget(
        event.currentTarget.dataset.listingId,
        (listingId) => profitWorkspaceState.repository.getListing(listingId)
      );
      if (!target) return;
      profitWorkspaceState.view = "listing";
      profitWorkspaceState.activeListingId = target.listingId;
      profitWorkspaceState.activeProductId = target.productId;
      setView("costing");
      renderProfitTemplate();
      document.getElementById("profitTemplateRoot")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function setAcademyTarget(targetId) {
      document.querySelectorAll(".academy-link").forEach((item) => {
        item.classList.toggle("active", item.dataset.academyTarget === targetId);
      });
      document.querySelectorAll(".academy-home, .academy-content > .lesson-card").forEach((section) => {
        section.classList.toggle("active", section.id === targetId);
      });
      const academyShell = document.querySelector(".academy-shell");
      if (academyShell) {
        academyShell.classList.toggle("lesson-open", targetId !== "academy-home");
      }
      document.getElementById("sop").scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.addEventListener("click", (event) => {
      const academyTrigger = event.target.closest("[data-academy-target]");
      if (!academyTrigger) return;
      event.preventDefault();
      setAcademyTarget(academyTrigger.dataset.academyTarget);
    });

    document.getElementById("dailyForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveEntry(event.currentTarget);
    });

    document.getElementById("productForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveProduct(event.currentTarget);
    });

    document.getElementById("taskForm").addEventListener("submit", (event) => {
      event.preventDefault();
      saveTask(event.currentTarget);
    });

    document.addEventListener("click", (event) => {
      const rangeButton = event.target.closest?.("[data-range-preset]");
      if (!rangeButton) return;
      setDataRange(rangeButton.dataset.rangePreset);
    });

    document.addEventListener("change", (event) => {
      const rangeInput = event.target.closest?.("[data-range-date]");
      if (!rangeInput || !/^\d{4}-\d{2}-\d{2}$/.test(rangeInput.value)) return;
      setDataRange("custom", rangeInput.value > today ? today : rangeInput.value);
    });

    document.addEventListener("change", (event) => {
      const reportDateInput = event.target.closest?.("[data-report-date]");
      if (!reportDateInput || !/^\d{4}-\d{2}-\d{2}$/.test(reportDateInput.value)) return;
      activeReportDate = reportDateInput.value > today ? today : reportDateInput.value;
      reportPage = 1;
      render();
    });

    document.addEventListener("change", (event) => {
      const timePreset = event.target.closest?.("[data-time-preset]");
      if (timePreset) applyTimePreset(timePreset);
    });

    document.getElementById("reportForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveReport(event.currentTarget);
    });

    document.getElementById("reportRole").addEventListener("change", () => {
      const role = document.getElementById("reportRole").value;
      setReportFormExpanded(Boolean(role));
      updateReportHelp();
    });
    document.querySelector("#reportForm [name='date']").addEventListener("change", () => {
      renderPendingReviewQueue();
      renderReportWorkGuide();
    });
    document.querySelector("#reportForm [name='author']").addEventListener("input", () => {
      renderPendingReviewQueue();
      renderReportWorkGuide();
    });
    document.querySelector("#reportForm [name='author']").addEventListener("change", renderReports);
    document.getElementById("reportClosureFields").addEventListener("change", (event) => {
      if (event.target.matches('[data-closure-row="task"] [data-part="due"]')) syncTaskReviewTime(event.target);
    });
    document.getElementById("reportForm").addEventListener("input", renderReportWorkGuide);
    document.getElementById("reportForm").addEventListener("change", renderReportWorkGuide);

    document.getElementById("resetReportForm").addEventListener("click", () => {
      const form = document.getElementById("reportForm");
      const preservedDate = form.elements.date.value || today;
      const preservedRole = form.elements.role.value || "";
      const preservedAuthor = currentReportAuthor();
      form.reset();
      document.getElementById("reportExtraWork")?.removeAttribute("open");
      delete form.dataset.editingReportId;
      activeReportEditUpdatedAt = "";
      activeReportEditTaskSnapshot = new Map();
      lastReportReceipt = null;
      clearReportResumePointer();
      renderReportSaveReceipt();
      form.elements.date.value = preservedDate;
      form.elements.role.value = preservedRole;
      form.elements.author.value = preservedAuthor;
      setReportFormExpanded(Boolean(preservedRole));
      updateReportHelp();
    });

    document.getElementById("copyDailyDigest").addEventListener("click", async () => {
      const text = document.getElementById("dailyDigest").textContent;
      try {
        await navigator.clipboard.writeText(text);
        showToast("团队日报摘要已复制");
      } catch {
        showToast("复制失败，请手动选择摘要");
      }
    });

    document.getElementById("weeklyAnchor").addEventListener("change", renderWeeklyReport);
    document.getElementById("weeklyRole").addEventListener("change", renderWeeklyReport);
    document.getElementById("runAiAnalysis").addEventListener("click", () => runAiAnalysis({ force: true }));

    document.getElementById("copyWeeklyDigest").addEventListener("click", async () => {
      const text = document.getElementById("weeklyDigest").textContent;
      try {
        await navigator.clipboard.writeText(text);
        showToast("岗位周报已复制");
      } catch {
        showToast("复制失败，请手动选择周报");
      }
    });

    document.getElementById("creatorForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveCreator(event.currentTarget);
      closeCreatorEntryDialog();
    });

    document.getElementById("importCreatorExcel").addEventListener("click", () => {
      document.getElementById("creatorExcelFile").click();
    });
    document.getElementById("creatorExcelFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (file) await previewCreatorImport(file);
    });
    document.getElementById("closeCreatorImportModal").addEventListener("click", closeCreatorImportPreview);
    document.getElementById("cancelCreatorImport").addEventListener("click", closeCreatorImportPreview);
    document.getElementById("confirmCreatorImport").addEventListener("click", confirmCreatorImport);
    document.getElementById("creatorImportModal").addEventListener("click", (event) => {
      if (event.target.id === "creatorImportModal") closeCreatorImportPreview();
    });

    document.getElementById("resetForm").addEventListener("click", () => {
      document.getElementById("dailyForm").reset();
      document.querySelector("#dailyForm [name='date']").value = today;
    });

    document.getElementById("exportJson").addEventListener("click", exportJsonData);
    document.getElementById("exportCsv").addEventListener("click", exportCsvData);
    document.getElementById("importJson").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });
    document.getElementById("importFile").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (file) importJsonData(file);
      event.target.value = "";
    });

    document.getElementById("createTasksFromAnomalies")?.addEventListener("click", createTasksFromAnomalies);

    document.getElementById("creatorSearch").addEventListener("input", () => {
      creatorPage = 1;
      renderCreatorCenter();
    });
    ["creatorLevelFilter", "creatorCategoryFilter"].forEach((id) => document.getElementById(id)?.addEventListener("change", () => {
      creatorPage = 1;
      renderCreatorCenter();
    }));
    ["headLevelFilter", "headCategoryFilter"].forEach((id) => document.getElementById(id)?.addEventListener("change", renderCreatorCenter));
