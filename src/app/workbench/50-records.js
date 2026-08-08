    function saveEntry(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const numeric = ["sps", "gmv", "orders", "units", "sampleQty", "productCardGmv", "affiliateGmv", "adGmv", "adSpend", "topSkuUnits", "returns", "badReviews"];
      numeric.forEach((key) => data[key] = data[key] === "" ? 0 : Number(data[key]));
      data.id = crypto.randomUUID();
      state.entries.push(data);
      saveState();
      form.reset();
      form.elements.date.value = today;
      showToast("已保存每日数据，并更新异常看板");
      render();
    }

    function saveProduct(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const numeric = ["units", "gmv", "productCardGmv", "affiliateGmv", "price", "stock", "returns", "badReviews"];
      numeric.forEach((key) => data[key] = data[key] === "" ? 0 : Number(data[key]));
      data.id = crypto.randomUUID();
      state.products.push(data);
      saveState();
      form.reset();
      form.elements.date.value = today;
      showToast("产品明细已保存");
      render();
    }

    function saveTask(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const createdAt = new Date().toISOString();
      data.id = crypto.randomUUID();
      data.source = "手动创建";
      data.result = "";
      data.createdAt = createdAt;
      data.updatedAt = createdAt;
      data.updatedBy = currentReportAuthor() || data.assignee || "未登录成员";
      data.syncVersion = 1;
      state.tasks.push(data);
      saveState();
      form.reset();
      showToast("任务已创建");
      render();
    }

    function createTasksFromAnomalies() {
      const anomalies = detectAnomalies();
      let created = 0;
      anomalies.forEach((item) => {
        const exists = state.tasks.some((task) => task.source === item.id);
        if (exists) return;
        state.tasks.push({
          id: crypto.randomUUID(),
          title: item.title,
          assignee: item.owner,
          priority: item.level,
          store: item.store,
          sku: item.sku,
          due: today,
          status: "待处理",
          source: item.id,
          action: item.detail,
          result: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: currentReportAuthor() || item.owner || "未登录成员",
          syncVersion: 1
        });
        created += 1;
      });
      saveState();
      showToast(created ? `已生成 ${created} 个任务` : "没有新的异常任务");
      render();
      setView("tasks");
    }

    function downloadFile(filename, content, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    function exportJsonData() {
      const payload = {
        exportedAt: new Date().toISOString(),
        version: "v1",
        data: normalizeState(state)
      };
      downloadFile(`tiktok-ops-data-${today}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
      showToast("JSON已导出");
    }

    function csvCell(value) {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    function toCsv(rows, columns) {
      return [
        columns.map((col) => csvCell(col.label)).join(","),
        ...rows.map((row) => columns.map((col) => csvCell(row[col.key])).join(","))
      ].join("\n");
    }

    function exportCsvData() {
      const sections = [
        {
          title: "店铺日报",
          rows: state.entries,
          columns: [
            ["date", "日期"], ["store", "店铺"], ["owner", "负责人"], ["gmv", "GMV"], ["orders", "订单"],
            ["units", "销量"], ["sampleQty", "样品"], ["productCardGmv", "商品卡GMV"], ["affiliateGmv", "联盟GMV"],
            ["adGmv", "广告GMV"], ["adSpend", "广告花费"], ["sps", "SPS"], ["returns", "退货"], ["badReviews", "差评"], ["note", "备注"], ["plan", "计划"]
          ]
        },
        {
          title: "产品明细",
          rows: state.products,
          columns: [
            ["date", "日期"], ["store", "店铺"], ["product", "产品"], ["sku", "SKU"], ["units", "销量"],
            ["gmv", "GMV"], ["productCardGmv", "商品卡GMV"], ["affiliateGmv", "联盟GMV"], ["price", "售价"],
            ["stock", "库存"], ["returns", "退货"], ["badReviews", "差评"]
          ]
        },
        {
          title: "任务",
          rows: state.tasks,
          columns: [
            ["title", "任务"], ["assignee", "责任人"], ["priority", "优先级"], ["store", "店铺"], ["sku", "SKU"],
            ["due", "截止"], ["status", "状态"], ["source", "来源"], ["action", "动作"], ["acceptance", "完成标准"],
            ["reviewAt", "复查时间"], ["result", "执行结果"], ["evidence", "完成证据"], ["reviewResult", "复查结论"],
            ["reviewer", "复查人"], ["reviewedAt", "复查日期"]
          ]
        },
        {
          title: "岗位日报",
          rows: state.reports || [],
          columns: [
            ["date", "日期"], ["role", "日报类型"], ["author", "姓名/汇总人"], ["stores", "负责店铺"], ["risk", "最高风险"],
            ["status", "日报状态"], ["results", "今日结果"], ["anomalies", "核心异常"], ["reviews", "昨日复查"],
            ["tasksText", "明日跟进"], ["approvals", "需要配合解决"], ["createdAt", "提交时间"]
          ]
        },
        {
          title: "达人维护",
          rows: creatorRecords().map((item) => ({ ...item, ...creatorEditFor(item.id) })),
          columns: [
            ["source", "来源"], ["tier", "类型"], ["name", "达人昵称"], ["contact", "脱敏联系方式"], ["period", "日期/更新"],
            ["videoStatus", "视频状态"], ["liveStatus", "直播状态"], ["product", "寄样产品"], ["shop", "店铺"], ["levelTag", "层级标签"], ["categoryTag", "类目标签"], ["gmvK", "近7日GMV(k)"],
            ["commission", "合作佣金"], ["adCommission", "广告佣金"], ["followStatus", "跟进状态"], ["owner", "负责人"],
            ["relationship", "合作情况"], ["followNote", "跟进备注"]
          ]
        },
        {
          title: "达人历史",
          rows: state.creatorHistory || [],
          columns: [
            ["savedAt", "保存时间"], ["action", "动作"], ["name", "达人昵称"], ["product", "寄样产品"], ["shop", "店铺"], ["gmvK", "近7日GMV(k)"],
            ["followStatus", "跟进状态"], ["owner", "负责人"], ["relationship", "合作情况"], ["followNote", "跟进备注"]
          ]
        }
      ];
      const content = sections.map((section) => {
        const columns = section.columns.map(([key, label]) => ({ key, label }));
        return `${section.title}\n${toCsv(section.rows, columns)}`;
      }).join("\n\n");
      downloadFile(`tiktok-ops-data-${today}.csv`, "\uFEFF" + content, "text/csv;charset=utf-8");
      showToast("CSV已导出");
    }

    function importJsonData(file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result);
          const imported = normalizeState(parsed.data || parsed);
          const protectedTasks = new Map((imported.tasks || []).map((task) => [String(task.id), task]));
          (state.tasks || []).forEach((task) => protectedTasks.set(String(task.id), task));
          imported.tasks = [...protectedTasks.values()];
          state = imported;
          if (typeof hydrateProfitWorkspaceFromState === "function") hydrateProfitWorkspaceFromState();
          saveState();
          render();
          showToast("数据已导入，现有任务已保留");
        } catch {
          showToast("导入失败：JSON格式不正确");
        }
      };
      reader.readAsText(file);
    }

    const costingStoreKey = "tiktok_ops_costing_v1_local";
    const costDefaultValues = {
      store: "DreamWeave", sku: "", channel: "affiliate",
      price: 0, discount: 0, purchase: 0, packaging: 0,
      firstMile: 0, warehouse: 0, lastMile: 0, fulfillmentOther: 0,
      platformRate: 0, smartPromotionRate: 0, campaignPeriodRate: 0, creatorRate: 0, adCommissionRate: 0,
      adCost: 0, refundRate: 0, returnLoss: 0, targetMargin: 0
    };
    const legacyCostProfileIds = new Set(["cost-test-1"]);
