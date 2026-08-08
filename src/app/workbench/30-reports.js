    const REPORT_STORES = [
      { name: "DreamWeave", group: "家纺" },
      { name: "sweet dream", group: "家纺" },
      { name: "Dreamland", group: "家纺" },
      { name: "Dreamdaily", group: "家纺" },
      { name: "MoonDream", group: "家纺" },
      { name: "Himood Smile", group: "口腔" }
    ];

    const REPORT_SCHEMAS = {
      "售后组": {
        help: "售后岗位每天汇总一份。每店填写 SPS 总分及商品满意度、履约与物流、客户服务三个维度，并填写退货 / 退款单量和金额；自动周报只汇总 SPS 总分。",
        columns: [
          { key: "sps", label: "SPS 总分", unit: "", decimal: true, step: "0.1", aggregate: "latest" },
          { key: "consultations", label: "咨询", unit: "单" },
          { key: "lateReplies", label: "未及时回复", unit: "单" },
          { key: "returns", label: "退货 / 退款（单）", unit: "" },
          { key: "returnAmount", label: "退货 / 退款金额（$）", unit: "$", money: true },
          { key: "badReviews", label: "新增差评", unit: "条" },
          { key: "reviewsResolved", label: "差评修改/删除", unit: "条" },
          { key: "appeals", label: "申诉", unit: "条" },
          { key: "appealSuccess", label: "申诉成功", unit: "条" },
          { key: "appealProcessing", label: "申诉处理中", unit: "条" },
          { key: "claims", label: "索赔", unit: "单" },
          { key: "unfinished", label: "未完成索赔", unit: "单" },
          { key: "highRisk", label: "高风险订单", unit: "单" }
        ]
      },
      "BD": {
        help: "BD按本人负责结果分别提交。插件触达量不填，日报重点记录联盟消息状态、产品寄样、重点达人跟进和老达人复投结果。",
        columns: [
          { key: "messageStatus", label: "联盟消息", type: "status", options: ["", "已处理完成", "有积压"], warning: "有积压" },
          { key: "samplesSent", label: "寄样", unit: "个" },
          { key: "oldCreatorContacts", label: "老达人联系", unit: "人" },
          { key: "confirmedReinvest", label: "确认合作", unit: "人" }
        ]
      },
      "店铺维护": {
        help: "六店由店铺维护统一提交。插件只记录运行状态，链接、库存、价格、活动和违规按实际完成结果填写。",
        columns: [
          { key: "pluginStatus", label: "插件运行", type: "status", options: ["", "正常", "异常"], warning: "异常" },
          { key: "linksAdded", label: "新上架", unit: "条" },
          { key: "linksUpdated", label: "修改链接", unit: "条" },
          { key: "linksRestored", label: "恢复链接", unit: "条" },
          { key: "linksPending", label: "待处理链接", unit: "条" },
          { key: "stockChanges", label: "库存调整", unit: "项" },
          { key: "priceChanges", label: "价格执行", unit: "项" },
          { key: "campaignApplied", label: "报名/续期", unit: "项" },
          { key: "campaignSuccess", label: "活动成功", unit: "项" },
          { key: "campaignPending", label: "活动待处理", unit: "项" },
          { key: "shopsChecked", label: "巡检店铺", unit: "家" },
          { key: "violations", label: "新增违规", unit: "条" },
          { key: "appeals", label: "提交申诉", unit: "条" },
          { key: "appealSuccess", label: "申诉成功", unit: "条" }
        ]
      },
      "其他": {
        help: "适用于新人入职、培训期成员和暂未归入固定岗位的工作。填写可核对的完成数量、学习产出、问题与协作需求，避免只写过程流水账。",
        columns: [
          { key: "completedItems", label: "完成事项", unit: "项" },
          { key: "trainingItems", label: "学习 / 培训", unit: "项" },
          { key: "documentsUpdated", label: "SOP / 文档更新", unit: "项" },
          { key: "questionsRaised", label: "提出问题", unit: "个" },
          { key: "questionsResolved", label: "已解决问题", unit: "个" }
        ]
      },
      "店群运营": {
        help: "店群运营按本人负责店铺分别提交。先看经营结果，再写异常判断、分派任务和复查结论。",
        columns: [
          { key: "gmv", label: "GMV", unit: "$", money: true },
          { key: "orders", label: "订单", unit: "单" },
          { key: "units", label: "销量", unit: "件" },
          { key: "productCardGmv", label: "商品卡GMV", unit: "$", money: true },
          { key: "affiliateGmv", label: "联盟GMV", unit: "$", money: true },
          { key: "adSpend", label: "广告成本", unit: "$", money: true },
          { key: "adRoi", label: "广告ROI", unit: "", decimal: true, step: "0.01" }
        ]
      }
    };

    function reportSchema(role) {
      return REPORT_SCHEMAS[role] || REPORT_SCHEMAS["售后组"];
    }

    const REPORT_WORK_GUIDES = {
      "售后组": {
        mustDo: [
          ["核对 SPS 与机会项", "进入 Seller Center 的 SPS 页面，逐店检查总分、三个维度和 Top Opportunity；下降项必须拆到具体指标。"],
          ["处理售后时限", "核对退货 / 退款、差评、申诉、索赔和高风险订单，优先处理临近平台时限的请求。"],
          ["完成当日闭环", "已解决事项回传结果与证据；未解决事项明确负责人、期限和复查时间。"]
        ],
        know: ["SPS 要看商品满意度、履约物流、客户服务及其具体指标", "客户服务重点关注 IM 不满意率和售后处理时效", "退货 / 退款必须结合订单量、金额、原因和问题 SKU 判断"]
      },
      "BD": {
        mustDo: [
          ["检查联盟合作队列", "逐店检查 Affiliate Center 消息及 Ongoing、Expiring、Canceled 合作；积压必须写原因和下一步。"],
          ["管理寄样履约", "写明店铺、产品和寄样数量，并追踪申请、批准、物流、收样和内容产出状态。"],
          ["推进内容与复投", "重点达人和老达人要记录视频 / LIVE 结果；阶段变化统一同步到达人中心。"]
        ],
        know: ["Open Collaboration 与 Target Collaboration 的佣金和寄样策略要分别维护", "免费样品收货后按 Manage Samples 显示期限跟进（当前通常为14天）", "视频 / LIVE、佣金、广告佣金和合作阶段以达人中心为唯一记录"]
      },
      "店铺维护": {
        mustDo: [
          ["巡检商品前台", "检查链接、SKU、库存和售价是否真实展示；后台显示完成后仍要验证前台。"],
          ["执行价格与活动", "核对各 SKU 定价合理性、活动价格区间和实际生效价，并记录成功与待处理结果。"],
          ["关闭违规异常", "写清店铺、问题、原因和处理结果；未关闭事项必须进入任务中心。"]
        ],
        know: ["同一 listing 的 SKU 价格必须真实、清晰，不能用异常低价变体误导展示价", "库存、价格、活动和合规风险优先于一般维护", "异常必须能追溯到具体店铺、链接、产品或违规单"]
      },
      "店群运营": {
        mustDo: [
          ["核对店铺结果", "按负责店铺填写 GMV、订单、销量，先确认数据完整再看涨跌。"],
          ["拆解增长质量", "联合看短视频、LIVE、商品卡、联盟、Shop Ads / GMV Max 和 ROI，定位变化来自流量、转化还是投放。"],
          ["把异常转成动作", "写清对象、原因、负责人、截止时间、验收标准和复查时间。"]
        ],
        know: ["短视频、LIVE、商品卡是成交场景，联盟和广告是合作 / 投放归因，不能重复相加", "不能用 GMV 增长掩盖 ROI、退货和 SPS 风险", "所有中高风险必须有人负责并进入复查"]
      },
      "其他": {
        mustDo: [
          ["交付安排事项", "记录完成数量、交付物和可核对的实际结果。"],
          ["沉淀学习成果", "写清学会什么、形成什么结论，以及更新了哪些 SOP 或文档。"],
          ["暴露问题与需求", "说明问题对象、当前阻塞、需要谁配合以及下一步动作。"]
        ],
        know: ["新人优先熟悉 Seller Center、Affiliate Center 和 TikTok Shop Academy", "不要只写过程，要写可检查的结果", "平台规则或系统变化当天提出，不留到周报"]
      }
    };

    function relevantReportGuideTasks(role, author, reportDate) {
      const normalizedAuthor = normalizedReportAuthor(author);
      const horizon = addDays(reportDate || today, 3);
      return (state.tasks || [])
        .filter((task) => {
          if (taskIsTerminal(task)) return false;
          if (!normalizedAuthor) return false;
          const assigneeMatch = normalizedAuthor && normalizedReportAuthor(task.assignee) === normalizedAuthor;
          const teamRoleMatch = TEAM_SUMMARY_REPORT_ROLES.has(role)
            && normalizedReportAuthor(task.assignee) === normalizedReportAuthor(role);
          if (!assigneeMatch && !teamRoleMatch) return false;
          const dueDate = String(task.due || "").slice(0, 10);
          return !dueDate || dueDate <= horizon;
        })
        .sort((a, b) => Number(isPastDue(b.due)) - Number(isPastDue(a.due)) || String(a.due || "").localeCompare(String(b.due || "")))
        .slice(0, 6);
    }

    function renderReportWorkGuide() {
      const target = document.getElementById("reportWorkGuide");
      const form = document.getElementById("reportForm");
      if (!target || !form) return;
      const role = form.elements.role?.value || "售后组";
      const author = String(form.elements.author?.value || "").trim();
      const reportDate = form.elements.date?.value || today;
      const guide = REPORT_WORK_GUIDES[role] || REPORT_WORK_GUIDES["其他"];
      const tasks = relevantReportGuideTasks(role, author, reportDate);
      const hasIdentity = Boolean(author && reportDate);
      const hasResult = roleDataHasValue(collectRoleData(role));
      const reviewRows = closureRows("review");
      const dueReviews = pendingReviewTasks();
      const blockedReviews = dueReviewBlockedTasks();
      const reviewsReady = !blockedReviews.length && dueReviews.every((task) => reviewRows.some((row) =>
        row.taskId === task.id && row.result && row.status
      ));
      const anomalyRows = closureRows("anomaly");
      const actionRows = closureRows("task");
      const approvalRows = closureRows("approval");
      const closureReady = anomalyRows.every((row) => row.object && row.category && row.issue && row.reason && row.risk && row.handling)
        && actionRows.every((row) => row.task && row.owner && row.due && row.acceptance && row.reviewAt)
        && approvalRows.every((row) => row.item && row.suggestion && row.owner && row.deadline);
      const reviewDetail = blockedReviews.length
        ? `${blockedReviews.length}项需先在任务中心回传结果与证据`
        : dueReviews.length ? `${dueReviews.length}项待填写复查结论` : "当前没有到期复查";
      const checkpoints = [
        [hasIdentity, "确认本人和真实日期", hasIdentity ? `${author} · ${reportDate}` : "先填写姓名和日期"],
        [hasResult, "完成岗位今日结果", hasResult ? "已检测到可汇总结果" : "填写上方岗位必做的实际结果"],
        [reviewsReady, "完成到期任务复查", reviewDetail],
        [closureReady, "异常、明日跟进与协同信息完整", anomalyRows.length || actionRows.length || approvalRows.length ? "已填写闭环事项" : "无新增事项可直接跳过"]
      ];
      const completed = checkpoints.filter(([done]) => done).length;
      const progress = completed / checkpoints.length * 100;
      target.innerHTML = `
        <div class="report-work-guide-head">
          <div>
            <h3>${escapeHtml(role)} · 今日工作导航</h3>
            <p>导航负责告诉你今天该做什么；上方填写结果，异常进入任务，已提交数据自动进入总览和周报。</p>
          </div>
          <div class="report-work-guide-progress">
            <b>提交准备 ${completed}/${checkpoints.length}</b>
            <span><i style="--progress:${progress}%"></i></span>
          </div>
        </div>
        <div class="report-work-guide-grid">
          <section class="report-work-guide-column report-work-guide-primary">
            <b>今天必须完成</b>
            <div class="report-guide-list">
              ${guide.mustDo.map(([title, detail], index) => `
                <div class="report-guide-item">
                  <em>${index + 1}</em>
                  <span>${escapeHtml(title)}<small>${escapeHtml(detail)}</small></span>
                </div>
              `).join("")}
            </div>
            <div class="report-guide-task-section ${tasks.length ? "has-tasks" : "is-empty"}">
              <b>系统排定的待办</b>
              <div class="report-guide-task-list">
                ${tasks.length ? tasks.map((task) => `
                  <button class="report-guide-task ${isPastDue(task.due) ? "overdue" : ""}" data-view-task="${escapeHtml(task.id)}" type="button">
                    <b>${escapeHtml(task.title || "未命名任务")}</b>
                    <small>${escapeHtml(task.assignee || "未分配")} · ${isPastDue(task.due) ? "已逾期" : task.due ? `截止 ${formatDateTime(task.due)}` : "未设置截止时间"}</small>
                  </button>
                `).join("") : `<div class="report-guide-empty">${author ? "未来3天没有分配给你的未结任务，按岗位必做清单完成今日工作。" : "填写姓名后，系统会匹配本人及本岗位未来3天的未结任务。"}</div>`}
              </div>
            </div>
          </section>
          <section class="report-work-guide-column report-work-guide-checks">
            <b>提交前自检</b>
            <div class="report-guide-list">
              ${checkpoints.map(([done, title, detail]) => `
                <div class="report-guide-item ${done ? "done" : ""}">
                  <em>${done ? "✓" : "·"}</em>
                  <span>${escapeHtml(title)}<small>${escapeHtml(detail)}</small></span>
                </div>
              `).join("")}
            </div>
          </section>
        </div>
        <section class="report-guide-rules">
          <b>关键判断规则</b>
          <div class="report-guide-rules-grid">
            ${guide.know.map((item, index) => `<div class="report-guide-rule"><em>${index + 1}</em><span>${escapeHtml(item)}</span></div>`).join("")}
          </div>
        </section>
      `;
    }

    function setReportFormExpanded(expanded) {
      const details = document.getElementById("reportDetails");
      const roleSelect = document.getElementById("reportRole");
      if (details) details.hidden = !expanded;
      if (roleSelect) roleSelect.setAttribute("aria-expanded", String(Boolean(expanded)));
    }

    function updateReportHelp() {
      const role = document.getElementById("reportRole")?.value || "";
      const help = document.getElementById("reportHelp");
      setReportFormExpanded(Boolean(role));
      if (!role) {
        if (help) help.textContent = "";
        document.getElementById("reportRoleFields").innerHTML = "";
        document.getElementById("reportClosureFields").innerHTML = "";
        document.getElementById("pendingReviewQueue").innerHTML = "";
        document.getElementById("reportWorkGuide").innerHTML = "";
        return;
      }
      if (help) help.textContent = reportSchema(role).help;
      renderReportRoleFields(role);
      renderReportClosureFields(role);
      renderPendingReviewQueue();
      renderReportWorkGuide();
    }

    function currentReportAuthor() {
      const signedInName = String(signedInWorkbenchUser()?.name || "").trim();
      if (signedInName) return signedInName;
      const formAuthor = String(document.querySelector("#reportForm [name='author']")?.value || "").trim();
      return formAuthor || String(localStorage.getItem(currentAuthorKey) || "").trim();
    }

    function saveReportResumePointer(report) {
      localStorage.setItem(reportResumeKey, JSON.stringify({
        date: report.date,
        role: report.role,
        author: normalizedReportAuthor(report.author),
        reportId: report.id
      }));
    }

    function clearReportResumePointer() {
      localStorage.removeItem(reportResumeKey);
    }

    function readReportResumePointer() {
      try {
        return JSON.parse(localStorage.getItem(reportResumeKey) || "null");
      } catch {
        return null;
      }
    }

    function setInputValue(input, value) {
      if (!input) return;
      input.value = value ?? "";
    }

    function fillRepeatedSection(scopeSelector, name, rows) {
      const section = document.querySelector(`${scopeSelector} [data-repeat-section="${name}"]`);
      if (!section) return;
      const values = Array.isArray(rows) ? rows : [];
      while (repeatSectionRows(section, name).length < Math.max(Number(section.dataset.minRows || 1), values.length)) {
        addRepeatedRow(name, section);
      }
      repeatSectionRows(section, name).forEach((row, index) => {
        clearRepeatedRow(row);
        const data = values[index] || {};
        row.querySelectorAll("[data-part]").forEach((input) => setInputValue(input, data[input.dataset.part]));
      });
      renumberRepeatSection(section, name);
    }

    function fillReportRoleData(report) {
      const data = report.roleData || {};
      setInputValue(document.querySelector('#reportForm [name="extraCompletedWork"]'), data.extraCompletedWork || "");
      document.getElementById("reportExtraWork")?.toggleAttribute("open", Boolean(data.extraCompletedWork));
      if (Array.isArray(data.matrix)) {
        data.matrix.forEach((item) => {
          const row = [...document.querySelectorAll("#reportRoleFields .report-store-row")]
            .find((candidate) => candidate.dataset.store === item.store);
          if (!row) return;
          row.querySelectorAll("[data-report-key]").forEach((input) => setInputValue(input, item.values?.[input.dataset.reportKey]));
        });
      }
      Object.entries(data.summary || {}).forEach(([key, value]) => setInputValue(document.querySelector(`#reportRoleFields [data-role-field="${key}"]`), value));
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value !== "object") setInputValue(document.querySelector(`#reportRoleFields [data-role-field="${key}"]`), value);
      });
      if (report.role === "BD") {
        fillRepeatedSection("#reportRoleFields", "responsibleStores", data.responsibleStoreRows || []);
        fillRepeatedSection("#reportRoleFields", "samples", data.samples || []);
        fillRepeatedSection("#reportRoleFields", "followups", data.followups || []);
      } else if (report.role === "店铺维护") {
        fillRepeatedSection("#reportRoleFields", "plugin", data.plugins || (data.plugin ? [data.plugin] : []));
        fillRepeatedSection("#reportRoleFields", "inspectionIssues", data.inspectionIssues || []);
      }
    }

    function fillReportClosureData(report) {
      const items = report.closureItems || {};
      const reportTasks = (state.tasks || []).filter((task) => task.sourceReport === report.id);
      const anomalies = (items.anomalies || []).map((item) => {
        const generatedTask = reportTasks.find((task) => task.sourceAnomaly === item.id);
        return {
          ...item,
          handling: item.handling || (generatedTask ? "生成跟进任务" : item.linkedTaskId ? "关联已有任务" : "仅记录观察"),
          taskId: item.taskId || generatedTask?.id || ""
        };
      });
      fillRepeatedSection("#reportClosureFields", "anomaly", anomalies);
      fillRepeatedSection("#reportClosureFields", "review", items.reviews || []);
      fillRepeatedSection("#reportClosureFields", "task", items.tasks || []);
      fillRepeatedSection("#reportClosureFields", "approval", items.approvals || []);
      document.querySelectorAll('#reportClosureFields [data-closure-row="review"]').forEach((row) => {
        row.classList.toggle("is-linked", Boolean(row.querySelector('[data-part="taskId"]')?.value));
      });
      if (anomalies.length) document.querySelector('#reportClosureFields [data-workflow-block="anomaly"]')?.setAttribute("open", "");
      if ((items.tasks || []).length) document.querySelector('#reportClosureFields [data-workflow-block="task"]')?.setAttribute("open", "");
      if ((items.approvals || []).length) document.querySelector('#reportClosureFields [data-workflow-block="approval"]')?.setAttribute("open", "");
    }

    function loadReportIntoForm(report, { scroll = true, notify = true } = {}) {
      const form = document.getElementById("reportForm");
      form.dataset.editingReportId = report.id;
      activeReportEditUpdatedAt = String(report.updatedAt || "");
      activeReportEditTaskSnapshot = new Map((state.tasks || [])
        .filter((task) => task.sourceReport === report.id)
        .map((task) => [task.id, JSON.stringify(task)]));
      form.elements.date.value = report.date;
      form.elements.role.value = report.role;
      form.elements.author.value = report.author;
      form.elements.risk.value = report.risk || "无";
      form.elements.reportStatus.value = report.status || "已提交";
      setReportFormExpanded(true);
      updateReportHelp();
      fillReportRoleData(report);
      fillReportClosureData(report);
      renderPendingReviewQueue();
      renderReportWorkGuide();
      if (scroll) form.scrollIntoView({ behavior: "smooth", block: "start" });
      if (notify) showToast("已载入本人今日日报，可修改后重新保存");
    }

    function editTodayReport(reportId) {
      const report = (state.reports || []).find((item) => item.id === reportId);
      if (!report || !reportWasSubmittedToday(report) || normalizedReportAuthor(report.author) !== normalizedReportAuthor(currentReportAuthor())) {
        showToast("只能编辑本人今天提交的日报");
        return;
      }
      setReportFormExpanded(true);
      loadReportIntoForm(report);
    }

    function restoreReportFormForToday() {
      const pointer = readReportResumePointer();
      if (!pointer || pointer.date !== today) {
        clearReportResumePointer();
        setReportFormExpanded(false);
        return false;
      }
      const currentAuthor = normalizedReportAuthor(localStorage.getItem(currentAuthorKey) || "");
      const report = (state.reports || []).find((item) =>
        item.id === pointer.reportId
        && item.date === today
        && item.role === pointer.role
        && normalizedReportAuthor(item.author) === pointer.author
        && pointer.author === currentAuthor
      );
      if (!report) {
        clearReportResumePointer();
        setReportFormExpanded(false);
        return false;
      }
      loadReportIntoForm(report, { scroll: false, notify: false });
      return true;
    }

    function templateField(label, key, options = {}) {
      const type = options.type || "text";
      if (type === "select") {
        return `<div class="template-input"><label>${escapeHtml(label)}</label><select data-role-field="${key}">${(options.options || []).map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option || "请选择")}</option>`).join("")}</select></div>`;
      }
      return `<div class="template-input"><label>${escapeHtml(label)}</label><input data-role-field="${key}" type="${type}" ${type === "number" ? `min="0" step="${options.step || "1"}" inputmode="decimal"` : ""} placeholder="${escapeHtml(options.placeholder || "")}" /></div>`;
    }

    function rowField(label, part, options = {}) {
      const type = options.type || "text";
      if (type === "select") {
        return `<div class="template-input"><label>${escapeHtml(label)}</label><select data-part="${part}">${(options.options || []).map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option || "请选择")}</option>`).join("")}</select></div>`;
      }
      if (type === "datetime-local") {
        const presetOptions = part === "reviewAt"
          ? `<option value="day-1-1000">明天10:00</option><option value="day-2-1000">后天10:00</option>`
          : `<option value="hours-2">2小时后</option><option value="day-0-1800">今天18:00</option><option value="day-1-1800">明天18:00</option>`;
        return `<div class="template-input"><label>${escapeHtml(label)}</label><div class="smart-time-control"><select data-time-preset aria-label="${escapeHtml(label)}快捷选择"><option value="">快捷</option>${presetOptions}</select><input data-part="${part}" type="datetime-local" /></div></div>`;
      }
      return `<div class="template-input"><label>${escapeHtml(label)}</label><input data-part="${part}" type="${type}" ${type === "number" ? `min="0" step="${options.step || "1"}" inputmode="decimal"` : ""} placeholder="${escapeHtml(options.placeholder || "")}" /></div>`;
    }

    function storeOptions(includeAll = false) {
      const options = REPORT_STORES.map((store) => store.name);
      return includeAll ? ["", "六店", ...options] : ["", ...options];
    }

    function repeatControls(name) {
      return `
        <span class="template-row-actions">
          <button class="row-control" data-remove-row="${name}" type="button">减少一行</button>
          <button class="row-control" data-add-row="${name}" type="button">添加一行</button>
        </span>
      `;
    }

    function openTaskLinkField() {
      const options = (state.tasks || [])
        .filter(taskIsActive)
        .sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")))
        .map((task) => `<option value="${escapeHtml(task.id)}">${escapeHtml(`${task.title}｜${task.assignee || "未分配"}`)}</option>`)
        .join("");
      return `<div class="template-input"><label>关联已有任务</label><select data-part="linkedTaskId"><option value="">仅关联时选择</option>${options}</select></div>`;
    }

    function renderStoreMatrix(role) {
      const schema = reportSchema(role);
      const headings = schema.columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("");
      const rows = REPORT_STORES.map((store) => {
        const cells = schema.columns.map((column) => {
          if (column.type === "status") {
            return `<td><select data-report-key="${column.key}" aria-label="${escapeHtml(store.name)} ${escapeHtml(column.label)}">${column.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option || "未填写")}</option>`).join("")}</select></td>`;
          }
            return `<td><input data-report-key="${column.key}" type="number" min="0" step="${column.step || (column.money || column.decimal ? "0.01" : "1")}" inputmode="decimal" aria-label="${escapeHtml(store.name)} ${escapeHtml(column.label)}" /></td>`;
        }).join("");
        return `<tr class="report-store-row" data-store="${escapeHtml(store.name)}"><td>${escapeHtml(store.name)}<span class="store-group">${store.group}</span></td>${cells}</tr>`;
      }).join("");
      return `
        <div class="report-template-head">
          <div>
            <h3>${escapeHtml(role)}每日数据</h3>
            <p>每家店一行，只填写本人负责店铺；没有自然数据的字段留空。</p>
          </div>
          <span class="badge blue">六店固定模板</span>
        </div>
        <div class="report-matrix">
          <table>
            <thead><tr><th>店铺</th>${headings}</tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    }

    function renderReportRoleFields(role) {
      const container = document.getElementById("reportRoleFields");
      if (!container) return;
      if (role === "店群运营") {
        container.innerHTML = renderStoreMatrix(role);
        return;
      }

      if (role === "BD") {
        container.innerHTML = `
          <div class="report-template-head">
            <div><h3>BD日报 · 今日结果</h3><p>负责多家店铺时可增加行，点击下拉直接选择店铺。</p></div>
            <span class="badge blue">个人提交</span>
          </div>
          <section class="template-section" data-repeat-section="responsibleStores" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>负责店铺与联盟消息</b><small>一行对应一家店，新增行会同时新增完整消息字段</small></span>${repeatControls("responsibleStores")}</div>
            <div class="template-row compact" data-role-row="responsibleStores"><span class="template-row-number">1</span>${rowField("店铺", "store", { type: "select", options: storeOptions() })}${rowField("联盟消息", "messageStatus", { type: "select", options: ["", "已处理完成", "有积压"] })}${rowField("积压原因", "backlogReason", { placeholder: "有积压时填写" })}</div>
          </section>
          <section class="template-section" data-repeat-section="samples" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>产品寄样</b><small>按实际数量增减行数</small></span>${repeatControls("samples")}</div>
            ${[1, 2].map((index) => `<div class="template-row" data-role-row="samples"><span class="template-row-number">${index}</span>${rowField("店铺", "store", { type: "select", options: storeOptions() })}${rowField("产品", "product")}${rowField("寄样数量", "sent", { type: "number" })}</div>`).join("")}
          </section>
          <section class="template-section" data-repeat-section="followups" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>重点达人跟进</b><small>写事项和明确结果</small></span>${repeatControls("followups")}</div>
            ${[1, 2].map((index) => `<div class="template-row two" data-role-row="followups"><span class="template-row-number">${index}</span>${rowField("事项", "item")}${rowField("结果", "result")}</div>`).join("")}
          </section>
          <section class="template-section">
            <div class="template-section-head"><b>老达人复投</b><small>记录联系结果</small></div>
            <div class="role-result-grid">
              ${templateField("联系人数", "oldCreatorContacts", { type: "number" })}
              ${templateField("确认合作人数", "confirmedReinvest", { type: "number" })}
              ${templateField("当前结果", "reinvestResult", { placeholder: "寄样、待回复、确认拍摄等" })}
              ${templateField("其他重要结果", "otherResult", { placeholder: "无则留空" })}
            </div>
          </section>
        `;
        return;
      }

      if (role === "其他") {
        container.innerHTML = `
          <div class="report-template-head">
            <div><h3>其他日报 · 今日结果</h3><p>适用于新人、培训期或跨岗位协作；记录可核对的产出和需要支持的问题。</p></div>
            <span class="badge blue">个人提交</span>
          </div>
          <section class="template-section">
            <div class="template-section-head"><b>结构化结果</b><small>数量填实际完成结果，无则填 0</small></div>
            <div class="role-result-grid">
              ${templateField("完成事项（项）", "completedItems", { type: "number" })}
              ${templateField("学习 / 培训（项）", "trainingItems", { type: "number" })}
              ${templateField("SOP / 文档更新（项）", "documentsUpdated", { type: "number" })}
              ${templateField("提出问题（个）", "questionsRaised", { type: "number" })}
              ${templateField("已解决问题（个）", "questionsResolved", { type: "number" })}
            </div>
          </section>
          <section class="template-section">
            <div class="template-section-head"><b>工作说明</b><small>写结果、协助需求和下一步</small></div>
            <div class="role-result-grid">
              ${templateField("今日总结", "workSummary", { placeholder: "完成或学会了什么" })}
              ${templateField("需要协助", "helpNeeded", { placeholder: "无则填写无" })}
              ${templateField("明日计划", "tomorrowPlan", { placeholder: "下一步具体动作" })}
            </div>
          </section>
        `;
        return;
      }

      if (role === "售后组") {
        container.innerHTML = `
          <div class="report-template-head">
            <div><h3>售后组日报 · 今日结果</h3><p>售后岗位合并提交；按六店填写 SPS 总分、三个维度与退货 / 退款，再填其他售后合计。</p></div>
            <span class="badge blue">团队汇总</span>
          </div>
          <section class="template-section">
            <div class="template-section-head"><b>六店 SPS、退货 / 退款</b><small>SPS 填总分和三个维度；自动周报只显示总分</small></div>
            <div class="report-matrix">
              <table>
                <thead><tr><th>店铺</th><th>SPS 总分</th><th>商品满意度</th><th>履约与物流</th><th>客户服务</th><th>退货 / 退款（单）</th><th>退货 / 退款金额（$）</th></tr></thead>
                <tbody>
                  ${REPORT_STORES.map((store) => `
                    <tr class="report-store-row" data-store="${escapeHtml(store.name)}">
                      <td>${escapeHtml(store.name)}<span class="store-group">${store.group}</span></td>
                      <td><input data-report-key="sps" type="number" min="0" max="5" step="0.01" inputmode="decimal" aria-label="${escapeHtml(store.name)} SPS 总分" /></td>
                      <td><input data-report-key="spsProductSatisfaction" type="number" min="0" max="5" step="0.01" inputmode="decimal" aria-label="${escapeHtml(store.name)} 商品满意度" /></td>
                      <td><input data-report-key="spsFulfillmentLogistics" type="number" min="0" max="5" step="0.01" inputmode="decimal" aria-label="${escapeHtml(store.name)} 履约与物流" /></td>
                      <td><input data-report-key="spsCustomerService" type="number" min="0" max="5" step="0.01" inputmode="decimal" aria-label="${escapeHtml(store.name)} 客户服务" /></td>
                      <td><input data-report-key="returns" type="number" min="0" step="1" inputmode="numeric" aria-label="${escapeHtml(store.name)} 退货 / 退款数量" /></td>
                      <td><input data-report-key="returnAmount" type="number" min="0" step="0.01" inputmode="decimal" aria-label="${escapeHtml(store.name)} 退货 / 退款金额" /></td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          </section>
          <section class="template-section">
            <div class="template-section-head"><b>其他售后合计</b><small>以下字段只填一次，不与上方数据重复</small></div>
            <div class="role-result-grid">
              ${templateField("咨询（单）", "consultations", { type: "number" })}
              ${templateField("未及时回复（单）", "lateReplies", { type: "number" })}
              ${templateField("新增差评（条）", "badReviews", { type: "number" })}
              ${templateField("删除或修改（条）", "reviewsResolved", { type: "number" })}
              ${templateField("申诉（条）", "appeals", { type: "number" })}
              ${templateField("申诉成功（条）", "appealSuccess", { type: "number" })}
              ${templateField("申诉处理中（条）", "appealProcessing", { type: "number" })}
              ${templateField("索赔（单）", "claims", { type: "number" })}
              ${templateField("索赔未完成（单）", "unfinished", { type: "number" })}
              ${templateField("高风险订单（单）", "highRisk", { type: "number" })}
            </div>
          </section>
        `;
        return;
      }

      container.innerHTML = `
        <div class="report-template-head">
          <div><h3>店铺维护日报 · 今日结果</h3><p>负责六店，操作完成后仍需以店铺前台状态为准。</p></div>
          <span class="badge blue">个人提交</span>
        </div>
        <section class="template-section" data-repeat-section="plugin" data-min-rows="1">
          <div class="template-section-head"><span class="template-section-title"><b>插件建联</b><small>记录当天主要执行项</small></span>${repeatControls("plugin")}</div>
          <div class="template-row" data-role-row="plugin"><span class="template-row-number">1</span>${rowField("店铺", "store", { type: "select", options: storeOptions(true) })}${rowField("产品", "product")}${rowField("建联", "outreach", { type: "number" })}${rowField("运行状态", "status", { type: "select", options: ["", "正常", "异常"] })}</div>
        </section>
        <section class="template-section">
          <div class="template-section-head"><b>链接、库存、价格与活动</b><small>按完成结果填写</small></div>
          <div class="role-result-grid">
            ${templateField("新上架（条）", "linksAdded", { type: "number" })}
            ${templateField("修改链接（条）", "linksUpdated", { type: "number" })}
            ${templateField("恢复链接（条）", "linksRestored", { type: "number" })}
            ${templateField("待处理链接（条）", "linksPending", { type: "number" })}
            ${templateField("库存调整（项）", "stockChanges", { type: "number" })}
            ${templateField("价格执行（项）", "priceChanges", { type: "number" })}
            ${templateField("库存/价格风险", "stockPriceRisk", { placeholder: "无则留空" })}
            ${templateField("报名/续期（项）", "campaignApplied", { type: "number" })}
            ${templateField("活动成功（项）", "campaignSuccess", { type: "number" })}
            ${templateField("活动待处理（项）", "campaignPending", { type: "number" })}
          </div>
        </section>
        <section class="template-section" data-repeat-section="inspectionIssues" data-min-rows="1">
          <div class="template-section-head"><span class="template-section-title"><b>店铺违规与异常</b><small>仅记录实际发现的问题，无异常可留空</small></span>${repeatControls("inspectionIssues")}</div>
          <div class="template-row" data-role-row="inspectionIssues"><span class="template-row-number">1</span>${rowField("店铺", "store", { type: "select", options: storeOptions() })}${rowField("违规 / 异常", "issue")}${rowField("原因", "reason")}${rowField("处理结果", "result")}</div>
        </section>
      `;
    }

    function renderReportClosureFields(role) {
      const container = document.getElementById("reportClosureFields");
      if (!container) return;
      const objectLabel = role === "BD" ? "店铺 / 达人 / 链接" : role === "店铺维护" ? "店铺 / 产品 / 链接" : role === "售后组" ? "店铺 / 链接" : role === "其他" ? "事项 / 流程 / 协作" : "店铺 / 指标";
      const issueLabel = role === "售后组" ? "异常数据" : "问题";
      const approvalTitle = "需要配合解决";
      container.innerHTML = `
        <details class="report-workflow-block" data-workflow-block="anomaly">
          <summary><span class="workflow-summary-copy"><b>风险与异常</b><small>没有异常直接跳过；每条异常明确选择处理方式</small></span></summary>
          <section class="template-section" data-repeat-section="anomaly" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>核心异常</b><small>中高风险必须生成任务或关联已有任务</small></span>${repeatControls("anomaly")}</div>
            <div class="template-row seven" data-closure-row="anomaly">
              <input type="hidden" data-part="id" /><input type="hidden" data-part="taskId" />
              <span class="template-row-number">1</span>
              ${rowField(objectLabel, "object")}
              ${rowField("问题归类", "category", { type: "select", options: ["", "流量", "转化", "广告", "达人", "商品", "售后", "履约", "店铺健康", "库存价格", "合规", "系统流程", "协作", "其他"] })}
              ${rowField(issueLabel, "issue")}
              ${rowField("原因判断", "reason")}
              ${rowField("风险", "risk", { type: "select", options: ["", "高", "中", "低"] })}
              ${rowField("处理方式", "handling", { type: "select", options: ["", "生成跟进任务", "关联已有任务", "仅记录观察"] })}
              ${openTaskLinkField()}
            </div>
          </section>
        </details>
        <section class="template-section" data-repeat-section="review" data-min-rows="1">
          <div class="template-section-head"><span class="template-section-title"><b>到期任务复查</b><small>只允许从系统待复查任务带入，手工文字不能直接关闭任务</small></span></div>
          <div class="template-row compact review-linked-row" data-closure-row="review">
            <input type="hidden" data-part="taskId" />
            <span class="template-row-number">1</span>
            ${rowField(role === "BD" ? "达人 / 事项" : "店铺 / 事项", "item")}
            ${rowField("复查结果 / 数据证据", "result")}
            ${rowField("状态", "status", { type: "select", options: ["", "关闭", "继续", "升级"] })}
          </div>
          <p class="template-note">没有到期任务时无需填写；任务提交执行结果和证据后，系统会自动出现在上方待复查区。</p>
        </section>
        <details class="report-workflow-block" data-workflow-block="task">
          <summary><span class="workflow-summary-copy"><b>明日跟进</b><small>记录今天结束后仍需继续推进的事项，保存后同步任务中心</small></span></summary>
          <section class="template-section" data-repeat-section="task" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>明日跟进事项</b><small>一行填写一件需要继续推进的具体事项</small></span>${repeatControls("task")}</div>
            <div class="template-row five" data-closure-row="task">
              <input type="hidden" data-part="id" />
              <span class="template-row-number">1</span>
              ${rowField("明日跟进内容", "task")}
              ${rowField("负责人", "owner")}
              ${rowField("计划完成时间", "due", { type: "datetime-local" })}
              ${rowField("预期结果 / 完成标准", "acceptance")}
              ${rowField("结果检查时间", "reviewAt", { type: "datetime-local" })}
            </div>
          </section>
        </details>
        <details class="report-workflow-block" data-workflow-block="approval">
          <summary><span class="workflow-summary-copy"><b>${approvalTitle}</b><small>需要其他岗位、负责人或管理层协同时填写，保存后同步任务中心</small></span></summary>
          <section class="template-section" data-repeat-section="approval" data-min-rows="1">
            <div class="template-section-head"><span class="template-section-title"><b>${approvalTitle}</b><small>写清卡点、需要谁配合以及希望何时解决</small></span>${repeatControls("approval")}</div>
            <div class="template-row" data-closure-row="approval">
              <input type="hidden" data-part="id" /><input type="hidden" data-part="taskId" /><input type="hidden" data-part="result" />
              <span class="template-row-number">1</span>
              ${rowField("需要解决的事项", "item")}
              ${rowField("当前卡点 / 建议处理方式", "suggestion")}
              ${rowField("需要谁配合", "owner")}
              ${rowField("最晚解决时间", "deadline", { type: "datetime-local" })}
            </div>
          </section>
        </details>
      `;
      container.querySelectorAll('[data-closure-row="review"] [data-part="item"]').forEach((input) => input.readOnly = true);
    }

    function repeatSectionRows(section, name) {
      return [...section.querySelectorAll(`[data-role-row="${name}"], [data-closure-row="${name}"]`)];
    }

    function renumberRepeatSection(section, name) {
      repeatSectionRows(section, name).forEach((row, index) => {
        const number = row.querySelector(".template-row-number");
        if (number) number.textContent = index + 1;
      });
    }

    function clearRepeatedRow(row) {
      row.classList.remove("is-linked");
      row.querySelectorAll("input, select, textarea").forEach((input) => {
        if (input.tagName === "SELECT") input.selectedIndex = 0;
        else input.value = "";
      });
    }

    function addRepeatedRow(name, section = null) {
      const target = section || document.querySelector(`[data-repeat-section="${name}"]`);
      if (!target) return null;
      const rows = repeatSectionRows(target, name);
      if (!rows.length) return null;
      const row = rows[rows.length - 1].cloneNode(true);
      clearRepeatedRow(row);
      target.appendChild(row);
      renumberRepeatSection(target, name);
      return row;
    }

    function removeRepeatedRow(name, section = null) {
      const target = section || document.querySelector(`[data-repeat-section="${name}"]`);
      if (!target) return;
      const rows = repeatSectionRows(target, name);
      const minimum = Number(target.dataset.minRows || 1);
      if (rows.length <= minimum) {
        showToast(`至少保留 ${minimum} 行`);
        return;
      }
      rows[rows.length - 1].remove();
      renumberRepeatSection(target, name);
    }

    function reportTaskMatchesContext(task, role, author) {
      if (task.sourceApproval) {
        if (!author) return false;
        const assigneeMatch = normalizedReportAuthor(task.assignee) === author;
        const requesterMatch = normalizedReportAuthor(task.requestedBy) === author;
        return assigneeMatch || requesterMatch;
      }
      if (task.source !== `${role}日报`) return false;
      if (!author) return TEAM_SUMMARY_REPORT_ROLES.has(role);
      if (TEAM_SUMMARY_REPORT_ROLES.has(role)) return true;
      return normalizedReportAuthor(task.assignee) === author;
    }

    function pendingReviewTasks() {
      const form = document.getElementById("reportForm");
      const role = form?.elements.role?.value || "售后组";
      const author = String(form?.elements.author?.value || "").trim().toLowerCase();
      const reportDate = form?.elements.date?.value || today;
      return (state.tasks || []).filter((task) => {
        if (taskIsTerminal(task)) return false;
        if (task.status !== "待复盘" || !task.result || !task.evidence) return false;
        if (task.reviewAt && String(task.reviewAt).slice(0, 10) > reportDate) return false;
        return reportTaskMatchesContext(task, role, author);
      });
    }

    function dueReviewBlockedTasks() {
      const form = document.getElementById("reportForm");
      const role = form?.elements.role?.value || "售后组";
      const author = normalizedReportAuthor(form?.elements.author?.value || "");
      const reportDate = form?.elements.date?.value || today;
      const readyIds = new Set(pendingReviewTasks().map((task) => task.id));
      return (state.tasks || []).filter((task) => {
        if (taskIsTerminal(task) || readyIds.has(task.id)) return false;
        if (!reportTaskMatchesContext(task, role, author)) return false;
        const dueDate = String(task.due || "").slice(0, 10);
        const reviewDate = String(task.reviewAt || "").slice(0, 10);
        const hasReachedDate = (dueDate && dueDate <= reportDate) || (reviewDate && reviewDate <= reportDate);
        return Boolean(hasReachedDate);
      });
    }

    function renderPendingReviewQueue() {
      const target = document.getElementById("pendingReviewQueue");
      if (!target) return;
      const tasks = pendingReviewTasks();
      const blockedTasks = dueReviewBlockedTasks();
      const selectedTaskIds = new Set([...document.querySelectorAll('#reportClosureFields [data-closure-row="review"] [data-part="taskId"]')]
        .map((input) => input.value)
        .filter(Boolean));
      target.hidden = !tasks.length && !blockedTasks.length;
      if (!tasks.length && !blockedTasks.length) {
        target.innerHTML = "";
        return;
      }
      target.innerHTML = `
        <div class="review-queue-head">
          <div><b>到期任务复查</b><span>可复查任务直接带入；未提交结果的到期任务先返回任务中心处理。</span></div>
          <span>${tasks.length} 项可复查 · ${blockedTasks.length} 项待回传</span>
        </div>
        ${tasks.map((task) => `
          <div class="review-queue-item">
            <div>
              <b>${escapeHtml(task.title)}</b>
              <small>${escapeHtml(task.assignee || "未分配")}｜${escapeHtml(task.result || "尚未提交执行结果")}｜复查 ${task.reviewAt ? escapeHtml(formatDateTime(task.reviewAt)) : "未设置"}</small>
            </div>
            <button class="row-control" data-bring-review="${task.id}" type="button" ${selectedTaskIds.has(task.id) ? "disabled" : ""}>${selectedTaskIds.has(task.id) ? "已带入" : "带入复查"}</button>
          </div>
        `).join("")}
        ${blockedTasks.map((task) => `
          <div class="review-queue-item blocked">
            <div>
              <b>${escapeHtml(task.title)}</b>
              <small>${escapeHtml(task.assignee || "未分配")}｜${task.status === "待处理" ? "尚未开始" : "尚未提交完整结果与证据"}｜到期 ${task.due ? escapeHtml(formatDateTime(task.due)) : "未设置"}</small>
            </div>
            <button class="row-control" data-view-task="${task.id}" type="button">去任务中心处理</button>
          </div>
        `).join("")}
      `;
    }

    function bringTaskIntoReview(taskId) {
      const task = (state.tasks || []).find((item) => item.id === taskId);
      const section = document.querySelector('[data-repeat-section="review"]');
      if (!task || !section) return;
      if (repeatSectionRows(section, "review").some((row) => row.querySelector('[data-part="taskId"]')?.value === task.id)) {
        showToast("该任务已经带入复查");
        return;
      }
      let row = repeatSectionRows(section, "review").find((item) => !item.querySelector('[data-part="item"]')?.value);
      if (!row) row = addRepeatedRow("review", section);
      if (!row) return;
      row.querySelector('[data-part="taskId"]').value = task.id;
      row.querySelector('[data-part="item"]').value = task.title;
      row.querySelector('[data-part="result"]').value = "";
      row.querySelector('[data-part="status"]').value = "";
      row.classList.add("is-linked");
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      renderPendingReviewQueue();
      showToast("已带入昨日复查");
    }

    function collectMatrixMetrics() {
      return [...document.querySelectorAll("#reportRoleFields .report-store-row")].map((row) => {
        const raw = {};
        let hasValue = false;
        row.querySelectorAll("[data-report-key]").forEach((input) => {
          const value = input.value;
          if (value !== "") hasValue = true;
          raw[input.dataset.reportKey] = input.type === "number" ? (value === "" ? null : Number(value)) : value;
        });
        return hasValue ? { store: row.dataset.store, values: raw } : null;
      }).filter(Boolean);
    }

    function roleFieldValue(key) {
      const input = document.querySelector(`#reportRoleFields [data-role-field="${key}"]`);
      if (!input || input.value === "") return "";
      return input.type === "number" ? Number(input.value) : input.value;
    }

    function roleRows(name) {
      return [...document.querySelectorAll(`#reportRoleFields [data-role-row="${name}"]`)].map((row) => {
        const result = {};
        let active = false;
        row.querySelectorAll("[data-part]").forEach((input) => {
          const value = input.value;
          if (value !== "") active = true;
          result[input.dataset.part] = input.type === "number" ? (value === "" ? "" : Number(value)) : value;
        });
        return active ? result : null;
      }).filter(Boolean);
    }

    function collectRoleData(role) {
      const extraCompletedWork = String(document.querySelector('#reportForm [name="extraCompletedWork"]')?.value || "").trim();
      if (role === "店群运营") return { matrix: collectMatrixMetrics(), extraCompletedWork };
      if (role === "其他") {
        return {
          completedItems: roleFieldValue("completedItems"),
          trainingItems: roleFieldValue("trainingItems"),
          documentsUpdated: roleFieldValue("documentsUpdated"),
          questionsRaised: roleFieldValue("questionsRaised"),
          questionsResolved: roleFieldValue("questionsResolved"),
          workSummary: roleFieldValue("workSummary"),
          helpNeeded: roleFieldValue("helpNeeded"),
          tomorrowPlan: roleFieldValue("tomorrowPlan"),
          extraCompletedWork
        };
      }
      if (role === "BD") {
        const responsibleStoreRows = roleRows("responsibleStores");
        const responsibleStores = [...new Set(responsibleStoreRows.map((row) => row.store).filter(Boolean))];
        const backlogRows = responsibleStoreRows.filter((row) => row.messageStatus === "有积压");
        return {
          responsibleStores: responsibleStores.join("、"),
          responsibleStoreRows,
          messageStatus: backlogRows.length ? "有积压" : responsibleStoreRows.some((row) => row.messageStatus === "已处理完成") ? "已处理完成" : "",
          backlogReason: backlogRows.map((row) => `${row.store || "未选店铺"}：${row.backlogReason || "未填写原因"}`).join("；"),
          samples: roleRows("samples"),
          followups: roleRows("followups"),
          oldCreatorContacts: roleFieldValue("oldCreatorContacts"),
          confirmedReinvest: roleFieldValue("confirmedReinvest"),
          reinvestResult: roleFieldValue("reinvestResult"),
          otherResult: roleFieldValue("otherResult"),
          extraCompletedWork
        };
      }
      if (role === "售后组") {
        const storeMetrics = collectMatrixMetrics();
        const storeKeys = new Set(["sps", "returns", "returnAmount"]);
        const summary = Object.fromEntries(reportSchema(role).columns
          .filter((column) => !storeKeys.has(column.key))
          .map((column) => [column.key, roleFieldValue(column.key)]));
        return { matrix: storeMetrics, summary, extraCompletedWork };
      }
      const plugins = roleRows("plugin");
      const inspectionIssues = roleRows("inspectionIssues");
      return {
        plugin: plugins[0] || {},
        plugins,
        linksAdded: roleFieldValue("linksAdded"),
        linksUpdated: roleFieldValue("linksUpdated"),
        linksRestored: roleFieldValue("linksRestored"),
        linksPending: roleFieldValue("linksPending"),
        stockChanges: roleFieldValue("stockChanges"),
        priceChanges: roleFieldValue("priceChanges"),
        stockPriceRisk: roleFieldValue("stockPriceRisk"),
        campaignApplied: roleFieldValue("campaignApplied"),
        campaignSuccess: roleFieldValue("campaignSuccess"),
        campaignPending: roleFieldValue("campaignPending"),
        inspectionIssues,
        extraCompletedWork
      };
    }

    function roleDataHasValue(value) {
      if (Array.isArray(value)) return value.some(roleDataHasValue);
      if (value && typeof value === "object") return Object.values(value).some(roleDataHasValue);
      return value !== "" && value !== null && value !== undefined;
    }

    function roleDataMetrics(role, data) {
      if (role === "店群运营") return data.matrix || [];
      if (role === "其他") {
        return [{
          store: "个人汇总",
          values: {
            completedItems: data.completedItems,
            trainingItems: data.trainingItems,
            documentsUpdated: data.documentsUpdated,
            questionsRaised: data.questionsRaised,
            questionsResolved: data.questionsResolved
          }
        }];
      }
      if (role === "售后组") {
        const summaryHasValue = Object.values(data.summary || {}).some((value) => value !== "" && value !== null && value !== undefined);
        return [
          ...(data.matrix || []),
          ...(summaryHasValue ? [{ store: "六店汇总", values: data.summary }] : [])
        ];
      }
      if (role === "店铺维护") {
        const pluginStatus = (data.plugins || []).some((item) => item.status === "异常")
          ? "异常"
          : (data.plugins || []).some((item) => item.status === "正常") ? "正常" : "";
        return [{
          store: "六店汇总",
          values: {
            pluginStatus,
            linksAdded: data.linksAdded,
            linksUpdated: data.linksUpdated,
            linksRestored: data.linksRestored,
            linksPending: data.linksPending,
            stockChanges: data.stockChanges,
            priceChanges: data.priceChanges,
            campaignApplied: data.campaignApplied,
            campaignSuccess: data.campaignSuccess,
            campaignPending: data.campaignPending,
            shopsChecked: data.shopsChecked,
            violations: (data.inspectionIssues || []).length || data.violations,
            appeals: data.appeals,
            appealSuccess: data.appealSuccess
          }
        }];
      }
      const byStore = {};
      (data.responsibleStoreRows || []).forEach((row) => {
        if (!row.store) return;
        byStore[row.store] ||= { samplesSent: 0 };
        byStore[row.store].messageStatus = row.messageStatus || "";
      });
      (data.samples || []).forEach((row) => {
        const store = row.store || "个人汇总";
        byStore[store] ||= { samplesSent: 0 };
        byStore[store].samplesSent += Number(row.sent || 0);
      });
      return [
        ...Object.entries(byStore).map(([store, values]) => ({ store, values })),
        {
          store: "个人汇总",
          values: {
            messageStatus: (data.responsibleStoreRows || []).length ? "" : data.messageStatus,
            oldCreatorContacts: data.oldCreatorContacts,
            confirmedReinvest: data.confirmedReinvest
          }
        }
      ].filter((row) => Object.values(row.values).some((value) => value !== "" && value !== null && value !== undefined));
    }

    function appendExtraCompletedResult(baseText, data) {
      const extra = String(data?.extraCompletedWork || "").trim();
      return extra ? [baseText, `其他完成事项：${extra}`].filter(Boolean).join("\n") : baseText;
    }

    function roleDataResults(role, data) {
      if (role === "店群运营") return appendExtraCompletedResult("", data);
      if (role === "其他") {
        return appendExtraCompletedResult([
          `1. 完成事项：${data.completedItems || 0}项｜学习 / 培训：${data.trainingItems || 0}项｜SOP / 文档更新：${data.documentsUpdated || 0}项`,
          `2. 问题：提出${data.questionsRaised || 0}个｜已解决${data.questionsResolved || 0}个`,
          `3. 今日总结：${data.workSummary || "无"}`,
          `4. 需要协助：${data.helpNeeded || "无"}`,
          `5. 明日计划：${data.tomorrowPlan || "无"}`
        ].join("\n"), data);
      }
      if (role === "BD") {
        const messageText = (data.responsibleStoreRows || []).map((row) =>
          `${row.store || "未选店铺"}｜${row.messageStatus || "未填写"}${row.backlogReason ? `｜原因：${row.backlogReason}` : ""}`
        ).join("；") || `${data.messageStatus || "未填写"}${data.backlogReason ? `，原因：${data.backlogReason}` : ""}`;
        const sampleText = (data.samples || []).map((row) => `${row.store || "未选店铺"}｜产品${row.product || "-"}｜寄样${row.sent || 0}个`).join("；") || "无";
        const followupText = (data.followups || []).map((row) => `${row.item || "-"}｜${row.result || "-"}`).join("；") || "无";
        return appendExtraCompletedResult([
          `1. 联盟消息：${messageText}`,
          `2. 产品寄样：${sampleText}`,
          `3. 重点达人跟进：${followupText}`,
          `4. 老达人复投：联系${data.oldCreatorContacts || 0}人｜确认合作${data.confirmedReinvest || 0}人｜当前结果${data.reinvestResult || "无"}`,
          `5. 其他重要结果：${data.otherResult || "无"}`
        ].join("\n"), data);
      }
      if (role === "售后组") {
        const storeLines = (data.matrix || []).map((row) => {
          const values = row.values || {};
          const spsTotal = values.sps === null || values.sps === undefined || values.sps === "" ? "-" : values.sps;
          const dimensions = [
            ["商品满意度", values.spsProductSatisfaction],
            ["履约与物流", values.spsFulfillmentLogistics],
            ["客户服务", values.spsCustomerService]
          ].map(([label, value]) => `${label} ${value === null || value === undefined || value === "" ? "-" : value}`).join("｜");
          return `${row.store}：SPS 总分 ${spsTotal}｜${dimensions}｜退货 / 退款 ${values.returns || 0}单 / ${money(values.returnAmount || 0)}`;
        });
        const summary = data.summary || {};
        const totalReturns = (data.matrix || []).reduce((sum, row) => sum + Number(row.values?.returns || 0), 0);
        const totalReturnAmount = (data.matrix || []).reduce((sum, row) => sum + Number(row.values?.returnAmount || 0), 0);
        return appendExtraCompletedResult([
          `1. 六店SPS与退货 / 退款：${storeLines.join("；") || "未填写"}`,
          `2. 退货 / 退款合计：${totalReturns}单 / ${money(totalReturnAmount)}`,
          `3. 咨询：${summary.consultations || 0}单｜未及时回复：${summary.lateReplies || 0}单`,
          `4. 新增差评：${summary.badReviews || 0}条｜删除或修改：${summary.reviewsResolved || 0}条`,
          `5. 申诉：${summary.appeals || 0}条｜成功：${summary.appealSuccess || 0}条｜处理中：${summary.appealProcessing || 0}条`,
          `6. 索赔：${summary.claims ?? summary.compensation ?? 0}单｜未完成：${summary.unfinished || 0}单`,
          `7. 高风险订单：${summary.highRisk || 0}单`
        ].join("\n"), data);
      }
      const pluginText = (data.plugins || [data.plugin]).filter((item) => item && Object.keys(item).length)
        .map((item) => `店铺${item.store || "-"}｜产品${item.product || "-"}｜建联${item.outreach || 0}｜运行${item.status || "未填写"}`)
        .join("；") || "无";
      const inspectionText = (data.inspectionIssues || []).map((row) =>
        `${row.store || "未选店铺"}｜${row.issue || "未填写异常"}｜原因：${row.reason || "未填写"}｜处理：${row.result || "待处理"}`
      ).join("；") || "无异常";
      return appendExtraCompletedResult([
        `1. 插件建联：${pluginText}`,
        `2. 链接维护：新上架${data.linksAdded || 0}条｜修改${data.linksUpdated || 0}条｜恢复${data.linksRestored || 0}条｜待处理${data.linksPending || 0}条`,
        `3. 库存与价格：库存调整${data.stockChanges || 0}项｜价格执行${data.priceChanges || 0}项｜风险${data.stockPriceRisk || "无"}`,
        `4. 活动执行：报名/续期${data.campaignApplied || 0}项｜成功${data.campaignSuccess || 0}项｜待处理${data.campaignPending || 0}项`,
        `5. 店铺违规与异常：${inspectionText}`
      ].join("\n"), data);
    }

    function closureRows(name) {
      return [...document.querySelectorAll(`#reportClosureFields [data-closure-row="${name}"]`)].map((row) => {
        const parts = {};
        let active = false;
        row.querySelectorAll("[data-part]").forEach((input) => {
          if (input.value !== "" && !["id", "taskId"].includes(input.dataset.part)) active = true;
          parts[input.dataset.part] = input.value;
        });
        return active ? parts : null;
      }).filter(Boolean);
    }

    function collectClosureData(role) {
      const anomalyItems = closureRows("anomaly").map((row) => ({
        id: row.id || crypto.randomUUID(),
        taskId: row.taskId || (row.handling === "生成跟进任务" ? crypto.randomUUID() : ""),
        object: row.object || "",
        category: row.category || "",
        issue: row.issue || "",
        impact: row.impact || "",
        reason: row.reason || "",
        risk: row.risk || "",
        handling: row.handling || "",
        linkedTaskId: row.linkedTaskId || ""
      }));
      const reviewItems = closureRows("review").map((row) => ({
        taskId: row.taskId || "",
        item: row.item || "",
        result: row.result || "",
        status: row.status || ""
      }));
      const taskItems = closureRows("task").map((row) => ({
        id: row.id || crypto.randomUUID(),
        task: row.task || "",
        owner: row.owner || "",
        due: row.due || "",
        acceptance: row.acceptance || "",
        reviewAt: row.reviewAt || ""
      }));
      const approvalItems = closureRows("approval").filter((row) => {
        const meaningful = [row.item, row.suggestion, row.deadline, row.result, row.owner]
          .map((value) => String(value || "").trim())
          .filter((value) => value && !/^(无|暂无|没有|不需要|无需)$/i.test(value));
        return meaningful.length > 0;
      }).map((row) => ({
        id: row.id || crypto.randomUUID(),
        taskId: row.taskId || crypto.randomUUID(),
        item: row.item || "",
        suggestion: row.suggestion || "",
        deadline: row.deadline || "",
        result: row.result || "",
        owner: row.owner || ""
      }));
      const anomalies = anomalyItems.map((row) => {
        const handling = row.handling === "关联已有任务"
          ? `关联任务：${(state.tasks || []).find((task) => task.id === row.linkedTaskId)?.title || "未选择"}`
          : row.handling;
        return role === "店铺维护"
          ? [row.object, row.category, row.issue, row.impact, row.reason, row.risk, handling].filter(Boolean).join("｜")
          : [row.object, row.category, row.issue, row.reason, row.risk, handling].filter(Boolean).join("｜");
      });
      const reviews = reviewItems.map((row) => [row.item, row.result, row.status].join("｜"));
      const tasksText = taskItems.map((row) => [row.task, row.owner, row.due, row.acceptance, row.reviewAt].join("｜"));
      const approvals = approvalItems.map((row) => [
        row.item,
        row.owner ? `配合：${row.owner}` : "",
        row.suggestion ? `建议：${row.suggestion}` : "",
        row.deadline ? `最晚：${row.deadline}` : "",
        row.result ? `进展：${row.result}` : ""
      ].filter(Boolean).join("｜"));
      return {
        anomalies: anomalies.join("\n"),
        reviews: reviews.join("\n"),
        tasksText: tasksText.join("\n"),
        approvals: approvals.join("\n"),
        items: {
          anomalies: anomalyItems,
          reviews: reviewItems,
          tasks: taskItems,
          approvals: approvalItems
        }
      };
    }

    function reportLines(value) {
      return String(value || "").split(/\n+/).map((line) => line.trim()).filter((line) => line && line !== "无");
    }

    function meaningfulDecisionValue(value) {
      const text = String(value || "").trim();
      return Boolean(text && !/^(无|暂无|没有|不需要|无需|未填写)$/i.test(text));
    }

    function meaningfulApprovalItem(item) {
      return Boolean(item && meaningfulDecisionValue(item.item)
        && [item.suggestion, item.result, item.owner, item.deadline].some(meaningfulDecisionValue));
    }

    function meaningfulApprovalLine(line) {
      const [item, suggestion, resultOrDeadline, owner] = String(line || "").split(/[｜|]/).map((part) => part.trim());
      return meaningfulDecisionValue(item) && [suggestion, resultOrDeadline, owner].some(meaningfulDecisionValue);
    }

    function reportMetricValue(column, value) {
      if (value === null || value === undefined || value === "") return "";
      if (column.money) return money(Number(value) || 0);
      if (column.type === "status") return String(value);
      return `${num(Number(value) || 0)}${column.unit || ""}`;
    }

    function reportResultsText(report) {
      if (report.results) return report.results;
      if (!Array.isArray(report.roleMetrics) || !report.roleMetrics.length) return "无";
      const schema = reportSchema(report.role);
      return report.roleMetrics.map((row) => {
        const details = schema.columns.map((column) => {
          const value = row.values?.[column.key];
          if (value === null || value === undefined || value === "") return "";
          return `${column.label} ${reportMetricValue(column, value)}`;
        }).filter(Boolean);
        return details.length ? `${row.store}：${details.join("｜")}` : "";
      }).filter(Boolean).join("\n") || "无";
    }

    function renderReportMetricTable(report) {
      if (!Array.isArray(report.roleMetrics) || !report.roleMetrics.length) return "";
      const schema = reportSchema(report.role);
      const columns = schema.columns.filter((column) => report.roleMetrics.some((row) => {
        const value = row.values?.[column.key];
        return value !== null && value !== undefined && value !== "";
      }));
      if (!columns.length) return "";
      return `
        <div class="report-matrix">
          <table>
            <thead><tr><th>店铺</th>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
            <tbody>${report.roleMetrics.map((row) => `<tr><td>${escapeHtml(row.store)}</td>${columns.map((column) => `<td>${escapeHtml(reportMetricValue(column, row.values?.[column.key]) || "-")}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      `;
    }

    function reportTaskParts(line) {
      const parts = String(line).split(/[｜|]/).map((item) => item.trim());
      return {
        title: parts[0] || "",
        assignee: parts[1] || "",
        due: parts[2] || "",
        acceptance: parts[3] || "",
        reviewAt: parts[4] || ""
      };
    }

    function normalizedReportAuthor(value) {
      return String(value || "").trim().toLowerCase();
    }

    const TEAM_SUMMARY_REPORT_ROLES = new Set(["售后组", "店铺维护"]);

    function reportSlotAuthor(role, author) {
      return TEAM_SUMMARY_REPORT_ROLES.has(role) ? "团队汇总" : normalizedReportAuthor(author);
    }

    function reportWasSubmittedToday(report) {
      const timestamp = new Date(report?.createdAt || report?.updatedAt || "");
      if (Number.isNaN(timestamp.getTime())) return report?.date === today;
      return localDateValue(timestamp) === today;
    }

    function sameReportSlot(report, data) {
      if (report.date !== data.date || report.role !== data.role) return false;
      return reportSlotAuthor(report.role, report.author) === reportSlotAuthor(data.role, data.author);
    }

    function taskPriority(risk) {
      return risk === "高" ? "紧急" : risk === "中" ? "重要" : "观察";
    }

    function reportClosureValidation(closure, reportStatus) {
      if (reportStatus !== "已提交") return "";
      const incompleteAnomaly = closure.items.anomalies.find((item) => !item.object || !item.category || !item.issue || !item.reason || !item.risk || !item.handling);
      if (incompleteAnomaly) return "每条异常需填写对象、问题归类、问题、原因、风险等级和处理方式";
      const observedMaterialRisk = closure.items.anomalies.find((item) => ["高", "中"].includes(item.risk) && item.handling === "仅记录观察");
      if (observedMaterialRisk) return "中高风险不能仅记录观察，请生成跟进任务或关联已有任务";
      const missingLinkedTask = closure.items.anomalies.find((item) => item.handling === "关联已有任务" && !item.linkedTaskId);
      if (missingLinkedTask) return "选择“关联已有任务”后，必须选择具体任务";
      const invalidLinkedTask = closure.items.anomalies.find((item) => item.linkedTaskId && !(state.tasks || []).some((task) => task.id === item.linkedTaskId && taskIsActive(task)));
      if (invalidLinkedTask) return "关联任务不存在或已经完成，请重新选择";
      const incompleteTask = closure.items.tasks.find((item) => !item.task || !item.owner || !item.due || !item.acceptance || !item.reviewAt);
      if (incompleteTask) return "明日跟进需填写具体内容、负责人、计划完成时间、完成标准和结果检查时间";
      const weakAcceptance = closure.items.tasks.find((item) => /^(无|暂无|完成|已完成|处理完成|做好|解决)$/i.test(String(item.acceptance || "").trim()));
      if (weakAcceptance) return "完成标准必须可以核对，请填写数量、状态、指标或证据，不能只写“完成”或“无”";
      const invalidTaskTime = closure.items.tasks.find((item) => new Date(item.reviewAt).getTime() <= new Date(item.due).getTime());
      if (invalidTaskTime) return "复查时间必须晚于任务截止时间";
      const incompleteApproval = closure.items.approvals.find((item) => !item.item || !item.suggestion || !item.owner || !item.deadline);
      if (incompleteApproval) return "需要配合解决需填写事项、当前卡点或建议、配合人和最晚解决时间";
      const incompleteReview = closure.items.reviews.find((item) => !item.item || !item.result || !item.status);
      if (incompleteReview) return "到期任务复查需填写复查结果，并选择关闭、继续或升级";
      const unlinkedReview = closure.items.reviews.find((item) => !item.taskId || !(state.tasks || []).some((task) => task.id === item.taskId));
      if (unlinkedReview) return "复查必须来自任务中心的真实任务，不能手工关闭未关联事项";
      return "";
    }

    function reportRiskLevel(selectedRisk, anomalyItems) {
      const order = { "无": 0, "低": 1, "中": 2, "高": 3 };
      return [selectedRisk, ...anomalyItems.map((item) => item.risk)]
        .filter((risk) => Object.hasOwn(order, risk))
        .sort((a, b) => order[b] - order[a])[0] || "无";
    }

    function applyReportReviews(reviewItems, report) {
      let applied = 0;
      reviewItems.forEach((review) => {
        if (!review.taskId) return;
        const task = (state.tasks || []).find((item) => item.id === review.taskId);
        if (!task) return;
        applied += 1;
        task.reviewResult = review.result;
        task.reviewedAt = report.date;
        task.reviewer = report.author;
        if (review.status === "关闭") {
          task.status = "已完成";
          task.completedAt = new Date().toISOString();
        } else if (review.status === "升级") {
          task.status = "待处理";
          task.priority = "紧急";
          task.completedAt = "";
        } else if (review.status === "继续") {
          task.status = "处理中";
          task.completedAt = "";
        }
        stampTaskMutation(task, report.author);
      });
      return applied;
    }

    function createTasksFromReport(report, closure) {
      const created = [];
      const pushTask = ({ id, title, owner, due, reviewAt, acceptance, anomaly = null, approval = null }) => {
        const createdAt = new Date().toISOString();
        const actionParts = [
          anomaly?.object ? `对象：${anomaly.object}` : "",
          anomaly?.category ? `问题归类：${anomaly.category}` : "",
          anomaly?.reason ? `原因判断：${anomaly.reason}` : "",
          anomaly?.impact ? `影响：${anomaly.impact}` : "",
          approval?.suggestion ? `当前卡点 / 建议：${approval.suggestion}` : "",
          approval ? `发起人：${report.author}` : "",
          `完成标准：${acceptance}`
        ].filter(Boolean);
        const task = {
          id,
          title,
          assignee: owner,
          priority: approval ? "重要" : taskPriority(anomaly?.risk || report.risk),
          store: anomaly?.object || report.stores,
          sku: "",
          due,
          status: "待处理",
          source: `${report.role}日报`,
          sourceReport: report.id,
          sourceAnomaly: anomaly?.id || "",
          sourceApproval: approval?.id || "",
          requestedBy: approval ? report.author : "",
          action: actionParts.join("\n"),
          acceptance,
          reviewAt,
          result: "",
          evidence: "",
          reviewResult: "",
          reviewedAt: "",
          reviewer: "",
          completedAt: "",
          createdAt,
          updatedAt: createdAt,
          updatedBy: report.author,
          syncVersion: 1
        };
        state.tasks.push(task);
        created.push(task);
      };

      closure.items.tasks.forEach((entered) => {
        pushTask({
          id: entered.id,
          title: entered.task,
          owner: entered.owner,
          due: entered.due,
          reviewAt: entered.reviewAt,
          acceptance: entered.acceptance
        });
      });

      closure.items.anomalies
        .filter((anomaly) => anomaly.handling === "生成跟进任务")
        .forEach((anomaly) => {
          const taskBaseDate = report.date < today ? today : report.date;
          pushTask({
            id: anomaly.taskId,
            title: `处理异常：${anomaly.issue}`,
            owner: report.author,
            due: `${addDays(taskBaseDate, 1)}T18:00`,
            reviewAt: `${addDays(taskBaseDate, 2)}T10:00`,
            acceptance: `提交处理结果和后台证据，复查确认“${anomaly.issue}”不再持续扩大。`,
            anomaly
          });
        });

      closure.items.approvals.forEach((approval) => {
        const deadlineDate = String(approval.deadline || "").slice(0, 10);
        pushTask({
          id: approval.taskId,
          title: `协同解决：${approval.item}`,
          owner: approval.owner,
          due: approval.deadline,
          reviewAt: `${addDays(deadlineDate, 1)}T10:00`,
          acceptance: `完成协作事项并回传处理结果与证据，由${report.author}复查确认。`,
          approval
        });
      });

      return created;
    }

    function renderReportSaveReceipt(receipt = lastReportReceipt) {
      const target = document.getElementById("reportSaveReceipt");
      if (!target) return;
      if (!receipt) {
        target.classList.remove("visible");
        target.innerHTML = "";
        return;
      }
      target.classList.add("visible");
      target.innerHTML = `
        <div class="receipt-main">
          <b>${escapeHtml(receipt.editing ? "日报更新完成" : "日报提交完成")}</b>
          <span>${escapeHtml(receipt.author)}｜${escapeHtml(receipt.role)}｜${escapeHtml(receipt.savedAt)}｜${escapeHtml(receipt.cloudStatus)}</span>
        </div>
        <div class="receipt-stat"><b>1 份</b><span>日报已保存</span></div>
        <div class="receipt-stat"><b>${receipt.taskCount} 条</b><span>任务完整进入任务中心</span></div>
        <div class="receipt-stat"><b>${receipt.reviewCount} 条</b><span>真实任务复查已更新</span></div>
        <div class="receipt-stat"><b>${receipt.observationCount} 条</b><span>仅观察异常已留档</span></div>
      `;
    }

    async function reportSavePreflight(data, existing) {
      if (!cloudReady || !cloudAvailable()) return "";
      try {
        const response = await fetch(cloudEndpoint, { headers: { "accept": "application/json" } });
        if (!response.ok) return "无法核对云端最新状态，请检查网络后重新提交";
        const payload = await response.json();
        const remote = normalizeState(payload?.data || {});
        const remoteSlotReport = (remote.reports || []).find((report) => sameReportSlot(report, data));
        if (!existing && remoteSlotReport) return "云端已经存在这份日报，请刷新页面后编辑，不能重复覆盖";
        if (!existing) return "";
        const remoteReport = (remote.reports || []).find((report) => report.id === existing.id);
        if (!remoteReport) return "云端未找到原日报，请刷新页面后重新操作";
        if (String(remoteReport.updatedAt || "") !== String(activeReportEditUpdatedAt || existing.updatedAt || "")) {
          return "云端日报已被更新，请刷新页面载入最新内容后再编辑";
        }
        const remoteTasks = (remote.tasks || []).filter((task) => task.sourceReport === existing.id);
        const remoteTaskIds = new Set(remoteTasks.map((task) => task.id));
        const changedTask = remoteTasks.find((remoteTask) => {
          const snapshot = activeReportEditTaskSnapshot.get(remoteTask.id);
          return !snapshot || JSON.stringify(remoteTask) !== snapshot;
        });
        const removedTask = [...activeReportEditTaskSnapshot.keys()].find((taskId) => !remoteTaskIds.has(taskId));
        if (changedTask || removedTask) return "关联任务已有新的执行状态，请刷新页面后再编辑日报";
        return "";
      } catch (error) {
        console.warn("Report preflight failed", error);
        return "暂时无法连接云端核对最新状态，本次没有保存";
      }
    }

    async function saveReport(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.role) {
        showToast("请先选择日报岗位");
        return;
      }
      if (data.date > today) {
        showToast("日报只能提交今天或历史日期，不能填写未来日期");
        return;
      }
      const roleData = collectRoleData(data.role);
      const roleMetrics = roleDataMetrics(data.role, roleData);
      const closure = collectClosureData(data.role);
      const hasClosureItem = Object.values(closure.items).some((items) => items.length);
      if (!roleDataHasValue(roleData) && !hasClosureItem) {
        showToast("请至少填写一项岗位数据或闭环事项");
        return;
      }
      if (data.reportStatus === "已提交" && !roleDataHasValue(roleData)) {
        showToast("已提交日报必须填写岗位今日结果");
        return;
      }
      const validationMessage = reportClosureValidation(closure, data.reportStatus);
      if (validationMessage) {
        showToast(validationMessage);
        return;
      }
      const stores = data.role === "售后组" || data.role === "店铺维护"
        ? ["六店"]
        : [...new Set(roleMetrics.map((row) => row.store).filter((store) => REPORT_STORES.some((item) => item.name === store)))];
      const storesText = data.role === "BD" && roleData.responsibleStores
        ? roleData.responsibleStores
        : data.role === "其他" ? "个人" : stores.join("、");
      state.reports ||= [];
      const editingReportId = form.dataset.editingReportId || "";
      const existingIndex = editingReportId
        ? state.reports.findIndex((item) => item.id === editingReportId)
        : state.reports.findIndex((item) => sameReportSlot(item, data));
      const existing = existingIndex >= 0 ? state.reports[existingIndex] : null;
      if (!editingReportId
        && existing
        && TEAM_SUMMARY_REPORT_ROLES.has(data.role)
        && normalizedReportAuthor(existing.author) !== normalizedReportAuthor(data.author)) {
        showToast(`${data.date} 的${data.role}团队汇总已由 ${existing.author || "其他成员"} 创建，请由原汇总人编辑，不能重复提交`);
        return;
      }
      if (existing?.status === "已提交" && data.reportStatus !== "已提交") {
        showToast("已提交日报不能改回待补充，避免撤销已经生成的任务");
        return;
      }
      const preflightMessage = await reportSavePreflight(data, existing);
      if (preflightMessage) {
        showToast(preflightMessage);
        return;
      }
      const existingTasks = existing ? state.tasks.filter((task) => task.sourceReport === existing.id) : [];
      if (existingTasks.some((task) => !taskIsVoided(task) && task.status !== "待处理")) {
        showToast("这份日报已经进入执行，请在任务中心更新结果，不能直接覆盖");
        return;
      }
      const rollbackReports = structuredClone(state.reports);
      const rollbackTasks = structuredClone(state.tasks);
      const report = {
        id: existing?.id || crypto.randomUUID(),
        date: data.date,
        role: data.role,
        author: data.author,
        stores: storesText,
        risk: reportRiskLevel(data.risk, closure.items.anomalies),
        status: data.reportStatus,
        roleMetrics,
        roleData,
        results: roleDataResults(data.role, roleData),
        anomalies: closure.anomalies,
        reviews: closure.reviews,
        tasksText: closure.tasksText,
        approvals: closure.approvals,
        closureItems: closure.items,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const cloudGuard = existing ? {
        type: "edit-report",
        reportId: existing.id,
        expectedUpdatedAt: activeReportEditUpdatedAt || existing.updatedAt || "",
        taskSnapshots: [...activeReportEditTaskSnapshot.entries()].map(([id, snapshot]) => ({ id, snapshot }))
      } : {
        type: "new-report",
        slot: {
          date: data.date,
          role: data.role,
          author: reportSlotAuthor(data.role, data.author)
        }
      };
      if (existing) {
        state.tasks = state.tasks.filter((task) => task.sourceReport !== existing.id);
        state.reports[existingIndex] = report;
      } else {
        state.reports.push(report);
      }
      let appliedReviews = 0;
      let createdTasks = [];
      if (data.reportStatus === "已提交") {
        appliedReviews = applyReportReviews(closure.items.reviews, report);
        createdTasks = createTasksFromReport(report, closure);
        const preservedVoidedTasks = new Map(existingTasks
          .filter(taskIsVoided)
          .map((task) => [task.id, task]));
        if (preservedVoidedTasks.size) {
          state.tasks = state.tasks.filter((task) => !preservedVoidedTasks.has(task.id));
          state.tasks.push(...preservedVoidedTasks.values());
          createdTasks = createdTasks.filter((task) => !preservedVoidedTasks.has(task.id));
        }
        const expectedTaskIds = new Set([
          ...closure.items.tasks.map((item) => item.id),
          ...closure.items.anomalies
            .filter((item) => item.handling === "生成跟进任务")
            .map((item) => item.taskId),
          ...closure.items.approvals.map((item) => item.taskId)
        ].filter((id) => !preservedVoidedTasks.has(id)));
        if (existing) {
          existingTasks
            .filter((task) => !expectedTaskIds.has(task.id) && !taskIsVoided(task))
            .forEach((task) => {
              state.tasks.push(markTaskVoided(
                task,
                "日报修改",
                "日报编辑时移除该事项，原任务保留作为审计记录。",
                data.author
              ));
            });
        }
        const actualTaskIds = new Set((state.tasks || [])
          .filter((task) => task.sourceReport === report.id && taskIsActive(task))
          .map((task) => task.id));
        const missingTaskIds = [...expectedTaskIds].filter((id) => !actualTaskIds.has(id));
        if (missingTaskIds.length || actualTaskIds.size !== expectedTaskIds.size) {
          state.reports = rollbackReports;
          state.tasks = rollbackTasks;
          showToast("任务完整性校验未通过，本次日报没有保存，请重新提交");
          return;
        }
      }

      pendingCloudGuard = cloudGuard;
      saveState();
      localStorage.setItem(currentAuthorKey, data.author.trim());
      saveReportResumePointer(report);
      document.getElementById("weeklyRole").value = data.role;
      document.getElementById("weeklyAnchor").value = data.date;
      form.dataset.editingReportId = report.id;
      activeReportEditUpdatedAt = report.updatedAt;
      activeReportEditTaskSnapshot = new Map((state.tasks || [])
        .filter((task) => task.sourceReport === report.id)
        .map((task) => [task.id, JSON.stringify(task)]));
      setReportFormExpanded(true);
      lastReportReceipt = {
        reportId: report.id,
        taskIds: createdTasks.map((task) => task.id),
        author: report.author,
        role: report.role,
        editing: Boolean(existing),
        taskCount: createdTasks.length,
        reviewCount: appliedReviews,
        observationCount: closure.items.anomalies.filter((item) => item.handling === "仅记录观察").length,
        savedAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        cloudStatus: cloudReady ? "云端同步中" : "本地预览模式"
      };
      const message = data.reportStatus === "已提交"
        ? `日报已保存，${createdTasks.length} 条任务通过完整性校验`
        : (existing ? "日报草稿已更新，暂未生成任务" : "日报草稿已保存，暂未生成任务");
      showToast(message);
      render();
      renderReportSaveReceipt();
      setTimeout(() => runAiAnalysis({ silent: true }), 80);
    }

    function reportRoleCount(reports, role) {
      return uniqueReportsBySlot(reports.filter((item) => item.role === role)).length;
    }

    function reportSlotKey(report) {
      const author = reportSlotAuthor(report.role, report.author);
      return `${report.date}|${report.role}|${author}`;
    }

    function uniqueReportsBySlot(reports) {
      const sorted = [...reports].sort((a, b) => String(a.updatedAt || a.createdAt || "").localeCompare(String(b.updatedAt || b.createdAt || "")));
      const latest = new Map();
      sorted.forEach((report) => latest.set(reportSlotKey(report), report));
      return [...latest.values()];
    }

    function digestNumber(value, digits = 0) {
      return Number(value || 0).toLocaleString("zh-CN", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      });
    }

    function digestMoney(value) {
      return `$${Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`;
    }

    function sumValues(rows, key) {
      return rows.reduce((sum, row) => sum + Number(row?.values?.[key] || 0), 0);
    }

    function buildRoleDigestLines(reports) {
      const lines = [];
      const operationReports = reports.filter((report) => report.role === "店群运营");
      const operationRows = operationReports.flatMap((report) =>
        (report.roleMetrics || []).filter((row) => REPORT_STORES.some((store) => store.name === row.store))
      );
      if (operationRows.length) {
        const weightedRoi = weightedReportRoi(operationReports);
        lines.push(`店群运营：GMV ${digestMoney(sumValues(operationRows, "gmv"))}｜订单 ${digestNumber(sumValues(operationRows, "orders"))} 单｜销量 ${digestNumber(sumValues(operationRows, "units"))} 件｜商品卡 ${digestMoney(sumValues(operationRows, "productCardGmv"))}｜联盟 ${digestMoney(sumValues(operationRows, "affiliateGmv"))}｜广告成本 ${digestMoney(sumValues(operationRows, "adSpend"))}｜加权 ROI ${weightedRoi ? digestNumber(weightedRoi, 1) : "-"}`);
      }

      const afterSalesReports = reports.filter((report) => report.role === "售后组");
      if (afterSalesReports.length) {
        const storeRows = afterSalesReports.flatMap((report) =>
          (report.roleMetrics || []).filter((row) => REPORT_STORES.some((store) => store.name === row.store))
        );
        const summaryRows = afterSalesReports.flatMap((report) =>
          (report.roleMetrics || []).filter((row) => row.store === "六店汇总")
        );
        const spsRows = storeRows
          .map((row) => ({ store: row.store, value: Number(row.values?.sps || 0) }))
          .filter((item) => item.value > 0);
        const averageSps = spsRows.length ? spsRows.reduce((sum, item) => sum + item.value, 0) / spsRows.length : 0;
        const lowestSps = [...spsRows].sort((a, b) => a.value - b.value)[0];
        lines.push(`售后组：退货 / 退款 ${digestNumber(sumValues(storeRows, "returns"))} 单 / ${digestMoney(sumValues(storeRows, "returnAmount"))}｜SPS 均值 ${averageSps ? digestNumber(averageSps, 2) : "-"}${lowestSps ? `（最低 ${lowestSps.store} ${digestNumber(lowestSps.value, 1)}）` : ""}｜新增差评 ${digestNumber(sumValues(summaryRows, "badReviews"))} 条｜已处理 ${digestNumber(sumValues(summaryRows, "reviewsResolved"))} 条｜索赔 ${digestNumber(sumValues(summaryRows, "claims"))} 单｜未完成 ${digestNumber(sumValues(summaryRows, "unfinished"))} 单`);
      }

      const bdReports = reports.filter((report) => report.role === "BD");
      if (bdReports.length) {
        const samples = bdReports.flatMap((report) => report.roleData?.samples || []);
        const sentSamples = samples.filter((item) => Number(item.sent || 0) > 0);
        const sampleTotal = sentSamples.reduce((sum, item) => sum + Number(item.sent || 0), 0);
        const productTotals = new Map();
        sentSamples.forEach((item) => {
          const product = String(item.product || "未填写").trim() || "未填写";
          productTotals.set(product, (productTotals.get(product) || 0) + Number(item.sent || 0));
        });
        const productSummary = [...productTotals.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([product, quantity]) => `${product} ${digestNumber(quantity)}件`)
          .join("、");
        const stores = new Set([
          ...bdReports.flatMap((report) => (report.roleData?.responsibleStoreRows || []).map((item) => item.store)),
          ...sentSamples.map((item) => item.store)
        ].filter(Boolean));
        const followups = bdReports.reduce((sum, report) => sum + (report.roleData?.followups || []).length, 0);
        lines.push(`BD：${bdReports.length} 人提交｜覆盖 ${stores.size} 店｜寄样 ${digestNumber(sampleTotal)} 件${productSummary ? `（${productSummary}）` : ""}｜重点达人跟进 ${digestNumber(followups)} 项`);
      }

      const maintenanceReports = reports.filter((report) => report.role === "店铺维护");
      if (maintenanceReports.length) {
        const plugins = maintenanceReports.flatMap((report) => report.roleData?.plugins || []);
        const outreach = plugins.reduce((sum, item) => sum + Number(item.outreach || 0), 0);
        const issues = maintenanceReports.reduce((sum, report) => sum + (report.roleData?.inspectionIssues || []).length, 0);
        lines.push(`店铺维护：插件建联 ${digestNumber(outreach)} 次｜检查 ${digestNumber(plugins.length)} 个店铺 / 产品项｜违规与异常 ${digestNumber(issues)} 项`);
      }

      const otherReports = reports.filter((report) => report.role === "其他");
      if (otherReports.length) {
        const totals = otherReports.reduce((result, report) => {
          result.completed += Number(report.roleData?.completedItems || 0);
          result.training += Number(report.roleData?.trainingItems || 0);
          result.documents += Number(report.roleData?.documentsUpdated || 0);
          return result;
        }, { completed: 0, training: 0, documents: 0 });
        lines.push(`其他：完成 ${digestNumber(totals.completed)} 项｜学习 / 培训 ${digestNumber(totals.training)} 项｜SOP / 文档更新 ${digestNumber(totals.documents)} 项`);
      }

      reports.forEach((report) => {
        const extra = String(report.roleData?.extraCompletedWork || "").trim();
        if (extra) lines.push(`${report.role}/${report.author}（其他完成事项）：${extra}`);
      });

      return lines;
    }

    function dailyFollowupTasks(reports, range = selectedReportDataRange()) {
      const currentReportIds = new Set((reports || []).map((report) => report.id));
      const nearDueDate = addDays(range.end, 1);
      const includeCurrentOperations = range.end === today;
      return (state.tasks || [])
        .filter((task) => {
          if (taskIsTerminal(task)) return false;
          if (currentReportIds.has(task.sourceReport)) return true;
          const dueDate = String(task.due || "").slice(0, 10);
          return Boolean(includeCurrentOperations && dueDate && dueDate <= nearDueDate);
        })
        .sort((a, b) =>
          Number(isPastDue(b.due)) - Number(isPastDue(a.due))
          || String(a.due || "").localeCompare(String(b.due || ""))
        );
    }

    function buildDailyDigest(reports, range = selectedReportDataRange()) {
      if (!reports.length) return `${dataRangeDateText(range)} 暂无已提交岗位日报。`;
      const anomalies = reports.flatMap((item) => reportLines(item.anomalies).map((line) => `${item.role}/${item.author}：${line}`));
      const reviews = reports.flatMap((item) => reportLines(item.reviews).map((line) => `${item.role}/${item.author}：${line}`));
      const approvals = reports.flatMap((item) => reportLines(item.approvals)
        .filter(meaningfulApprovalLine)
        .map((line) => `${item.role}/${item.author}：${line}`));
      const reportById = new Map((state.reports || []).map((report) => [report.id, report]));
      const scopedTasks = dailyFollowupTasks(reports, range);
      const tasks = scopedTasks
        .slice(0, 12)
        .map((task) => {
          const report = reportById.get(task.sourceReport);
          const timing = taskIsTerminal(task)
            ? task.status
            : isPastDue(task.due) ? "已逾期" : `截止 ${formatDateTime(task.due)}`;
          return `${report ? `${report.role}/${report.author}` : task.source || "任务中心"}：${task.title}｜${task.assignee || "未分配"}｜${timing}`;
        });
      const roleLines = buildRoleDigestLines(reports);
      const submissionCoverage = reportRangeSubmissionCoverage(reports, range);
      const completionHeading = range.key === "today" ? "今天做了什么" : range.isSingle ? "当日完成了什么" : "期间完成了什么";
      const issueEmpty = range.isSingle ? "当日无新增异常。" : "所选期间无新增异常。";
      const digestType = range.isSingle ? "团队日报" : "团队阶段汇总";
      const submissionText = submissionCoverage.target
        ? `${reports.length} 份日报`
        : `${reports.length} 份补充日报`;
      const coverageDigest = submissionCoverage.target
        ? `核心岗位 ${submissionCoverage.covered}/${submissionCoverage.target}`
        : submissionCoverage.detail;
      return [
        `【TikTok${digestType}｜${dataRangeDateText(range)}】`,
        "",
        `提交概况：${submissionText}｜${new Set(reports.map((item) => item.role)).size} 个岗位｜${coverageDigest}`,
        "",
        `一、${completionHeading}：`,
        roleLines.length ? roleLines.map((line) => `• ${line}`).join("\n") : "暂无可汇总的岗位数据",
        "",
        "二、有什么需要解决：",
        anomalies.length ? anomalies.map((line, index) => `${index + 1}. ${line}`).join("\n") : issueEmpty,
        "",
        "三、谁需要继续跟进：",
        tasks.length
          ? [
              tasks.map((line, index) => `${index + 1}. ${line}`).join("\n"),
              scopedTasks.length > tasks.length ? `另有 ${scopedTasks.length - tasks.length} 项，请到任务中心查看。` : ""
            ].filter(Boolean).join("\n")
          : "所选范围无新增、到期或逾期跟进任务。",
        ...(reviews.length ? ["", "四、今日复查结果：", reviews.map((line, index) => `${index + 1}. ${line}`).join("\n")] : []),
        "",
        `${reviews.length ? "五" : "四"}、需要配合解决：`,
        approvals.length ? approvals.map((line, index) => `${index + 1}. ${line}`).join("\n") : "所选范围无跨岗位协作事项。"
      ].join("\n");
    }

    function renderDailyManagementBoard(reports, range = selectedReportDataRange()) {
      const completed = buildRoleDigestLines(reports).map((line) => {
        const separator = line.indexOf("：");
        return {
          title: separator > -1 ? line.slice(0, separator) : "今日完成",
          body: separator > -1 ? line.slice(separator + 1) : line,
          meta: "来自已提交日报"
        };
      });
      const issues = reports.flatMap((report) => reportLines(report.anomalies).map((line) => ({
        title: `${report.role} · ${report.author}`,
        body: line,
        meta: `${report.risk || "无"}风险`
      })));
      const reportById = new Map(reports.map((report) => [report.id, report]));
      const followups = dailyFollowupTasks(reports, range)
        .map((task) => {
          const report = reportById.get(task.sourceReport);
          return {
            title: task.title,
            body: `负责人：${task.assignee || "未分配"}｜${task.due ? `截止 ${formatDateTime(task.due)}` : "未填写截止时间"}`,
            meta: `${report?.role || task.source || "任务中心"} · ${isPastDue(task.due) ? "已逾期" : task.status || "待处理"}`
          };
        })
        .slice(0, 12);
      const decisions = reports.flatMap((report) => {
        const items = (Array.isArray(report.closureItems?.approvals) ? report.closureItems.approvals : [])
          .filter(meaningfulApprovalItem);
        if (items.length) {
          return items.map((item) => ({
            title: `${report.role} · ${report.author}`,
            body: `${item.item || "未填写事项"}${item.owner ? `｜需要 ${item.owner} 配合` : ""}｜建议：${item.suggestion || "未填写建议"}`,
            meta: item.deadline ? `最晚 ${formatDateTime(item.deadline)}` : item.result ? `进展：${item.result}` : "等待协同处理"
          }));
        }
        return reportLines(report.approvals).filter(meaningfulApprovalLine).map((line) => ({
          title: `${report.role} · ${report.author}`,
          body: line,
          meta: "等待协同处理"
        }));
      });
      const lane = (type, title, items, emptyText) => `
        <section class="daily-management-lane ${type}">
          <div class="daily-management-lane-head">
            <h3>${escapeHtml(title)}</h3>
            <span>${items.length} 项</span>
          </div>
          ${items.length ? `
            <div class="daily-management-list">
              ${items.map((item) => `
                <article class="daily-management-item">
                  <b>${escapeHtml(item.title)}</b>
                  <p>${escapeHtml(item.body)}</p>
                  <small>${escapeHtml(item.meta)}</small>
                </article>
              `).join("")}
            </div>
          ` : `<div class="daily-management-empty">${escapeHtml(emptyText)}</div>`}
        </section>
      `;
      document.getElementById("dailyManagementBoard").innerHTML = [
        lane("complete", range.key === "today" ? "今天做了什么" : range.isSingle ? "当日完成了什么" : "期间完成了什么", completed, "所选范围尚未形成可汇总的岗位结果。"),
        lane("issue", "有什么需要解决", issues, "所选范围没有上报需要解决的异常。"),
        lane("follow", "谁需要继续跟进", followups, "所选范围没有新增、到期或逾期任务。"),
        lane("decision", "需要配合解决", decisions, "所选范围没有跨岗位协作事项。")
      ].join("");
    }

    function localDate(value) {
      const [year, month, day] = String(value || today).split("-").map(Number);
      return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0);
    }

    function dateKey(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function weekRange(anchor) {
      const end = localDate(anchor);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { start: dateKey(start), end: dateKey(end) };
    }

    function weeklyRows(role) {
      if (role === "售后组") return [...REPORT_STORES, { name: "六店汇总", group: "团队" }];
      if (role === "店铺维护") return [{ name: "六店汇总", group: "团队" }];
      if (role === "BD") return [...REPORT_STORES, { name: "个人汇总", group: "人员" }];
      if (role === "其他") return [{ name: "个人汇总", group: "人员" }];
      return REPORT_STORES;
    }

    function aggregateWeeklyReports(reports, role) {
      const schema = reportSchema(role);
      const byStore = Object.fromEntries(weeklyRows(role).map((store) => [store.name, {
        reportDays: new Set(),
        values: Object.fromEntries(schema.columns.filter((column) => column.type !== "status").map((column) => [column.key, 0])),
        present: new Set(),
        latestDates: {},
        statuses: Object.fromEntries(schema.columns.filter((column) => column.type === "status").map((column) => [column.key, {}]))
      }]));
      reports.forEach((report) => {
        (report.roleMetrics || []).forEach((row) => {
          if (!byStore[row.store]) return;
          byStore[row.store].reportDays.add(report.date);
          schema.columns.forEach((column) => {
            const value = row.values?.[column.key];
            if (value === null || value === undefined || value === "") return;
            if (column.type === "status") {
              const statusCounts = byStore[row.store].statuses[column.key];
              statusCounts[value] = (statusCounts[value] || 0) + 1;
            } else if (column.aggregate === "latest") {
              byStore[row.store].present.add(column.key);
              const latestDate = byStore[row.store].latestDates[column.key] || "";
              if (report.date >= latestDate) {
                byStore[row.store].values[column.key] = Number(value) || 0;
                byStore[row.store].latestDates[column.key] = report.date;
              }
            } else {
              byStore[row.store].present.add(column.key);
              byStore[row.store].values[column.key] += Number(value) || 0;
            }
          });
        });
      });
      return byStore;
    }

    function weeklyStatusText(column, counts) {
      const total = Object.values(counts || {}).reduce((sum, value) => sum + value, 0);
      if (!total) return "-";
      const warningCount = counts?.[column.warning] || 0;
      return warningCount ? `${column.warning} ${warningCount}天` : "正常";
    }

    function weeklyDisplayColumns(role, schema) {
      if (role === "售后组") {
        return schema.columns.filter((column) => !["consultations", "lateReplies"].includes(column.key));
      }
      return schema.columns;
    }

    function weeklyDisplayValue(column, aggregate) {
      if (!aggregate?.reportDays.size) return "-";
      return column.type === "status"
        ? weeklyStatusText(column, aggregate.statuses[column.key])
        : aggregate.present.has(column.key) ? reportMetricValue(column, aggregate.values[column.key]) : "-";
    }

    function bdSampleProductSummary(reports, storeName = "") {
      const products = new Map();
      reports.forEach((report) => {
        (report.roleData?.samples || []).forEach((row) => {
          if (storeName && row.store !== storeName) return;
          const sent = Number(row.sent || 0);
          if (!sent) return;
          const product = String(row.product || "未填写产品").trim() || "未填写产品";
          products.set(product, (products.get(product) || 0) + sent);
        });
      });
      return [...products.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
        .map(([product, sent]) => `${product} × ${num(sent)}`)
        .join("、");
    }

    function maintenanceWeeklyIssues(reports) {
      const issues = [];
      reports.forEach((report) => {
        const rows = report.roleData?.inspectionIssues || [];
        rows.forEach((row) => {
          if (!row.store && !row.issue && !row.reason && !row.result) return;
          issues.push({
            date: report.date,
            store: row.store || "未选店铺",
            issue: row.issue || "未填写异常",
            reason: row.reason || "未填写",
            result: row.result || "待处理"
          });
        });
        if (!rows.length && Number(report.roleData?.violations || 0)) {
          issues.push({
            date: report.date,
            store: "历史记录未拆分店铺",
            issue: `新增违规 ${num(report.roleData.violations)} 条`,
            reason: "旧日报未记录原因",
            result: "请结合原日报复查"
          });
        }
      });
      return issues.sort((a, b) => a.store.localeCompare(b.store, "zh-CN") || a.date.localeCompare(b.date));
    }

    function weeklyExtraCompletedSection(reports) {
      const lines = (reports || []).flatMap((report) => {
        const extra = String(report.roleData?.extraCompletedWork || "").trim();
        return extra ? [`${report.date}｜${report.author}：${extra}`] : [];
      });
      return lines.length ? ["", "其他完成事项：", ...lines.map((line, index) => `${index + 1}. ${line}`)] : [];
    }

    function buildWeeklyDigest(role, range, reports, aggregates, taskStats) {
      if (!reports.length) return `【${role}周报｜${range.start}—${range.end}】\n本周暂无结构化日报。`;
      const extraCompletedSection = weeklyExtraCompletedSection(reports);
      if (role === "BD") {
        const storeLines = REPORT_STORES.map((store) => {
          const aggregate = aggregates[store.name];
          if (!aggregate?.reportDays.size) return "";
          return `${store.name}：${bdSampleProductSummary(reports, store.name) || "未填写产品明细"}｜寄样 ${num(aggregate.values.samplesSent)}个`;
        }).filter(Boolean);
        const anomalyCount = reports.reduce((sum, report) => sum + reportLines(report.anomalies).length, 0);
        return [
          `【BD周报｜${range.start}—${range.end}】`,
          `日报：${reports.length}份｜覆盖店铺：${storeLines.length}家｜异常${anomalyCount}项`,
          "",
          "按店铺汇总：",
          storeLines.map((line, index) => `${index + 1}. ${line}`).join("\n"),
          ...extraCompletedSection,
          "",
          `任务闭环：新增${taskStats.total}项｜已完成${taskStats.closed}项｜逾期${taskStats.overdue}项`,
          "下周重点：优先清空联盟消息积压，并持续追踪寄样后的内容发布、出单和复投结果。"
        ].join("\n");
      }
      if (role === "店铺维护") {
        const issues = maintenanceWeeklyIssues(reports);
        return [
          `【店铺维护周报｜${range.start}—${range.end}】`,
          `实际违规 / 异常：${issues.length}项`,
          "",
          issues.length
            ? issues.map((row, index) => `${index + 1}. ${row.store}｜${row.issue}｜原因：${row.reason}｜处理：${row.result}`).join("\n")
            : "本周未记录店铺违规或异常。",
          ...extraCompletedSection,
          "",
          `任务闭环：新增${taskStats.total}项｜已完成${taskStats.closed}项｜逾期${taskStats.overdue}项`
        ].join("\n");
      }
      const schema = reportSchema(role);
      const displayColumns = weeklyDisplayColumns(role, schema);
      const storeLines = weeklyRows(role).map((store) => {
        const aggregate = aggregates[store.name];
        if (!aggregate?.reportDays.size) return "";
        const details = displayColumns.map((column) => {
          if (column.type === "status") {
            const text = weeklyStatusText(column, aggregate.statuses[column.key]);
            return text === "-" ? "" : `${column.label} ${text}`;
          }
          const value = aggregate.values[column.key];
          return value ? `${column.label} ${reportMetricValue(column, value)}` : "";
        }).filter(Boolean);
        return `${store.name}：${details.join("｜") || "已提交，无数值变化"}`;
      }).filter(Boolean);
      const anomalyCount = reports.reduce((sum, report) => sum + reportLines(report.anomalies).length, 0);
      return [
        `【${role}周报｜${range.start}—${range.end}】`,
        `日报：${reports.length}份｜汇总${storeLines.length}项｜异常${anomalyCount}项`,
        "",
        "汇总结果：",
        storeLines.map((line, index) => `${index + 1}. ${line}`).join("\n"),
        role === "BD" ? `\n寄样产品：${bdSampleProductSummary(reports) || "日报未填写产品寄样明细"}` : "",
        ...extraCompletedSection,
        "",
        `任务闭环：新增${taskStats.total}项｜已完成${taskStats.closed}项｜逾期${taskStats.overdue}项`,
        role === "其他"
          ? "下周重点：优先解决未闭环问题，把学习结果沉淀为SOP或清单，并由带教人复查。"
          : "下周重点：优先处理高风险异常、逾期任务和连续出现的同类问题。"
      ].join("\n");
    }

    function addDays(value, days) {
      const date = localDate(value);
      date.setDate(date.getDate() + days);
      return dateKey(date);
    }

    function suggestedReviewTime(dueValue) {
      const dueDate = String(dueValue || "").slice(0, 10);
      return dueDate ? `${addDays(dueDate, 1)}T10:00` : "";
    }

    function syncTaskReviewTime(dueInput, force = false) {
      const row = dueInput?.closest('[data-closure-row="task"]');
      const reviewInput = row?.querySelector('[data-part="reviewAt"]');
      if (!reviewInput || !dueInput.value) return;
      const suggested = suggestedReviewTime(dueInput.value);
      const currentTime = new Date(reviewInput.value).getTime();
      const dueTime = new Date(dueInput.value).getTime();
      if (force || !reviewInput.value || !Number.isFinite(currentTime) || currentTime <= dueTime) reviewInput.value = suggested;
    }

    function applyTimePreset(select) {
      const input = select.closest(".smart-time-control")?.querySelector('input[type="datetime-local"]');
      const preset = String(select.value || "");
      if (!input || !preset) return;
      if (preset.startsWith("hours-")) {
        const target = new Date(Date.now() + Number(preset.slice(6)) * 3600000);
        target.setMinutes(Math.ceil(target.getMinutes() / 15) * 15, 0, 0);
        input.value = localDateTimeValue(target);
      } else {
        const match = preset.match(/^day-(\d+)-(\d{2})(\d{2})$/);
        if (!match) return;
        input.value = `${addDays(today, Number(match[1]))}T${match[2]}:${match[3]}`;
      }
      syncTaskReviewTime(input, true);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      select.selectedIndex = 0;
    }

    function aggregateTotal(aggregates, key) {
      return Object.values(aggregates).reduce((sum, aggregate) => sum + Number(aggregate?.values?.[key] || 0), 0);
    }

    function averageReportMetric(reports, key) {
      const values = reports.flatMap((report) => (report.roleMetrics || []).map((row) => row.values?.[key]))
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map(Number)
        .filter(Number.isFinite);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    }

    function weightedReportRoi(reports) {
      const totals = reports.flatMap((report) => report.roleMetrics || []).reduce((result, row) => {
        const spend = Number(row.values?.adSpend || 0);
        const rowRoi = Number(row.values?.adRoi || 0);
        if (spend > 0 && Number.isFinite(rowRoi)) {
          result.spend += spend;
          result.adGmv += spend * rowRoi;
        }
        return result;
      }, { spend: 0, adGmv: 0 });
      return totals.spend ? totals.adGmv / totals.spend : 0;
    }

    function effectiveRangeEnd(range) {
      return range.end > today ? today : range.end;
    }

    function previousComparableRange(range) {
      return {
        start: addDays(range.start, -7),
        end: addDays(effectiveRangeEnd(range), -7)
      };
    }

    function reportRangeHasCompleteRoleCoverage(reports, range, roles) {
      const requiredRoles = [...new Set((roles || []).map((role) => String(role || "").trim()).filter(Boolean))];
      if (!range?.start || !range?.end || !requiredRoles.length) return false;
      const dates = [];
      for (let date = range.start; date <= range.end && dates.length <= 7; date = addDays(date, 1)) dates.push(date);
      if (dates.length !== 7 || dates[dates.length - 1] !== range.end) return false;
      const submittedSlots = new Set((reports || [])
        .filter((report) => report?.status === "已提交")
        .map((report) => `${report.date}\u241f${report.role}`));
      return dates.every((date) => requiredRoles.every((role) => submittedSlots.has(`${date}\u241f${role}`)));
    }

    function weeklyComparePercent(current, previous, comparisonReady) {
      if (!comparisonReady) return "上周期数据不完整";
      const currentValue = Number(current);
      const previousValue = Number(previous);
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue) || previousValue === 0) return "-";
      const change = (currentValue - previousValue) / previousValue * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    }

    function weeklyComparePoints(current, previous, comparisonReady) {
      if (!comparisonReady) return "上周期数据不完整";
      const currentValue = Number(current);
      const previousValue = Number(previous);
      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) return "-";
      const change = currentValue - previousValue;
      return `${change >= 0 ? "+" : ""}${change.toFixed(2)}`;
    }

    function reportingActivationDate() {
      const dates = (state.reports || [])
        .filter((report) => report.status === "已提交" && Array.isArray(report.roleMetrics))
        .map((report) => String(report.date || ""))
        .filter(Boolean)
        .sort();
      return dates[0] || today;
    }

    function operationalInsights(role, range, reports, aggregates) {
      const insights = [];
      const push = (level, label, title, body) => insights.push({ level, label, title, body });
      if (!reports.length) {
        push("info", "数据准备", "本周还不能形成可靠诊断", "先完成当天岗位日报。系统只有在店铺、渠道和异常数据连续记录后，才能判断趋势、结构和问题优先级。");
        return insights;
      }

      const previousRange = previousComparableRange(range);
      const previousReports = (state.reports || []).filter((report) => report.status === "已提交" && report.role === role && report.date >= previousRange.start && report.date <= previousRange.end && Array.isArray(report.roleMetrics));
      const comparisonReady = reportRangeHasCompleteRoleCoverage(previousReports, previousRange, [role]);
      const previousAggregates = aggregateWeeklyReports(comparisonReady ? previousReports : [], role);

      if (role === "店群运营") {
        const gmv = aggregateTotal(aggregates, "gmv");
        const previousGmv = aggregateTotal(previousAggregates, "gmv");
        const orders = aggregateTotal(aggregates, "orders");
        const affiliateGmv = aggregateTotal(aggregates, "affiliateGmv");
        const productCardGmv = aggregateTotal(aggregates, "productCardGmv");
        const adSpend = aggregateTotal(aggregates, "adSpend");
        const afterSalesReports = (state.reports || []).filter((report) =>
          report.status === "已提交"
          && report.role === "售后组"
          && report.date >= range.start
          && report.date <= range.end
          && Array.isArray(report.roleMetrics)
        );
        const afterSalesAggregates = aggregateWeeklyReports(afterSalesReports, "售后组");
        const returns = aggregateTotal(afterSalesAggregates, "returns");
        const hasAfterSalesReturns = Object.values(afterSalesAggregates).some((aggregate) => aggregate.present?.has("returns"));
        const affiliateShare = gmv ? affiliateGmv / gmv : 0;
        const productShare = gmv ? productCardGmv / gmv : 0;
        const returnRate = orders ? returns / orders : 0;
        const averageRoi = weightedReportRoi(reports);
        const gmvChange = previousGmv ? (gmv - previousGmv) / previousGmv : null;

        push(gmvChange !== null && gmvChange < -0.1 ? "high" : gmvChange !== null && gmvChange > 0.1 ? "good" : "info",
          "经营结果",
          previousGmv ? `GMV周环比 ${gmvChange >= 0 ? "+" : ""}${(gmvChange * 100).toFixed(1)}%` : `本周记录GMV ${money(gmv)}`,
          previousGmv ? `本周 ${money(gmv)}，上周 ${money(previousGmv)}。先确认变化来自流量、转化、客单还是渠道结构，再分派动作。` : "缺少上周同口径数据，当前只做基线记录，不下趋势结论。");

        if (gmv) {
          const concentration = Math.max(affiliateShare, productShare);
          const channel = affiliateShare >= productShare ? "联盟" : "商品卡";
          push(concentration > 0.7 ? "medium" : "good", "渠道韧性", `${channel}占比 ${(concentration * 100).toFixed(1)}%`,
            concentration > 0.7 ? `成交对${channel}依赖较高。保留优势渠道，同时补足另一条成交路径，降低单一达人视频或单一搜索入口衰减带来的波动。` : "商品卡与联盟均有承接，继续观察广告、卖家内容和达人内容之间是否形成互相放大的结构。");
        }

        if (adSpend || averageRoi) {
          push(averageRoi && averageRoi < 3 ? "high" : averageRoi < 5 ? "medium" : "good", "付费效率", `记录期广告加权ROI ${averageRoi.toFixed(2)}`,
            `广告成本 ${money(adSpend)}。ROI不能单独判断好坏，应与毛利保本线、自然GMV增量和素材衰减一起复查；低于店铺保本ROI时停止盲目放量。`);
        }

        if (orders && hasAfterSalesReturns) {
          push(returnRate > 0.05 ? "high" : returnRate > 0.03 ? "medium" : "good", "增长质量", `退货单量占比 ${(returnRate * 100).toFixed(2)}%`,
            returnRate > 0.03 ? "增长同时伴随售后压力。应联动VOC、链接表达、产品批次和达人话术，避免用新增订单掩盖利润流失。" : "当前退货压力可控，仍需结合退款金额、差评和产品满意度持续观察。");
        } else if (orders) {
          push("info", "增长质量", "缺少同周售后数据，暂不计算退货 / 退款占比",
            "店群运营已记录订单，但售后组尚未提供同周退货 / 退款口径。数据补齐前不下增长质量结论。");
        }
      }

      if (role === "BD") {
        const samples = aggregateTotal(aggregates, "samplesSent");
        push(samples ? "good" : "info", "寄样执行", `本周寄样 ${samples} 个`,
          "按店铺汇总寄样产品和实际寄出数量。");
      }

      if (role === "售后组") {
        const returns = aggregateTotal(aggregates, "returns");
        const returnAmount = aggregateTotal(aggregates, "returnAmount");
        const badReviews = aggregateTotal(aggregates, "badReviews");
        const reviewsResolved = aggregateTotal(aggregates, "reviewsResolved");
        const unfinished = aggregateTotal(aggregates, "unfinished");
        const pendingReviews = Math.max(0, badReviews - reviewsResolved);
        const reportedSps = REPORT_STORES.map((store) => ({
          store: store.name,
          value: Number(aggregates[store.name]?.values?.sps || 0)
        })).filter((item) => item.value > 0);
        const lowSps = reportedSps.filter((item) => item.value < 3.5);

        push(lowSps.length ? "high" : reportedSps.length ? "good" : "info", "店铺健康",
          lowSps.length ? `${lowSps.map((item) => `${item.store} ${item.value.toFixed(1)}`).join("｜")} 低于3.5` : reportedSps.length ? "已填店铺 SPS 均不低于3.5" : "本周尚未填写分店 SPS",
          lowSps.length ? "低于3.5的店铺需要优先拆解商品满意度、履约与客服维度，并关注联盟能力受限带来的流量风险。" : "SPS按店铺持续记录；分数正常时仍需观察单项指标和变化趋势。");
        push(returns ? "medium" : "good", "退货 / 退款", `${returns} 单｜${money(returnAmount)}`,
          returns ? "按店铺和问题产品归并退款原因，区分产品、链接表达、达人话术、物流与客服问题，连续出现的原因必须回流到运营动作。" : "本周未记录退货 / 退款，继续关注店铺与问题SKU变化。");
        push(pendingReviews ? "medium" : "good", "差评处理", `新增 ${badReviews} 条｜已处理 ${reviewsResolved} 条`,
          pendingReviews ? `仍有 ${pendingReviews} 条差评需要处理或复盘；处理结果应同步到产品、链接或内容优化。` : "本周新增差评均已处理或复盘，继续观察同类问题是否重复出现。");
        push(unfinished ? "high" : "good", "索赔闭环", `未完成索赔 ${unfinished} 单`,
          unfinished ? "未闭环订单会继续累积体验风险。每单必须有负责人、承诺时间和复查节点。" : "本周退货 / 退款与索赔事项已完成闭环。");
      }

      if (role === "店铺维护") {
        const issues = maintenanceWeeklyIssues(reports);
        push(issues.length ? "medium" : "good", "店铺异常", `实际违规 / 异常 ${issues.length} 项`,
          issues.length ? "按店铺查看异常、原因和处理结果，未完成事项继续进入任务闭环。" : "本周未记录店铺违规或异常。");
      }

      if (role === "其他") {
        const completed = aggregateTotal(aggregates, "completedItems");
        const training = aggregateTotal(aggregates, "trainingItems");
        const documents = aggregateTotal(aggregates, "documentsUpdated");
        const raised = aggregateTotal(aggregates, "questionsRaised");
        const resolved = aggregateTotal(aggregates, "questionsResolved");
        const resolutionRate = raised ? resolved / raised : 1;

        push(completed ? "good" : "info", "工作产出", `完成事项 ${completed} 项`,
          completed ? "继续用可核对的结果描述工作，不只记录参与过程。" : "本周尚未记录完成事项，应补充可验证的交付结果。");
        push(training || documents ? "good" : "info", "学习沉淀", `学习 / 培训 ${training} 项｜SOP / 文档更新 ${documents} 项`,
          "新人学习应沉淀为笔记、SOP修订或可复用清单，避免知识只停留在个人。");
        push(raised && resolutionRate < 0.8 ? "medium" : "good", "问题解决", `提出 ${raised} 个｜已解决 ${resolved} 个`,
          raised ? `问题解决率 ${(resolutionRate * 100).toFixed(1)}%。未解决问题应明确带教人、截止时间和复查标准。` : "本周未记录待解决问题；如存在阻塞，应及时进入异常和任务闭环。");
      }

      return insights.slice(0, 4);
    }

    function renderOperationalInsights(role, range, reports, aggregates) {
      const reportDays = new Set((reports || []).map((report) => report.date).filter(Boolean)).size;
      const confidenceEl = document.getElementById("weeklyConfidence");
      confidenceEl.textContent = reports.length ? `${reportDays}天 · ${reports.length}份日报` : "暂无岗位日报";
      confidenceEl.title = "岗位结果按实际提交汇总；不绑定固定人员数量，周末值班日报照常计入";
      confidenceEl.className = `badge ${reports.length ? "green" : "red"}`;
      const insights = operationalInsights(role, range, reports, aggregates);
      document.getElementById("weeklyInsights").innerHTML = renderInsightCards(insights);
    }

    function renderInsightCards(insights) {
      const statusLabels = {
        high: "需处理",
        medium: "需关注",
        good: "状态正常",
        info: "待补数据"
      };
      return insights.map((item, index) => `
        <article class="insight-card ${item.level}">
          <span class="insight-index">${String(index + 1).padStart(2, "0")}</span>
          <div class="insight-copy">
            <div class="insight-meta">
              <span class="insight-label">${escapeHtml(item.label)}</span>
              <span class="insight-status">${statusLabels[item.level] || "观察"}</span>
            </div>
            <h4>${escapeHtml(item.title)}</h4>
            <p>${escapeHtml(item.body)}</p>
          </div>
        </article>
      `).join("");
    }

    function clientFingerprint(value) {
      const text = JSON.stringify(value);
      let hash = 2166136261;
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16);
    }

    function compactAnalysisText(value, maxLength = 180) {
      const text = String(value || "").trim().replace(/\s+/g, " ");
      return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
    }

    function compactAnalysisLines(values, limit = 3) {
      return [...new Set((values || []).map((value) => compactAnalysisText(value)).filter(Boolean))].slice(0, limit);
    }

    function compactWeeklyReportGroup(reports) {
      const group = reports || [];
      const role = group[0]?.role || "未归类";
      const metricValues = {};
      const statusCounts = {};
      group.forEach((report) => {
        (report.roleMetrics || []).forEach((row) => {
          Object.entries(row.values || {}).forEach(([key, rawValue]) => {
            if (rawValue === "" || rawValue === null || rawValue === undefined) return;
            const numericValue = Number(rawValue);
            if (Number.isFinite(numericValue)) {
              metricValues[key] ||= [];
              metricValues[key].push(numericValue);
            }
            else {
              statusCounts[key] ||= {};
              const label = compactAnalysisText(rawValue, 60);
              statusCounts[key][label] = (statusCounts[key][label] || 0) + 1;
            }
          });
        });
      });
      const sampleProducts = compactAnalysisLines(group.flatMap((report) =>
        (report.roleData?.samples || []).map((item) => `${item.product || "未填写产品"} × ${Number(item.sent || 0)}`)
      ));
      const metricSummary = Object.fromEntries(Object.entries(metricValues).map(([key, values]) => [key, {
        sum: values.reduce((total, value) => total + value, 0),
        average: values.reduce((total, value) => total + value, 0) / values.length,
        count: values.length
      }]));
      const observedStores = group.flatMap((report) => [
        ...(Array.isArray(report.stores) ? report.stores : [report.stores]),
        ...(report.roleMetrics || []).map((row) => row.store)
      ]).map((store) => compactAnalysisText(store, 80)).filter(Boolean);
      return {
        role,
        reportCount: group.length,
        dates: [...new Set(group.map((report) => report.date).filter(Boolean))].sort(),
        authors: [...new Set(group.map((report) => compactAnalysisText(report.author, 60)).filter(Boolean))].slice(0, 12),
        stores: [...new Set(observedStores)].slice(0, 12),
        riskCounts: group.reduce((counts, report) => {
          const risk = compactAnalysisText(report.risk || "未标注", 30);
          counts[risk] = (counts[risk] || 0) + 1;
          return counts;
        }, {}),
        metricSummary,
        statusCounts,
        sampleProducts,
        results: compactAnalysisLines(group.flatMap((report) => [reportResultsText(report)])),
        anomalies: compactAnalysisLines(group.flatMap((report) => reportLines(report.anomalies))),
        reviews: compactAnalysisLines(group.flatMap((report) => reportLines(report.reviews))),
        taskNotes: compactAnalysisLines(group.flatMap((report) => reportLines(report.tasksText))),
        approvals: compactAnalysisLines(group.flatMap((report) => reportLines(report.approvals)))
      };
    }

    function compactWeeklyReportGroups(reports) {
      const groups = new Map();
      (reports || []).forEach((report) => {
        const role = String(report.role || "未归类");
        if (!groups.has(role)) groups.set(role, []);
        groups.get(role).push(report);
      });
      return [...groups.values()].map(compactWeeklyReportGroup);
    }

    function buildAiAnalysisPayload(role, range) {
      const allCurrentReports = uniqueReportsBySlot((state.reports || []).filter((report) => report.status === "已提交" && report.date >= range.start && report.date <= effectiveRangeEnd(range)));
      const previousRange = previousComparableRange(range);
      const allPreviousReports = uniqueReportsBySlot((state.reports || []).filter((report) => report.status === "已提交" && report.date >= previousRange.start && report.date <= previousRange.end));
      const currentReports = role === "运营总览" ? allCurrentReports : allCurrentReports.filter((report) => report.role === role);
      const previousReports = role === "运营总览" ? allPreviousReports : allPreviousReports.filter((report) => report.role === role);
      const comparisonRoles = role === "运营总览" ? ["售后组", "BD", "店铺维护", "店群运营"] : [role];
      const comparisonReady = reportRangeHasCompleteRoleCoverage(allPreviousReports, previousRange, comparisonRoles);
      const comparablePreviousReports = comparisonReady ? previousReports : [];
      const currentIds = new Set(currentReports.map((report) => report.id));
      return {
        focusRole: role,
        range,
        previousRange,
        comparisonReady,
        teamContext: {
          stores: REPORT_STORES,
          organization: "6家TikTok Shop：5家家纺、1家口腔；售后2人合并1份日报，其余6人分别提交。",
          workflow: "日报数据 → 经营诊断 → 异常转任务 → 负责人执行 → 复查 → 关闭或升级 → 周报汇总"
        },
        coverage: {
          observedRoles: [...new Set(currentReports.map((report) => report.role))],
          currentReportCount: currentReports.length,
          previousObservedRoles: [...new Set(comparablePreviousReports.map((report) => report.role))],
          previousReportCount: comparablePreviousReports.length
        },
        metricDefinitions: Object.fromEntries(Object.entries(REPORT_SCHEMAS).map(([name, schema]) => [name, schema.columns.map((column) => ({
          key: column.key,
          label: column.label,
          unit: column.unit || "",
          type: column.type || "number"
        }))])),
        reports: compactWeeklyReportGroups(currentReports),
        previousReports: compactWeeklyReportGroups(comparablePreviousReports),
        tasks: (state.tasks || []).filter((task) => currentIds.has(task.sourceReport) && taskCountsInPerformance(task)).map((task) => ({
          title: task.title,
          assignee: task.assignee,
          priority: task.priority,
          store: task.store,
          due: task.due,
          status: task.status,
          acceptance: task.acceptance,
          reviewAt: task.reviewAt,
          result: task.result
        }))
      };
    }

    function aiAnalysisKey(role, range, payload) {
      return `${role}:${range.start}:${range.end}:${clientFingerprint(payload)}`;
    }

    function renderAiAnalysis(analysis, meta = {}) {
      const target = document.getElementById("aiAnalysisOutput");
      if (!analysis) {
        activeAiAnalysisContext = null;
        target.innerHTML = `<div class="empty">本周数据变化后，将自动生成新的AI经营诊断。</div>`;
        return;
      }
      activeAiAnalysisContext = { analysis, meta };
      const severityClass = {
        "紧急": "red",
        "重要": "amber",
        "关注": "blue",
        "机会": "green"
      };
      const existingTasks = new Set((state.tasks || [])
        .filter((task) => task.sourceAnalysis === meta.key)
        .map((task) => Number(task.sourceDiagnosis)));
      target.innerHTML = `
        <div class="ai-analysis-summary">
          <small>${escapeHtml(meta.model || "AI分析")} · 数据可信度 ${escapeHtml(analysis.dataConfidence?.level || "-")} · ${escapeHtml(meta.createdAt ? new Date(meta.createdAt).toLocaleString("zh-CN") : "")}</small>
          <p>${escapeHtml(analysis.executiveSummary || "暂无总评")}</p>
          <p><strong>数据说明：</strong>${escapeHtml(analysis.dataConfidence?.explanation || "无")}</p>
        </div>
        <div class="ai-diagnosis-list">
          ${(analysis.diagnoses || []).map((item, index) => `
            <article class="ai-diagnosis">
              <span class="badge ${severityClass[item.severity] || "blue"}">${escapeHtml(item.severity)} · ${escapeHtml(item.dimension)}</span>
              <h4>${escapeHtml(item.conclusion)}</h4>
              <p><strong>证据：</strong>${escapeHtml(item.evidence)}</p>
              <p><strong>动作：</strong>${escapeHtml(item.action)}</p>
              <p><strong>责任与复查：</strong>${escapeHtml(item.owner)}｜${escapeHtml(item.reviewMetric)}</p>
              <button class="small-btn" data-ai-task="${index}" type="button" ${existingTasks.has(index) ? "disabled" : ""}>${existingTasks.has(index) ? "已生成任务" : "采纳并生成任务"}</button>
            </article>
          `).join("")}
        </div>
        <div class="ai-priority-list">
          <b>下一周优先级</b>
          <ol>${(analysis.nextWeekPriorities || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
          ${(analysis.crossRoleSignals || []).length ? `<b style="margin-top:14px">跨岗位信号</b><ol>${analysis.crossRoleSignals.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : ""}
          ${(analysis.dataCaveats || []).length ? `<b style="margin-top:14px">数据口径提醒</b><ol>${analysis.dataCaveats.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>` : ""}
        </div>
      `;
    }

    function createTaskFromAiDiagnosis(index) {
      const diagnosisIndex = Number(index);
      const diagnosis = activeAiAnalysisContext?.analysis?.diagnoses?.[diagnosisIndex];
      if (!diagnosis) return;
      const analysisMeta = activeAiAnalysisContext?.meta || {};
      const duplicate = (state.tasks || []).find((task) => task.sourceAnalysis === analysisMeta.key && Number(task.sourceDiagnosis) === diagnosisIndex);
      if (duplicate) {
        showToast("这条AI建议已经生成任务");
        setView("tasks");
        return;
      }
      state.tasks.push({
        id: crypto.randomUUID(),
        title: diagnosis.conclusion || "AI经营诊断任务",
        assignee: diagnosis.owner || "待分配",
        priority: diagnosis.severity === "紧急" ? "紧急" : diagnosis.severity === "重要" ? "重要" : "观察",
        store: "",
        sku: "",
        due: `${addDays(today, 1)}T18:00`,
        status: "待处理",
        source: "AI运营诊断",
        sourceReport: "",
        sourceAnomaly: "",
        sourceAnalysis: analysisMeta.key || "",
        sourceDiagnosis: diagnosisIndex,
        analysisStart: analysisMeta.start || "",
        analysisEnd: analysisMeta.end || "",
        action: diagnosis.action || "",
        acceptance: diagnosis.reviewMetric || "完成动作并回传复查指标",
        reviewAt: `${addDays(today, 2)}T10:00`,
        result: "",
        evidence: "",
        reviewResult: "",
        reviewedAt: "",
        reviewer: "",
        completedAt: ""
      });
      saveState();
      render();
      showToast("AI建议已生成任务");
    }

    function renderCachedAiAnalysis(role, range) {
      const payload = buildAiAnalysisPayload(role, range);
      const key = aiAnalysisKey(role, range, payload);
      const saved = (state.reportAnalyses || []).find((item) => item.key === key);
      renderAiAnalysis(saved?.analysis, saved);
      return { payload, key, saved };
    }

    async function runAiAnalysis(options = {}) {
      const button = document.getElementById("runAiAnalysis");
      const anchor = document.getElementById("weeklyAnchor")?.value || today;
      const role = document.getElementById("weeklyRole")?.value || "售后组";
      const range = weekRange(anchor);
      const { payload, key, saved } = renderCachedAiAnalysis(role, range);
      if (saved && !options.force) return;
      if (!payload.reports.length) {
        if (!options.silent) showToast("本周还没有日报数据");
        return;
      }

      button.disabled = true;
      button.textContent = "AI分析中…";
      document.getElementById("aiAnalysisOutput").innerHTML = `<div class="empty">正在读取六店日报、跨岗位异常和任务闭环，请稍候。</div>`;
      try {
        const response = await fetch("/api/analyze-reports", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || result.error || "分析失败");
        const record = {
          key,
          role,
          start: range.start,
          end: range.end,
          analysis: result.analysis,
          model: result.model,
          createdAt: result.createdAt,
          fingerprint: result.fingerprint
        };
        state.reportAnalyses ||= [];
        state.reportAnalyses = state.reportAnalyses.filter((item) => !(item.role === role && item.start === range.start && item.end === range.end));
        state.reportAnalyses.push(record);
        saveState();
        renderAiAnalysis(record.analysis, record);
        if (!options.silent) showToast("AI经营诊断已生成");
      } catch (error) {
        document.getElementById("aiAnalysisOutput").innerHTML = `<div class="empty">${escapeHtml(error.message || "AI分析暂时不可用")}</div>`;
        if (!options.silent) showToast("AI分析暂时不可用");
      } finally {
        button.disabled = false;
        button.textContent = "重新分析";
      }
    }

    function renderOverallWeeklyReport(range) {
      const comparisonEnd = effectiveRangeEnd(range);
      const coverageStart = reportingActivationDate() > range.start ? reportingActivationDate() : range.start;
      const reports = uniqueReportsBySlot((state.reports || []).filter((report) =>
        report.status === "已提交"
        && report.date >= range.start
        && report.date <= comparisonEnd
        && Array.isArray(report.roleMetrics)
      ));
      const previousRange = previousComparableRange(range);
      const previousReports = uniqueReportsBySlot((state.reports || []).filter((report) =>
        report.status === "已提交"
        && report.date >= previousRange.start
        && report.date <= previousRange.end
        && Array.isArray(report.roleMetrics)
      ));
      const comparisonReady = reportRangeHasCompleteRoleCoverage(previousReports, previousRange, CORE_REPORT_ROLES);
      const reportsByRole = (role) => reports.filter((report) => report.role === role);
      const previousReportsByRole = (role) => previousReports.filter((report) => report.role === role);
      const operationReports = reportsByRole("店群运营");
      const bdReports = reportsByRole("BD");
      const afterSalesReports = reportsByRole("售后组");
      const maintenanceReports = reportsByRole("店铺维护");
      const otherReports = reportsByRole("其他");
      const operationAggregates = aggregateWeeklyReports(operationReports, "店群运营");
      const bdAggregates = aggregateWeeklyReports(bdReports, "BD");
      const afterSalesAggregates = aggregateWeeklyReports(afterSalesReports, "售后组");
      const maintenanceAggregates = aggregateWeeklyReports(maintenanceReports, "店铺维护");
      const otherAggregates = aggregateWeeklyReports(otherReports, "其他");
      const previousOperationReports = previousReportsByRole("店群运营");
      const previousOperationAggregates = aggregateWeeklyReports(previousOperationReports, "店群运营");
      const previousBdAggregates = aggregateWeeklyReports(previousReportsByRole("BD"), "BD");
      const previousAfterSalesAggregates = aggregateWeeklyReports(previousReportsByRole("售后组"), "售后组");
      const previousMaintenanceAggregates = aggregateWeeklyReports(previousReportsByRole("店铺维护"), "店铺维护");
      const previousOtherAggregates = aggregateWeeklyReports(previousReportsByRole("其他"), "其他");
      const reportIds = new Set(reports.map((report) => report.id));
      const tasks = (state.tasks || []).filter((task) => reportIds.has(task.sourceReport) && taskCountsInPerformance(task));
      const weeklyAnomalies = reports.flatMap((report) => Array.isArray(report.closureItems?.anomalies) ? report.closureItems.anomalies : []);
      const weeklyDecisions = reports.flatMap((report) =>
        (Array.isArray(report.closureItems?.approvals) ? report.closureItems.approvals : [])
          .filter(meaningfulApprovalItem)
          .map((item) => ({ ...item, role: report.role, author: report.author }))
      );
      const anomalyCategories = [...weeklyAnomalies.reduce((counts, item) => {
        const category = String(item.category || "待归类").trim() || "待归类";
        counts.set(category, (counts.get(category) || 0) + 1);
        return counts;
      }, new Map()).entries()].sort((a, b) => b[1] - a[1]);
      const leadingAnomalyCategory = anomalyCategories[0]
        ? `${anomalyCategories[0][0]} ${anomalyCategories[0][1]}项`
        : "本周无新增异常";
      const previousReportIds = new Set(previousReports.map((report) => report.id));
      const previousTasks = (state.tasks || []).filter((task) => previousReportIds.has(task.sourceReport) && taskCountsInPerformance(task));
      const closed = tasks.filter((task) => task.status === "已完成").length;
      const pendingReview = tasks.filter((task) => task.status === "待复盘").length;
      const overdue = tasks.filter((task) => taskIsActive(task) && isPastDue(task.due)).length;
      const highRisks = reports.filter((report) => report.risk === "高").length;
      const coveredRoleNames = CORE_REPORT_ROLES.filter((role) => reports.some((report) => report.role === role));
      const missingRoleNames = CORE_REPORT_ROLES.filter((role) => !coveredRoleNames.includes(role));
      const reportDates = new Set(reports.map((report) => report.date).filter(Boolean));
      const coveredStores = REPORT_STORES.filter((store) =>
        reports.some((report) => (report.roleMetrics || []).some((row) => row.store === store.name))
      ).length;
      const closeRate = tasks.length ? closed / tasks.length * 100 : null;
      const previousClosed = previousTasks.filter((task) => task.status === "已完成").length;
      const previousCloseRate = previousTasks.length ? previousClosed / previousTasks.length * 100 : null;

      const gmv = aggregateTotal(operationAggregates, "gmv");
      const orders = aggregateTotal(operationAggregates, "orders");
      const affiliateGmv = aggregateTotal(operationAggregates, "affiliateGmv");
      const productCardGmv = aggregateTotal(operationAggregates, "productCardGmv");
      const adSpend = aggregateTotal(operationAggregates, "adSpend");
      const averageRoi = weightedReportRoi(operationReports);
      const previousGmv = aggregateTotal(previousOperationAggregates, "gmv");
      const previousOrders = aggregateTotal(previousOperationAggregates, "orders");
      const previousAverageRoi = weightedReportRoi(previousOperationReports);
      const sent = aggregateTotal(bdAggregates, "samplesSent");
      const sampleProducts = bdSampleProductSummary(bdReports);
      const previousSent = aggregateTotal(previousBdAggregates, "samplesSent");
      const returns = aggregateTotal(afterSalesAggregates, "returns");
      const returnAmount = aggregateTotal(afterSalesAggregates, "returnAmount");
      const badReviews = aggregateTotal(afterSalesAggregates, "badReviews");
      const unfinishedClaims = aggregateTotal(afterSalesAggregates, "unfinished");
      const previousReturns = aggregateTotal(previousAfterSalesAggregates, "returns");
      const previousBadReviews = aggregateTotal(previousAfterSalesAggregates, "badReviews");
      const latestSps = REPORT_STORES.map((store) => ({
        store: store.name,
        value: Number(afterSalesAggregates[store.name]?.values?.sps || 0)
      })).filter((item) => item.value > 0);
      const lowSps = latestSps.filter((item) => item.value < 3.5);
      const linksDone = aggregateTotal(maintenanceAggregates, "linksAdded")
        + aggregateTotal(maintenanceAggregates, "linksUpdated")
        + aggregateTotal(maintenanceAggregates, "linksRestored");
      const linksPending = aggregateTotal(maintenanceAggregates, "linksPending");
      const pluginWarnings = Object.values(maintenanceAggregates).reduce((sum, aggregate) => sum + Number(aggregate?.statuses?.pluginStatus?.异常 || 0), 0);
      const violations = aggregateTotal(maintenanceAggregates, "violations");
      const previousLinksDone = aggregateTotal(previousMaintenanceAggregates, "linksAdded")
        + aggregateTotal(previousMaintenanceAggregates, "linksUpdated")
        + aggregateTotal(previousMaintenanceAggregates, "linksRestored");
      const previousLinksPending = aggregateTotal(previousMaintenanceAggregates, "linksPending");
      const otherCompleted = aggregateTotal(otherAggregates, "completedItems");
      const otherTraining = aggregateTotal(otherAggregates, "trainingItems");
      const otherRaised = aggregateTotal(otherAggregates, "questionsRaised");
      const otherResolved = aggregateTotal(otherAggregates, "questionsResolved");
      const previousOtherCompleted = aggregateTotal(previousOtherAggregates, "completedItems");
      const previousOtherTraining = aggregateTotal(previousOtherAggregates, "trainingItems");
      const affiliateShare = gmv ? affiliateGmv / gmv : 0;
      const productShare = gmv ? productCardGmv / gmv : 0;
      const returnRate = orders ? returns / orders * 100 : null;
      const previousReturnRate = previousOrders ? previousReturns / previousOrders * 100 : null;
      const comparePercent = (current, previous) => weeklyComparePercent(current, previous, comparisonReady);
      const comparePoints = (current, previous) => weeklyComparePoints(current, previous, comparisonReady);
      const confidence = CORE_REPORT_ROLES.length ? coveredRoleNames.length / CORE_REPORT_ROLES.length * 100 : 0;
      const openTasks = [...tasks]
        .filter(taskIsActive)
        .sort((a, b) => Number(isPastDue(b.due)) - Number(isPastDue(a.due)) || String(a.due || "").localeCompare(String(b.due || "")));
      const primaryRisk = lowSps.length
        ? `${lowSps.map((item) => item.store).join("、")} SPS低于3.5`
        : unfinishedClaims ? `${unfinishedClaims}单索赔未完成`
          : overdue ? `${overdue}项任务已逾期`
            : "暂无高优先级经营风险";
      const managementHeadline = `GMV ${money(gmv)}，联盟贡献 ${(affiliateShare * 100).toFixed(1)}%；当前优先处理${lowSps.length ? "低SPS店铺" : overdue ? "逾期任务" : "关键执行事项"}。`;
      const executive = document.getElementById("weeklyExecutive");
      executive.hidden = false;
      document.querySelector(".weekly-panel")?.classList.add("executive-mode");
      executive.innerHTML = `
        <section class="weekly-executive-hero">
          <div>
            <span class="weekly-executive-kicker">管理层结论 · 数据 ${escapeHtml(coverageStart)}—${escapeHtml(comparisonEnd)}</span>
            <h3>${escapeHtml(managementHeadline)}</h3>
            <p>${coveredRoleNames.length ? `本周已覆盖 ${coveredRoleNames.length}/${CORE_REPORT_ROLES.length} 个核心岗位，共 ${reports.length} 份日报、${reportDates.size} 个有数据日期。人员数量变化不影响岗位结果口径。` : "本周暂未形成核心岗位数据。"}${missingRoleNames.length ? ` 待补岗位：${escapeHtml(missingRoleNames.join("、"))}。` : " 核心岗位结果均已覆盖。"}${coverageStart > range.start ? ` 本周从工作台正式产生日报的 ${coverageStart} 起展示。` : ""}</p>
          </div>
          <div class="weekly-executive-priority">
            <span>首要风险 <b>${escapeHtml(primaryRisk)}</b></span>
            <span>待跟进 <b>${openTasks.length}项任务 · ${overdue}项逾期</b></span>
            <span>主要问题 <b>${escapeHtml(leadingAnomalyCategory)}</b></span>
            <span>待管理层决定 <b>${weeklyDecisions.length}项</b></span>
            <span>同期口径 <b>${comparisonReady ? `${escapeHtml(previousRange.start)}—${escapeHtml(previousRange.end)}` : "上周期数据不完整"}</b></span>
          </div>
        </section>
        <div class="weekly-decision-grid">
          <article class="weekly-decision-card">
            <label>本周经营结果</label>
            <strong>${money(gmv)}</strong>
            <span>${num(orders)}单 · 广告加权ROI ${averageRoi ? averageRoi.toFixed(2) : "-"}</span>
          </article>
          <article class="weekly-decision-card">
            <label>成交结构</label>
            <strong>联盟 ${(affiliateShare * 100).toFixed(1)}%</strong>
            <span>商品卡 ${(productShare * 100).toFixed(1)}% · 观察渠道依赖</span>
          </article>
          <article class="weekly-decision-card">
            <label>达人寄样进度</label>
            <strong>${num(sent)}件</strong>
            <span>${escapeHtml(sampleProducts || "尚未填写寄样产品")}</span>
          </article>
          <article class="weekly-decision-card">
            <label>店铺健康</label>
            <strong>${returnRate === null ? "-" : `${returnRate.toFixed(2)}%`}</strong>
            <span>退货 / 退款占比 · ${lowSps.length ? `低SPS ${lowSps.map((item) => item.store).join("、")}` : "SPS无低分店铺"}</span>
          </article>
        </div>
        <section class="weekly-action-board">
          <div class="weekly-action-board-head">
            <b>需要继续跟进</b>
            <span>负责人、截止时间、状态直接来自任务中心</span>
          </div>
          ${openTasks.length ? openTasks.slice(0, 6).map((task) => `
            <div class="weekly-action-row">
              <strong>${escapeHtml(task.title)}</strong>
              <span>${escapeHtml(task.assignee || "未分配")}</span>
              <span>${task.due ? escapeHtml(formatDateTime(task.due)) : "未填写截止时间"}</span>
              <em>${isPastDue(task.due) ? "已逾期" : escapeHtml(task.status || "待处理")}</em>
            </div>
          `).join("") : `<div class="daily-management-empty">本周暂无待跟进任务。</div>`}
        </section>
        ${weeklyDecisions.length ? `
          <section class="weekly-action-board">
            <div class="weekly-action-board-head">
              <b>需要配合解决</b>
              <span>日报中的跨岗位协作事项自动集中，不再埋在个人明细里</span>
            </div>
            ${weeklyDecisions.slice(0, 6).map((item) => `
              <div class="weekly-action-row">
                <strong>${escapeHtml(item.item || "未填写事项")}</strong>
                <span>${escapeHtml(`${item.role} · ${item.author}`)}</span>
                <span>${escapeHtml(`${item.owner ? `需要 ${item.owner} 配合` : "待明确配合人"}${item.suggestion ? `｜${item.suggestion}` : ""}`)}</span>
                <em>${item.deadline ? escapeHtml(formatDateTime(item.deadline)) : "待协同"}</em>
              </div>
            `).join("")}
          </section>
        ` : ""}
      `;

      document.getElementById("weeklyMetrics").innerHTML = [
        [`${coveredRoleNames.length}/${CORE_REPORT_ROLES.length}`, "岗位数据覆盖", `${reports.length}份日报 · ${reportDates.size}个有数据日期`],
        [coveredStores, "覆盖店铺", `共 ${REPORT_STORES.length} 家店`],
        [highRisks, "高风险日报", highRisks ? "需要管理层关注" : "暂无高风险"],
        [pendingReview, "待复查任务", pendingReview ? "复查后才能关闭" : "暂无待复查"],
        [closeRate === null ? "-" : `${closeRate.toFixed(0)}%`, "任务闭环率", tasks.length ? `${closed}/${tasks.length} 已完成` : "暂无闭环任务"]
      ].map(([value, label, detail]) => `<div class="weekly-metric"><b>${value}</b><span>${label}<br>${detail}</span></div>`).join("");

      const rows = [
        ["经营结果", `GMV ${money(gmv)}｜订单 ${num(orders)}｜联盟占比 ${(affiliateShare * 100).toFixed(1)}%｜商品卡占比 ${(productShare * 100).toFixed(1)}%`, `广告成本 ${money(adSpend)}｜加权ROI ${averageRoi ? averageRoi.toFixed(2) : "-"}`, `同期：GMV ${comparePercent(gmv, previousGmv)}｜订单 ${comparePercent(orders, previousOrders)}｜ROI ${comparePoints(averageRoi, previousAverageRoi)}`],
        ["BD寄样", `寄样 ${num(sent)}件｜产品 ${sampleProducts || "未填写"}`, "达人合作阶段统一从达人中心读取", `同期：寄样 ${comparePercent(sent, previousSent)}`],
        ["售后与健康", `退货 / 退款 ${num(returns)}单 / ${money(returnAmount)}｜单量占比 ${returnRate === null ? "-" : `${returnRate.toFixed(2)}%`}｜新增差评 ${num(badReviews)}条`, `${lowSps.length ? `低SPS：${lowSps.map((item) => `${item.store} ${item.value.toFixed(1)}`).join("、")}` : "SPS无低分店铺"}｜未完成索赔 ${num(unfinishedClaims)}单`, `同期：单量 ${comparePercent(returns, previousReturns)}｜占比 ${previousReturnRate === null || returnRate === null ? "-" : `${comparePoints(returnRate, previousReturnRate)}个百分点`}｜差评 ${comparePercent(badReviews, previousBadReviews)}`],
        ["店铺维护", `完成链接维护 ${num(linksDone)}项｜待处理 ${num(linksPending)}项`, `插件异常 ${num(pluginWarnings)}店次｜新增违规 ${num(violations)}条`, `完成维护 ${comparePercent(linksDone, previousLinksDone)}｜待处理 ${comparePercent(linksPending, previousLinksPending)}`],
        ["新人 / 其他", `参与 ${new Set(otherReports.map((report) => normalizedReportAuthor(report.author)).filter(Boolean)).size}人｜完成事项 ${num(otherCompleted)}项｜学习 ${num(otherTraining)}项`, `问题提出 ${num(otherRaised)}个｜已解决 ${num(otherResolved)}个`, `完成事项 ${comparePercent(otherCompleted, previousOtherCompleted)}｜学习 ${comparePercent(otherTraining, previousOtherTraining)}`],
        ["任务闭环", `新增 ${tasks.length}项｜完成 ${closed}项｜待复查 ${pendingReview}项｜逾期 ${overdue}项`, closeRate === null ? "暂无闭环任务" : `闭环率 ${closeRate.toFixed(0)}%`, !comparisonReady ? "上周期数据不完整" : previousCloseRate === null ? "-" : `闭环率较上周 ${closeRate === null ? "-" : `${closeRate - previousCloseRate >= 0 ? "+" : ""}${(closeRate - previousCloseRate).toFixed(1)}个百分点`}`]
      ];
      document.getElementById("weeklyTable").innerHTML = `
        <details class="weekly-detail-toggle">
          <summary>查看完整数据明细与同期环比</summary>
          <div class="weekly-detail-table">
            <table>
              <thead><tr><th>运营模块</th><th>本周结果</th><th>风险与待办</th><th>同期环比</th></tr></thead>
              <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>
          </div>
        </details>
      `;

      document.getElementById("weeklyDigest").textContent = [
        `【运营整体周报｜${range.start}—${comparisonEnd}】`,
        `岗位口径：${coverageStart}—${comparisonEnd}${coverageStart > range.start ? "（从工作台启用日起展示）" : ""}；不按固定人数计算`,
        `环比口径：${comparisonReady ? `对比 ${previousRange.start}—${previousRange.end} 同期数据` : `上周期 ${previousRange.start}—${previousRange.end} 数据不完整，已禁止生成环比`}`,
        `核心岗位 ${coveredRoleNames.length}/${CORE_REPORT_ROLES.length} 个｜日报 ${reports.length} 份｜有数据 ${reportDates.size} 天｜覆盖 ${coveredStores}/${REPORT_STORES.length} 店｜高风险 ${highRisks} 份`,
        "",
        `1. 经营：GMV ${money(gmv)}｜订单 ${num(orders)}｜联盟占比 ${(affiliateShare * 100).toFixed(1)}%｜商品卡占比 ${(productShare * 100).toFixed(1)}%｜广告加权ROI ${averageRoi ? averageRoi.toFixed(2) : "-"}`,
        `2. BD寄样：${num(sent)}件｜产品 ${sampleProducts || "未填写"}`,
        `3. 售后：退货 / 退款 ${num(returns)}单 / ${money(returnAmount)}｜单量占比 ${returnRate === null ? "-" : `${returnRate.toFixed(2)}%`}｜差评 ${num(badReviews)}条｜低SPS店铺 ${lowSps.length ? lowSps.map((item) => item.store).join("、") : "无"}`,
        `4. 维护：链接完成 ${num(linksDone)}项｜待处理 ${num(linksPending)}项｜插件异常 ${num(pluginWarnings)}店次｜违规 ${num(violations)}条`,
        `5. 闭环：任务 ${tasks.length}项｜完成 ${closed}项｜待复查 ${pendingReview}项｜逾期 ${overdue}项`,
        `6. 问题归因：${anomalyCategories.length ? anomalyCategories.map(([category, count]) => `${category}${count}项`).join("｜") : "本周无新增异常"}｜待管理层决定 ${weeklyDecisions.length}项`,
        `7. 环比：GMV ${comparePercent(gmv, previousGmv)}｜订单 ${comparePercent(orders, previousOrders)}｜广告ROI ${comparePoints(averageRoi, previousAverageRoi)}｜寄样 ${comparePercent(sent, previousSent)}｜退货 / 退款 ${comparePercent(returns, previousReturns)}`,
        "",
        `下周重点：${[
          lowSps.length ? `修复 ${lowSps.map((item) => item.store).join("、")} SPS` : "",
          linksPending ? "关闭待处理链接" : "",
          overdue ? "处理逾期任务" : ""
        ].filter(Boolean).join("；") || "保持当前节奏，继续观察经营、达人、售后和店铺健康变化。"}`
      ].join("\n");

      const overallInsights = [
        { level: highRisks ? "high" : "good", label: "经营风险", title: `${highRisks} 份高风险日报`, body: highRisks ? "按影响GMV、平台权益和客户体验排序处理，并确保每项进入任务闭环。" : "本周未发现高风险日报，继续观察跨岗位联动指标。" },
        { level: linksPending ? "medium" : "good", label: "执行阻塞", title: `待处理链接 ${linksPending} 项｜寄样 ${sent} 件`, body: "达人合作阶段以达人中心为准；日报只承担寄样事实与产品数量，避免重复填报。" },
        { level: lowSps.length || unfinishedClaims ? "high" : "good", label: "店铺健康", title: `低SPS店铺 ${lowSps.length} 家｜未完成索赔 ${unfinishedClaims} 单`, body: "将SPS、退货退款、差评和问题SKU放在一起判断，不用新增订单掩盖售后风险。" },
        { level: overdue || pendingReview ? "medium" : "good", label: "任务闭环", title: `待复查 ${pendingReview} 项｜逾期 ${overdue} 项`, body: "执行结果必须带证据进入后续日报复查，关闭后才能计入闭环率。" }
      ];
      document.getElementById("weeklyInsights").innerHTML = renderInsightCards(overallInsights);
      const confidenceEl = document.getElementById("weeklyConfidence");
      confidenceEl.textContent = `岗位覆盖 ${coveredRoleNames.length}/${CORE_REPORT_ROLES.length}`;
      confidenceEl.title = `共 ${reports.length} 份日报，涉及 ${reportDates.size} 个日期；不按固定人数计算`;
      confidenceEl.className = `badge ${confidence >= 80 ? "green" : confidence >= 50 ? "amber" : "red"}`;
      renderCachedAiAnalysis("运营总览", range);
    }

    function renderWeeklyReport() {
      const anchor = document.getElementById("weeklyAnchor")?.value || today;
      const role = document.getElementById("weeklyRole")?.value || "售后组";
      const range = weekRange(anchor);
      if (role === "运营总览") {
        renderOverallWeeklyReport(range);
        return;
      }
      document.querySelector(".weekly-panel")?.classList.remove("executive-mode");
      const weeklyExecutive = document.getElementById("weeklyExecutive");
      weeklyExecutive.hidden = true;
      weeklyExecutive.innerHTML = "";
      const reports = uniqueReportsBySlot((state.reports || []).filter((report) => report.status === "已提交" && report.role === role && report.date >= range.start && report.date <= range.end && Array.isArray(report.roleMetrics)));
      const aggregates = aggregateWeeklyReports(reports, role);
      const reportIds = new Set(reports.map((report) => report.id));
      const tasks = (state.tasks || []).filter((task) => reportIds.has(task.sourceReport) && taskCountsInPerformance(task));
      const analysisTasks = (state.tasks || []).filter((task) => task.source === "AI运营诊断" && task.analysisStart === range.start && task.analysisEnd === range.end && taskCountsInPerformance(task));
      analysisTasks.forEach((task) => {
        if (!tasks.some((item) => item.id === task.id)) tasks.push(task);
      });
      const closed = tasks.filter((task) => task.status === "已完成").length;
      const overdue = tasks.filter((task) => taskIsActive(task) && isPastDue(task.due)).length;
      const pendingReview = tasks.filter((task) => task.status === "待复盘").length;
      const displayRows = weeklyRows(role);
      const coveredStores = role === "店铺维护"
        ? (reports.length ? 6 : 0)
        : role === "其他"
          ? new Set(reports.map((report) => normalizedReportAuthor(report.author)).filter(Boolean)).size
          : REPORT_STORES.filter((store) => aggregates[store.name]?.reportDays.size).length;
      const coverageLabel = role === "其他" ? "参与人员" : "覆盖店铺";
      const coverageDetail = role === "其他" ? "按填写人去重" : `共 ${REPORT_STORES.length} 家店`;
      const highRisks = reports.filter((report) => report.risk === "高").length;
      const closeRate = tasks.length ? closed / tasks.length * 100 : null;

      document.getElementById("weeklyMetrics").innerHTML = [
        [reports.length, "日报提交", `${range.start}—${range.end}`],
        [coveredStores, coverageLabel, coverageDetail],
        [highRisks, "高风险日报", highRisks ? "需要经营负责人关注" : "本周暂无高风险"],
        [pendingReview, "待复查任务", pendingReview ? "复查后才能计入闭环" : "暂无待复查"],
        [closeRate === null ? "-" : `${closeRate.toFixed(0)}%`, "任务闭环率", tasks.length ? `${closed}/${tasks.length} 已完成` : "暂无闭环任务"]
      ].map(([value, label, detail]) => `<div class="weekly-metric"><b>${value}</b><span>${label}<br>${detail}</span></div>`).join("");

      const schema = reportSchema(role);
      const displayColumns = weeklyDisplayColumns(role, schema);
      const firstColumnLabel = role === "其他" ? "人员 / 汇总" : "店铺";
      const showReportDays = role !== "售后组";
      document.getElementById("weeklyTable").innerHTML = role === "BD" ? `
        <table>
          <thead><tr><th>店铺</th><th>寄样产品</th><th>寄样数量</th></tr></thead>
          <tbody>${REPORT_STORES.map((store) => {
            const aggregate = aggregates[store.name];
            return `
            <tr>
              <td>${escapeHtml(store.name)}<span class="store-group">${escapeHtml(store.group)}</span></td>
              <td>${escapeHtml(bdSampleProductSummary(reports, store.name) || "-")}</td>
              <td>${aggregate.present.has("samplesSent") ? num(aggregate.values.samplesSent) : "-"}</td>
            </tr>
          `}).join("")}</tbody>
        </table>
      ` : role === "店铺维护" ? `
        <table>
          <thead><tr><th>店铺</th><th>违规 / 异常</th><th>原因</th><th>处理结果</th></tr></thead>
          <tbody>${maintenanceWeeklyIssues(reports).map((row) => `
            <tr>
              <td>${escapeHtml(row.store)}<span class="store-group">${escapeHtml(row.date)}</span></td>
              <td>${escapeHtml(row.issue)}</td>
              <td>${escapeHtml(row.reason)}</td>
              <td>${escapeHtml(row.result)}</td>
            </tr>
          `).join("") || `<tr><td colspan="4">本周未记录店铺违规或异常</td></tr>`}</tbody>
        </table>
      ` : `
        <table>
          <thead><tr><th>${firstColumnLabel}</th>${showReportDays ? "<th>填报天数</th>" : ""}${displayColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
          <tbody>${displayRows.map((store) => {
            const aggregate = aggregates[store.name];
            return `<tr><td>${escapeHtml(store.name)}<span class="store-group">${store.group}</span></td>${showReportDays ? `<td>${aggregate.reportDays.size || "-"}</td>` : ""}${displayColumns.map((column) => {
              const value = weeklyDisplayValue(column, aggregate);
              return `<td>${escapeHtml(value || "-")}</td>`;
            }).join("")}</tr>`;
          }).join("")}</tbody>
        </table>
      `;
      document.getElementById("weeklyDigest").textContent = buildWeeklyDigest(role, range, reports, aggregates, {
        total: tasks.length,
        closed,
        overdue
      });
      renderOperationalInsights(role, range, reports, aggregates);
      renderCachedAiAnalysis(role, range);
    }

    const CORE_REPORT_ROLES = ["售后组", "BD", "店铺维护", "店群运营"];

    function reportRangeSubmissionCoverage(reports, range = selectedReportDataRange()) {
      const submitted = reports || [];
      const coveredRoles = new Set(submitted.map((report) => report.role).filter((role) => CORE_REPORT_ROLES.includes(role)));
      const missingRoles = CORE_REPORT_ROLES.filter((role) => !coveredRoles.has(role));
      const reportDates = new Set(submitted.map((report) => report.date).filter(Boolean));
      const date = range.isSingle ? localDate(range.start) : null;
      const isRestDay = Boolean(date && [0, 6].includes(date.getDay()));
      return {
        covered: coveredRoles.size,
        target: CORE_REPORT_ROLES.length,
        isRestDay,
        reportCount: submitted.length,
        activeDays: reportDates.size,
        detail: isRestDay
          ? (submitted.length
            ? `值班日报 ${submitted.length} 份，覆盖 ${coveredRoles.size} 个核心岗位${coveredRoles.size ? `：${[...coveredRoles].join("、")}` : ""}`
            : "休息日暂无值班日报；有人值班时照常提交并计入当日数据")
          : missingRoles.length
            ? `已覆盖 ${coveredRoles.size}/${CORE_REPORT_ROLES.length} 个核心岗位；待补岗位结果：${missingRoles.join("、")}；人员数量不作为考核口径`
            : `核心岗位结果已覆盖；共 ${submitted.length} 份日报，人员增减不影响岗位口径`
      };
    }

    function renderReports() {
      const range = selectedReportDataRange();
      const sourceReports = [...(state.reports || [])].sort((a, b) => {
        const dateCompare = String(b.date || "").localeCompare(String(a.date || ""));
        return dateCompare || String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });
      const rangeRecords = uniqueReportsBySlot(sourceReports.filter((item) => item.date >= range.start && item.date <= range.end))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
      const submittedReports = uniqueReportsBySlot(sourceReports.filter((item) =>
        item.date >= range.start
        && item.date <= range.end
        && item.status === "已提交"
      ));
      const rangeReportIds = new Set(submittedReports.map((report) => report.id));
      const reportTasks = state.tasks.filter((item) => rangeReportIds.has(item.sourceReport) && taskIsActive(item));
      const overdue = reportTasks.filter((item) => isPastDue(item.due)).length;
      const submittedUnits = submittedReports.length;
      const submissionCoverage = reportRangeSubmissionCoverage(submittedReports, range);
      const rangeTotals = aggregateByRange(range);
      const rangeRoi = rangeTotals.adSpend ? rangeTotals.adGmv / rangeTotals.adSpend : 0;
      const rangeSpsRisks = [...aggregateStoresByRange(range).entries()]
        .filter(([, entry]) => Number(entry.sps || 0) > 0 && Number(entry.sps) < 3.5)
        .map(([store]) => store);
      const coveredRoleSet = new Set(submittedReports.map((report) => report.role));
      const highRiskReports = submittedReports.filter((report) => report.risk === "高");
      const primaryHighRisk = highRiskReports[0];
      const primaryHighRiskSummary = reportLines(primaryHighRisk?.anomalies || "")[0]
        ?.split("｜")
        .slice(0, 2)
        .join("｜");

      document.getElementById("reportProgress").textContent = submissionCoverage.isRestDay
        ? submittedUnits ? `值班日报 ${submittedUnits}份 · ${submissionCoverage.covered}个岗位` : "休息日 · 暂无值班日报"
        : `${submissionCoverage.covered}/${submissionCoverage.target} 岗位已提交`;
      document.getElementById("reportProgress").title = submissionCoverage.detail;
      document.getElementById("reportSummaryTitle").textContent = `${range.label}团队日报`;
      document.getElementById("reportPulseTitle").textContent = `${range.label}团队日报`;
      document.getElementById("reportSummarySubtitle").textContent = range.isSingle
        ? "按岗位结果汇总，不绑定固定人数；异常与跟进同步任务中心。"
        : `${dataRangeDateText(range)} 汇总；按岗位结果覆盖，不按人员数量计算。`;
      document.getElementById("reportRoleCoverage").innerHTML = CORE_REPORT_ROLES.map((role) => `
        <span class="${coveredRoleSet.has(role) ? "is-covered" : "is-missing"}">
          <i aria-hidden="true">${coveredRoleSet.has(role) ? "✓" : "·"}</i>${escapeHtml(role)}
        </span>
      `).join("");
      document.getElementById("reportMetrics").innerHTML = [
        [`${range.metricLabel}经营`, money(rangeTotals.gmv), `订单 ${num(rangeTotals.orders)} · 加权ROI ${rangeRoi ? rangeRoi.toFixed(2) : "-"}`],
        ["岗位数据覆盖", submissionCoverage.isRestDay
          ? (submittedUnits ? `${submissionCoverage.covered}个岗位` : "暂无值班日报")
          : `${submissionCoverage.covered}/${submissionCoverage.target}`, submissionCoverage.detail],
        ["店铺健康", rangeSpsRisks.length ? `${rangeSpsRisks.length}家预警` : "正常", rangeSpsRisks.length ? `最新SPS偏低：${rangeSpsRisks.join("、")}` : "所选范围暂无低SPS店铺"],
        ["行动闭环", `${reportTasks.length}项`, overdue ? `${overdue}项逾期，需要升级` : "暂无逾期任务"]
      ].map(([value, number, detail]) => `
        <div class="report-summary-card"><b>${number}</b><span>${value}<br>${detail}</span></div>
      `).join("");

      const prioritySignals = [
        {
          type: "result",
          label: "今日最重要结果",
          title: rangeTotals.gmv ? `${money(rangeTotals.gmv)} · ${num(rangeTotals.orders)} 单` : "等待经营结果",
          detail: rangeRoi ? `加权 ROI ${rangeRoi.toFixed(2)}，随日报持续更新` : "岗位日报提交后自动形成经营结果"
        },
        {
          type: rangeSpsRisks.length || highRiskReports.length || overdue ? "risk" : "stable",
          label: "最高经营风险",
          title: rangeSpsRisks.length
            ? `${rangeSpsRisks[0]} 店铺健康预警`
            : highRiskReports.length
              ? `${highRiskReports[0].role} 上报高风险`
            : overdue
              ? `${overdue} 项任务已逾期`
              : "当前无高风险",
          detail: rangeSpsRisks.length
            ? `SPS 低于 3.5${highRiskReports.length ? ` · 另有 ${highRiskReports.length} 份高风险日报` : ""}`
            : highRiskReports.length
              ? `${primaryHighRisk.author || "岗位负责人"}｜${primaryHighRiskSummary || "请查看日报异常明细"}`
            : overdue
              ? "请进入任务中心确认负责人和截止时间"
              : "继续观察经营、履约和岗位提交变化"
        },
        {
          type: "closure",
          label: "当前待闭环",
          title: reportTasks.length ? `${reportTasks.length} 项经营动作` : "暂无待闭环动作",
          detail: overdue
            ? `${overdue} 项逾期，需要升级处理`
            : reportTasks.length
              ? "按截止时间进入任务中心逐项处理"
              : "异常确认后将自动同步到任务中心"
        }
      ];
      document.getElementById("reportPrioritySignals").innerHTML = prioritySignals.map((signal) => `
        <article class="report-priority-card ${escapeHtml(signal.type)}">
          <span>${escapeHtml(signal.label)}</span>
          <b>${escapeHtml(signal.title)}</b>
          <small>${escapeHtml(signal.detail)}</small>
        </article>
      `).join("");

      document.getElementById("dailyDigest").textContent = buildDailyDigest(submittedReports, range);
      document.getElementById("reportManagementTitle").textContent = range.isSingle ? `${range.label}行动重点` : "期间行动重点";
      document.getElementById("reportPrioritySignals").setAttribute("aria-label", range.isSingle ? `${range.label}经营重点` : "期间经营重点");
      renderDailyManagementBoard(submittedReports, range);
      renderReportDateControl(range);
      document.getElementById("reportRecordCount").textContent = `${rangeRecords.length} 份日报`;
      const totalReportPages = Math.max(1, Math.ceil(rangeRecords.length / reportPageSize));
      reportPage = Math.min(Math.max(1, reportPage), totalReportPages);
      const reportPageStart = (reportPage - 1) * reportPageSize;
      const pageReports = rangeRecords.slice(reportPageStart, reportPageStart + reportPageSize);
      document.getElementById("reportCards").innerHTML = pageReports.length ? pageReports.map((report) => {
        const canEditToday = reportWasSubmittedToday(report)
          && normalizedReportAuthor(report.author) === normalizedReportAuthor(currentReportAuthor());
        return `
        <article class="report-card">
          <div class="report-card-head">
            <div><b>${escapeHtml(report.role)}｜${escapeHtml(report.author)}</b><br><small>${escapeHtml(report.date)} · ${escapeHtml(report.stores || "未指定店铺")}</small></div>
            <div class="report-card-actions">
              ${canEditToday ? `<button class="small-btn" data-edit-report="${escapeHtml(report.id)}" type="button">编辑本次日报</button>` : ""}
              <span class="badge ${report.risk === "高" ? "red" : report.risk === "中" ? "amber" : "green"}">${escapeHtml(report.risk || "无")}风险</span>
            </div>
          </div>
          ${renderReportMetricTable(report)}
          <div class="report-detail-grid">
            <div class="report-section report-result"><strong>今日结果</strong><p class="report-section-scroll">${escapeHtml(reportResultsText(report))}</p></div>
            <div class="report-section"><strong>核心异常</strong><p>${escapeHtml(report.anomalies || "无")}</p></div>
            <div class="report-section"><strong>昨日复查</strong><p>${escapeHtml(report.reviews || "无")}</p></div>
            <div class="report-section"><strong>明日跟进</strong><p>${escapeHtml(report.tasksText || "无")}</p>${renderReportTaskLinks(report)}</div>
            <div class="report-section"><strong>需要配合解决</strong><p>${escapeHtml(report.approvals || "无")}</p></div>
          </div>
        </article>
      `;
      }).join("") : `<div class="empty">所选范围暂无日报。提交后系统会自动生成团队摘要并同步任务。</div>`;
      const reportPager = document.getElementById("reportPager");
      reportPager.hidden = rangeRecords.length <= reportPageSize;
      document.getElementById("reportPageInfo").textContent = `第 ${reportPage} / ${totalReportPages} 页 · 每页10条`;
      document.getElementById("reportPrevPage").disabled = reportPage <= 1;
      document.getElementById("reportNextPage").disabled = reportPage >= totalReportPages;
      renderWeeklyReport();
      renderReportWorkGuide();
    }

    function renderReportTaskLinks(report) {
      const tasks = (state.tasks || []).filter((task) => task.sourceReport === report.id);
      if (!tasks.length) return "";
      return `<div class="report-task-links">${tasks.map((task) => `
        <button class="report-task-link" data-view-task="${escapeHtml(task.id)}" type="button">
          查看任务 · ${escapeHtml(task.title || "未命名")} · ${escapeHtml(task.status || "待处理")}
        </button>
      `).join("")}</div>`;
    }
