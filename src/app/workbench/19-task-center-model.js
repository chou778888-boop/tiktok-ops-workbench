    function normalizedTaskCenterPerson(value) {
      return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
    }

    function taskCenterModelDateKey(value) {
      const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
      return match ? match[0] : "";
    }

    function taskCenterModelIsTerminal(task) {
      return task?.status === "已完成" || task?.status === "已作废";
    }

    function taskCenterModelPriorityRank(task) {
      return task?.priority === "紧急" ? 0 : task?.priority === "重要" ? 1 : 2;
    }

    function taskCenterModelTerminalAt(task) {
      return String(task?.completedAt || task?.voidedAt || task?.updatedAt || task?.createdAt || "");
    }

    function taskCenterModelCompareActive(a, b, today) {
      const aOverdue = Boolean(taskCenterModelDateKey(a?.due) && taskCenterModelDateKey(a.due) < today);
      const bOverdue = Boolean(taskCenterModelDateKey(b?.due) && taskCenterModelDateKey(b.due) < today);
      if (aOverdue !== bOverdue) return Number(bOverdue) - Number(aOverdue);
      const priorityDifference = taskCenterModelPriorityRank(a) - taskCenterModelPriorityRank(b);
      if (priorityDifference) return priorityDifference;
      const aDue = taskCenterModelDateKey(a?.due) || "9999-12-31";
      const bDue = taskCenterModelDateKey(b?.due) || "9999-12-31";
      if (aDue !== bDue) return aDue.localeCompare(bDue);
      return String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || ""));
    }

    function makeTaskCenterCommandModel(records, options = {}) {
      const todayKey = taskCenterModelDateKey(options.today) || String(options.today || "").slice(0, 10);
      const authorKey = normalizedTaskCenterPerson(options.author);
      const active = (records || [])
        .filter((task) => !taskCenterModelIsTerminal(task))
        .sort((a, b) => taskCenterModelCompareActive(a, b, todayKey));
      const history = (records || [])
        .filter(taskCenterModelIsTerminal)
        .sort((a, b) => taskCenterModelTerminalAt(b).localeCompare(taskCenterModelTerminalAt(a)));
      const personal = active.filter((task) => normalizedTaskCenterPerson(task?.assignee) === authorKey);
      const isOverdue = (task) => Boolean(taskCenterModelDateKey(task?.due) && taskCenterModelDateKey(task.due) < todayKey);
      const isDueToday = (task) => taskCenterModelDateKey(task?.due) === todayKey;
      const focus = ["overdue", "today", "processing", "review"].includes(options.focus) ? options.focus : "all";
      const visiblePersonal = personal.filter((task) => {
        if (focus === "overdue") return isOverdue(task);
        if (focus === "today") return isDueToday(task);
        if (focus === "processing") return task.status === "处理中";
        if (focus === "review") return task.status === "待复盘";
        return true;
      });
      const assignedPeople = new Set(active.map((task) => normalizedTaskCenterPerson(task?.assignee)).filter(Boolean));
      return {
        active,
        personal,
        visiblePersonal,
        focus,
        personalSummary: {
          total: personal.length,
          overdue: personal.filter(isOverdue).length,
          dueToday: personal.filter(isDueToday).length,
          processing: personal.filter((task) => task.status === "处理中").length,
          reviewing: personal.filter((task) => task.status === "待复盘").length
        },
        teamSummary: {
          total: active.length,
          overdue: active.filter(isOverdue).length,
          dueToday: active.filter(isDueToday).length,
          unassigned: active.filter((task) => !normalizedTaskCenterPerson(task?.assignee)).length,
          assignees: assignedPeople.size
        },
        historySummary: {
          total: history.length,
          completed: history.filter((task) => task.status === "已完成").length,
          voided: history.filter((task) => task.status === "已作废").length
        },
        recentClosed: history.slice(0, 3)
      };
    }
