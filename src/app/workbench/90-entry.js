    function initializeWorkbench() {
      renderEntranceSnapshot();
      if (!document.body.classList.contains("cover-active")) render();
      loadCloudState().then((loaded) => {
        cloudReady = Boolean(loaded);
        restoreReportFormForToday();
        if (document.body.classList.contains("cover-active")) renderEntranceSnapshot();
        else render();
        if (cloudReady) saveCloudState();
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.__workbenchMarkReady?.()));
      });
      scheduleCloudRefresh();
      scheduleReleaseCheck();
    }

    function markCloudFormDirty(event) {
      const form = event.target?.closest?.("form");
      if (form && form.id !== "entryLoginForm") form.dataset.cloudDirty = "true";
    }

    document.addEventListener("input", markCloudFormDirty, true);
    document.addEventListener("change", markCloudFormDirty, true);
    document.addEventListener("submit", () => {
      window.setTimeout(applyDeferredCloudUi, 0);
    }, true);
    document.addEventListener("reset", (event) => {
      if (event.target?.matches?.("form")) delete event.target.dataset.cloudDirty;
      window.setTimeout(applyDeferredCloudUi, 0);
    }, true);
    document.addEventListener("click", () => window.setTimeout(applyDeferredCloudUi, 0), true);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) return;
      refreshCloudState();
      checkWorkbenchRelease();
      applyDeferredCloudUi();
    });
    window.addEventListener("focus", () => {
      refreshCloudState();
      checkWorkbenchRelease();
      applyDeferredCloudUi();
    });

    document.getElementById("toggleEntryPassword")?.addEventListener("click", () => {
      const password = document.getElementById("entryPassword");
      const toggle = document.getElementById("toggleEntryPassword");
      if (!password || !toggle) return;
      const shouldShow = password.type === "password";
      password.type = shouldShow ? "text" : "password";
      toggle.textContent = shouldShow ? "隐藏" : "显示";
      toggle.setAttribute("aria-label", shouldShow ? "隐藏密码" : "显示密码");
      password.focus();
    });
    document.querySelector("#dailyForm [name='date']").value = today;
    document.querySelector("#productForm [name='date']").value = today;
    const reportDateInput = document.querySelector("#reportForm [name='date']");
    reportDateInput.value = today;
    reportDateInput.max = today;
    window.addEventListener("workbench-authenticated", () => {
      applySignedInUser();
      renderTasks();
      renderReports();
    });
    applySignedInUser();
    document.getElementById("logoutWorkbench")?.addEventListener("click", async () => {
      const button = document.getElementById("logoutWorkbench");
      if (button) button.disabled = true;
      try {
        await fetch("/api/auth/logout", { method: "POST", headers: { accept: "application/json" } });
      } finally {
        window.__workbenchUser = null;
        window.location.reload();
      }
    });
    document.getElementById("weeklyAnchor").value = today;
    updateReportHelp();
    initializeWorkbench();
    if (window.__workbenchEnterRequested || signedInWorkbenchUser()) {
      applySignedInUser();
      enterWorkbench();
    }
