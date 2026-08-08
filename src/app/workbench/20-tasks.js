    function taskIsVoided(task) {
      return task?.status === "已作废";
    }

    function taskIsTerminal(task) {
      return task?.status === "已完成" || taskIsVoided(task);
    }

    function taskIsActive(task) {
      return !taskIsTerminal(task);
    }

    function taskCountsInPerformance(task) {
      return !taskIsVoided(task);
    }

    function currentTaskCenterAuthor() {
      return String(signedInWorkbenchUser()?.name || "").trim();
    }

    function taskMatchesCurrentAuthor(task, author) {
      if (!normalizedReportAuthor(author)) return false;
      return normalizedReportAuthor(task.assignee) === normalizedReportAuthor(author);
    }

    function taskPriorityRank(task) {
      return task.priority === "紧急" ? 0 : task.priority === "重要" ? 1 : 2;
    }

    function compareTaskCenterTasks(a, b) {
      const overdueDifference = Number(isPastDue(b.due)) - Number(isPastDue(a.due));
      if (overdueDifference) return overdueDifference;
      const priorityDifference = taskPriorityRank(a) - taskPriorityRank(b);
      if (priorityDifference) return priorityDifference;
      const aDue = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || ""));
    }

    function taskCenterActiveTasks() {
      return (state.tasks || []).filter(taskIsActive).sort(compareTaskCenterTasks);
    }

    function taskCenterHistoryTasks() {
      return (state.tasks || []).filter(taskIsTerminal).sort((a, b) =>
        String(b.completedAt || b.voidedAt || b.updatedAt || "").localeCompare(String(a.completedAt || a.voidedAt || a.updatedAt || ""))
      );
    }

    function normalizedTaskFingerprintPart(value) {
      return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    }

    function taskDuplicateFingerprint(task) {
      const title = normalizedTaskFingerprintPart(task?.title);
      if (!title) return `task:${normalizedTaskFingerprintPart(task?.id) || "missing-id"}`;
      return [
        title,
        task?.assignee,
        task?.source,
        task?.store,
        task?.sku,
        task?.action,
        task?.acceptance,
        task?.due,
        task?.reviewAt,
        task?.sourceReport,
        task?.sourceAnomaly,
        task?.status
      ].map(normalizedTaskFingerprintPart).join("\u241f");
    }

    function groupTaskHistoryRecords(records) {
      const groups = [];
      const groupsByFingerprint = new Map();
      (records || []).forEach((task) => {
        const key = taskDuplicateFingerprint(task);
        const existing = groupsByFingerprint.get(key);
        if (existing) {
          existing.duplicates.push(task);
          return;
        }
        const group = { key, primary: task, duplicates: [] };
        groupsByFingerprint.set(key, group);
        groups.push(group);
      });
      return groups;
    }

    function groupTasksByAssignee(tasks) {
      const groups = new Map();
      tasks.forEach((task) => {
        const label = String(task.assignee || "").trim() || "未分配";
        const key = normalizedReportAuthor(label) || "__unassigned__";
        if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
        groups.get(key).tasks.push(task);
      });
      return [...groups.values()].sort((a, b) => {
        if (a.key === "__unassigned__") return -1;
        if (b.key === "__unassigned__") return 1;
        const overdueDifference = b.tasks.filter((task) => isPastDue(task.due)).length - a.tasks.filter((task) => isPastDue(task.due)).length;
        return overdueDifference || a.label.localeCompare(b.label, "zh-CN");
      });
    }

    function taskCenterSearchMatches(task, query) {
      const normalized = String(query || "").trim().toLowerCase();
      if (!normalized) return true;
      return [task.title, task.assignee, task.source, task.store, task.sku, task.action]
        .some((value) => String(value || "").toLowerCase().includes(normalized));
    }

    function renderMyTasksPanel(panel, activeTasks) {
      const author = currentTaskCenterAuthor();
      if (!author) {
        panel.innerHTML = `
          <div class="task-identity task-identity-empty">
            <div><b>先确认今天是谁在使用</b><span>请先在日报中心填写今天的姓名，任务中心才会匹配本人任务。</span></div>
            <button class="small-btn" data-go-report-author type="button">前往填写姓名</button>
          </div>`;
        return;
      }
      const tasks = activeTasks.filter((task) => taskMatchesCurrentAuthor(task, author));
      const dueToday = tasks.filter((task) => String(task.due || "").slice(0, 10) <= today).length;
      const processing = tasks.filter((task) => task.status === "处理中").length;
      const reviewing = tasks.filter((task) => task.status === "待复盘").length;
      panel.innerHTML = `
        <div class="task-identity"><div><span>当前人员</span><b>${escapeHtml(author)}</b></div><small>姓名来自当前登录账号，仅显示分配给你的未完成任务</small></div>
        <div class="task-summary-grid">
          <div><span>今天需处理</span><b>${dueToday}</b></div>
          <div><span>处理中</span><b>${processing}</b></div>
          <div><span>待复盘</span><b>${reviewing}</b></div>
        </div>
        <div class="task-personal-list">${tasks.length ? tasks.map(taskCard).join("") : `<div class="empty">当前没有分配给你的未完成任务</div>`}</div>`;
    }

    function renderTeamTasksPanel(panel, activeTasks) {
      const filtered = activeTasks.filter((task) =>
        taskCenterSearchMatches(task, taskCenterFilters.teamSearch)
        && (taskCenterFilters.teamStatus === "all" || task.status === taskCenterFilters.teamStatus)
        && (taskCenterFilters.teamPriority === "all" || task.priority === taskCenterFilters.teamPriority)
        && (!taskCenterFilters.teamOverdue || isPastDue(task.due))
      );
      const groups = groupTasksByAssignee(filtered);
      panel.innerHTML = `
        <div class="task-center-filters">
          <label><span>搜索</span><input data-task-search="team" value="${escapeHtml(taskCenterFilters.teamSearch)}" placeholder="任务、负责人、店铺或SKU" /></label>
          <label><span>状态</span><select data-task-filter="teamStatus"><option value="all">全部未完成</option>${["待处理", "处理中", "待复盘"].map((status) => `<option ${taskCenterFilters.teamStatus === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label><span>优先级</span><select data-task-filter="teamPriority"><option value="all">全部优先级</option>${["紧急", "重要", "观察"].map((priority) => `<option ${taskCenterFilters.teamPriority === priority ? "selected" : ""}>${priority}</option>`).join("")}</select></label>
          <label class="task-overdue-filter"><input data-task-filter="teamOverdue" type="checkbox" ${taskCenterFilters.teamOverdue ? "checked" : ""} /><span>只看逾期</span></label>
        </div>
        <div class="task-assignee-groups">${groups.length ? groups.map((group) => {
          const expanded = expandedTaskAssigneeGroups.has(group.key);
          const overdue = group.tasks.filter((task) => isPastDue(task.due)).length;
          const processing = group.tasks.filter((task) => task.status === "处理中").length;
          const reviewing = group.tasks.filter((task) => task.status === "待复盘").length;
          return `<section class="task-assignee-group${overdue ? " has-overdue" : ""}">
            <button class="task-assignee-head" data-task-group-toggle="${escapeHtml(group.key)}" type="button" aria-expanded="${expanded}">
              <span><b>${escapeHtml(group.label)}</b><small>${group.tasks.length} 项未完成</small></span>
              <span class="task-assignee-stats">${overdue ? `<em>${overdue} 逾期</em>` : ""}<i>${processing} 处理中</i><i>${reviewing} 待复盘</i><strong>${expanded ? "收起" : "展开"}</strong></span>
            </button>
            <div class="task-assignee-body" ${expanded ? "" : "hidden"}>${group.tasks.map(taskCard).join("")}</div>
          </section>`;
        }).join("") : `<div class="empty">没有符合当前筛选条件的团队任务</div>`}</div>`;
    }

    function renderHistoryTasksPanel(panel) {
      const history = taskCenterHistoryTasks().filter((task) =>
        taskCenterSearchMatches(task, taskCenterFilters.historySearch)
        && (taskCenterFilters.historyStatus === "all"
          || (taskCenterFilters.historyStatus === "已完成" ? task.status === "已完成" : taskIsVoided(task)))
      );
      const groups = groupTaskHistoryRecords(history);
      const visible = groups.slice(0, taskHistoryLimit);
      const renderGroup = (group) => group.duplicates.length
        ? `<div class="task-history-cluster">
            ${taskCard(group.primary)}
            <details>
              <summary>另有 ${group.duplicates.length} 条重复归档 <span>保留完整审计记录</span></summary>
              <div class="task-history-cluster-records">${group.duplicates.map(taskCard).join("")}</div>
            </details>
          </div>`
        : taskCard(group.primary);
      panel.innerHTML = `
        <div class="task-center-filters task-history-filters">
          <label><span>搜索历史</span><input data-task-search="history" value="${escapeHtml(taskCenterFilters.historySearch)}" placeholder="任务、负责人、店铺或SKU" /></label>
          <label><span>结果</span><select data-task-filter="historyStatus"><option value="all">全部历史</option><option ${taskCenterFilters.historyStatus === "已完成" ? "selected" : ""}>已完成</option><option ${taskCenterFilters.historyStatus === "已作废" ? "selected" : ""}>已作废</option></select></label>
        </div>
        <div class="task-history-list">${visible.length ? visible.map(renderGroup).join("") : `<div class="empty">暂无历史任务</div>`}</div>
        ${visible.length < groups.length ? `<button class="small-btn task-history-more" data-task-history-more type="button">加载更多（还有 ${groups.length - visible.length} 组）</button>` : ""}`;
    }

    function renderTasks() {
      const activeTasks = taskCenterActiveTasks();
      document.getElementById("openTaskCount").textContent = `${activeTasks.length} 个未完成`;
      document.querySelectorAll("[data-task-view]").forEach((button) => {
        const active = button.dataset.taskView === activeTaskCenterView;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.querySelectorAll("[data-task-panel]").forEach((panel) => {
        const active = panel.dataset.taskPanel === activeTaskCenterView;
        panel.hidden = !active;
        if (!active) {
          panel.innerHTML = "";
          return;
        }
        if (activeTaskCenterView === "mine") renderMyTasksPanel(panel, activeTasks);
        else if (activeTaskCenterView === "team") renderTeamTasksPanel(panel, activeTasks);
        else renderHistoryTasksPanel(panel);
      });
    }

    function taskCard(task) {
      const priorityClass = task.priority === "紧急" ? "priority-urgent" : task.priority === "重要" ? "priority-important" : "priority-watch";
      const taskId = String(task.id || "");
      const expanded = expandedTaskIds.has(taskId);
      const statusClass = task.status === "处理中"
        ? "processing"
        : task.status === "待复盘"
          ? "review"
          : task.status === "已完成"
            ? "done"
            : taskIsVoided(task)
              ? "void"
              : "pending";
      const sourceContext = [task.source, task.store, task.sku].filter(Boolean).map(escapeHtml).join(" · ") || "任务中心";
      const detailSections = [
        task.action ? `<div class="task-detail-section"><b>处理要求</b>${escapeHtml(task.action).replace(/\n/g, "<br>")}</div>` : "",
        task.acceptance ? `<div class="task-detail-section"><b>验收标准</b>${escapeHtml(task.acceptance).replace(/\n/g, "<br>")}</div>` : "",
        task.result ? `<div class="task-detail-section"><b>执行结果</b>${escapeHtml(task.result).replace(/\n/g, "<br>")}${task.evidence ? `<b style="margin-top:8px">结果证据</b>${escapeHtml(task.evidence).replace(/\n/g, "<br>")}` : ""}${task.reviewResult ? `<b style="margin-top:8px">复查结论</b>${escapeHtml(task.reviewResult).replace(/\n/g, "<br>")}` : ""}</div>` : "",
        taskIsVoided(task) ? `<div class="task-detail-section"><b>作废记录</b>${escapeHtml(task.voidCategory || "其他")}｜${escapeHtml(task.voidReason || "未填写原因")}<br>操作人：${escapeHtml(task.voidedBy || "未记录")} · ${escapeHtml(formatDateTime(task.voidedAt))}</div>` : ""
      ].filter(Boolean).join("");
      const statusAction = task.status === "待处理"
        ? `<button class="small-btn" data-task-start="${task.id}" type="button">开始处理</button>`
        : task.status === "处理中"
          ? `<button class="small-btn" data-task-result="${task.id}" type="button">提交执行结果</button>`
          : task.status === "待复盘"
            ? `<button class="small-btn" data-task-result="${task.id}" type="button">修改执行结果</button>`
            : "";
      const voidAction = taskIsTerminal(task)
        ? ""
        : `<button class="small-btn danger" data-task-void="${task.id}" type="button">作废</button>`;
      return `
        <div class="task-card ${priorityClass}${expanded ? " expanded" : ""}" data-task-id="${escapeHtml(taskId)}">
          <div class="task-card-head">
            <div class="task-card-title">
              <b>${escapeHtml(task.title)}</b>
              <span class="task-card-context">${sourceContext}</span>
            </div>
            <span class="task-status-pill ${statusClass}">${escapeHtml(task.status || "待处理")}</span>
          </div>
          <div class="task-meta">
            <span class="badge ${task.priority === "紧急" ? "red" : task.priority === "重要" ? "amber" : "green"}">${task.priority}</span>
            <span class="badge">${escapeHtml(task.assignee || "未分配")}</span>
            <span class="badge task-due${isPastDue(task.due) && taskIsActive(task) ? " overdue" : ""}">${task.due ? `${isPastDue(task.due) && taskIsActive(task) ? "已逾期 · " : ""}${escapeHtml(formatDateTime(task.due))}` : "无截止"}</span>
          </div>
          <div class="task-detail" ${expanded ? "" : "hidden"}>
            ${detailSections || `<div class="task-detail-section"><b>任务详情</b>暂无补充说明</div>`}
            <div class="task-detail-meta">
              <span>复查：${task.reviewAt ? escapeHtml(formatDateTime(task.reviewAt)) : "未设置"}</span>
              <span>更新：${task.updatedAt ? escapeHtml(formatDateTime(task.updatedAt)) : task.createdAt ? escapeHtml(formatDateTime(task.createdAt)) : "未记录"}</span>
            </div>
          </div>
          <div class="task-actions">
            ${statusAction}
            ${voidAction}
            <button class="small-btn task-details-toggle" data-task-details="${escapeHtml(taskId)}" type="button" aria-expanded="${expanded}">${expanded ? "收起详情" : "展开详情"}</button>
          </div>
        </div>
      `;
    }

    function toggleTaskDetails(taskId) {
      const id = String(taskId || "");
      if (!id) return;
      const shouldExpand = !expandedTaskIds.has(id);
      if (shouldExpand) expandedTaskIds.add(id);
      else expandedTaskIds.delete(id);
      const card = [...document.querySelectorAll("[data-task-id]")].find((item) => item.dataset.taskId === id);
      if (!card) return;
      card.classList.toggle("expanded", shouldExpand);
      const detail = card.querySelector(".task-detail");
      const button = card.querySelector("[data-task-details]");
      if (detail) detail.hidden = !shouldExpand;
      if (button) {
        button.setAttribute("aria-expanded", String(shouldExpand));
        button.textContent = shouldExpand ? "收起详情" : "展开详情";
      }
    }

    function openTaskResultEditor(taskId) {
      const task = (state.tasks || []).find((item) => item.id === taskId);
      if (!task) return;
      const form = document.getElementById("taskResultForm");
      form.elements.id.value = task.id;
      form.elements.title.value = task.title || "";
      form.elements.result.value = task.result || "";
      form.elements.evidence.value = task.evidence || "";
      form.elements.reviewAt.value = task.reviewAt || `${addDays(today, 1)}T10:00`;
      form.elements.status.value = task.status === "处理中" ? "待复盘" : task.status;
      document.getElementById("taskResultTitle").textContent = task.title || "提交处理结果";
      document.getElementById("taskResultModal").hidden = false;
    }

    function stampTaskMutation(task, actor = "") {
      const changedAt = new Date().toISOString();
      task.updatedAt = changedAt;
      task.updatedBy = actor || currentReportAuthor() || "未登录成员";
      task.syncVersion = Number(task.syncVersion || 0) + 1;
      return changedAt;
    }

    function startTask(taskId) {
      const task = (state.tasks || []).find((item) => item.id === taskId);
      if (!task || task.status !== "待处理") {
        showToast("任务状态已变化，请刷新后重试");
        return;
      }
      task.status = "处理中";
      task.startedAt = stampTaskMutation(task);
      saveState({ immediate: true });
      render();
      requestAnimationFrame(() => {
        const movedCard = [...document.querySelectorAll("[data-task-id]")]
          .find((item) => item.dataset.taskId === taskId);
        if (!movedCard) return;
        movedCard.classList.add("task-card-focus");
        movedCard.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => movedCard.classList.remove("task-card-focus"), 2400);
      });
      showToast("任务已移至“处理中”，不会消失");
    }

    function focusTaskFromReport(taskId) {
      expandedTaskIds.add(String(taskId || ""));
      setView("tasks");
      requestAnimationFrame(() => {
        const card = [...document.querySelectorAll("[data-task-id]")].find((item) => item.dataset.taskId === taskId);
        if (!card) {
          showToast("关联任务不存在或尚未同步");
          return;
        }
        document.querySelectorAll(".task-card-focus").forEach((item) => item.classList.remove("task-card-focus"));
        card.classList.add("task-card-focus");
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        window.setTimeout(() => card.classList.remove("task-card-focus"), 2400);
      });
    }

    function closeTaskResultEditor() {
      document.getElementById("taskResultModal").hidden = true;
    }

    function openTaskVoidEditor(taskId) {
      const task = (state.tasks || []).find((item) => item.id === taskId);
      if (!task || taskIsTerminal(task)) return;
      const form = document.getElementById("taskVoidForm");
      form.reset();
      form.elements.id.value = task.id;
      form.elements.title.value = task.title || "";
      document.getElementById("taskVoidTitle").textContent = `作废：${task.title || "任务"}`;
      document.getElementById("taskVoidModal").hidden = false;
      window.setTimeout(() => form.elements.category.focus(), 80);
    }

    function closeTaskVoidEditor() {
      document.getElementById("taskVoidModal").hidden = true;
    }

    function markTaskVoided(task, category, reason, actor) {
      task.status = "已作废";
      task.voidCategory = category || "其他";
      task.voidReason = reason;
      task.voidedAt = stampTaskMutation(task, actor);
      task.voidedBy = actor || "未登录成员";
      task.completedAt = "";
      return task;
    }

    function voidTask(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const task = (state.tasks || []).find((item) => item.id === data.id);
      if (!task || taskIsTerminal(task)) {
        closeTaskVoidEditor();
        showToast("任务状态已变化，请刷新后重试");
        return;
      }
      const category = String(data.category || "").trim();
      if (!category) {
        showToast("请先选择作废类型");
        form.elements.category.focus();
        return;
      }
      const reason = String(data.reason || "").trim();
      if (reason.length < 4) {
        showToast("请填写明确的作废原因");
        form.elements.reason.focus();
        return;
      }
      markTaskVoided(task, category, reason, currentReportAuthor());
      saveState({ immediate: true });
      closeTaskVoidEditor();
      render();
      showToast("任务已作废，记录仍保留");
    }

    function saveTaskResult(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const task = (state.tasks || []).find((item) => item.id === data.id);
      if (!task) return;
      task.result = data.result.trim();
      task.evidence = data.evidence.trim();
      task.reviewAt = data.reviewAt;
      task.status = data.status === "处理中" ? "处理中" : "待复盘";
      task.resultSubmittedAt = stampTaskMutation(task);
      saveState({ immediate: true });
      closeTaskResultEditor();
      showToast(task.status === "待复盘" ? "执行结果已提交，等待日报复查" : "执行结果已保存");
      render();
    }
