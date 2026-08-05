    const PROFIT_PRICE_CHANGE_LABELS = { planned: "计划调价", correction: "数据修正" };

    function profitUiEscape(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function profitUiMoney(value) {
      const number = profitNumber(value);
      return `${number < 0 ? "−" : ""}$${Math.abs(number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function profitUiPercent(value, empty = "—") {
      return value === null || value === undefined || !Number.isFinite(Number(value))
        ? empty
        : `${(Number(value) * 100).toFixed(1)}%`;
    }

    function profitUiSignedPercent(value) {
      if (value === null || value === undefined || !Number.isFinite(Number(value))) return "暂无上期对比";
      const number = Number(value);
      if (Math.abs(number) < 0.005) return "与上期基本持平";
      return `${number > 0 ? "↑" : "↓"} ${Math.abs(number * 100).toFixed(1)}%`;
    }

    function profitUiDateLabel(dateKey) {
      const date = profitIsoDate(dateKey);
      return date ? `${date.getUTCMonth() + 1}/${date.getUTCDate()}` : dateKey;
    }

    function profitLifecycleLabel(status) {
      return ({ draft: "准备上线", active: "正常运营", paused: "暂停运营", delisted: "已下架", archived: "已归档" })[status] || status;
    }

    function createProfitWorkspaceState(anchorDate = "2026-08-05") {
      return {
        repository: createProfitRepository(anchorDate),
        activeDate: anchorDate,
        view: "overview",
        activeProductId: null,
        activeListingId: null,
        storeFilter: "",
        lifecycleFilter: "",
        expandedSkuIds: new Set(),
        historyExpanded: false,
        managementOpen: false,
        pendingPriceChange: null
      };
    }

    function profitStatusBadge(health) {
      return `<span class="profit-health ${health.tone}"><i></i>${profitUiEscape(health.label)}</span>`;
    }

    function renderProfitWorkspaceHeader(state, title, description) {
      const stores = state.repository.getState().stores;
      return `<header class="profit-workspace-head">
        <div class="profit-workspace-title">
          <div class="profit-eyebrow"><span>PRODUCT PROFIT CONTROL</span><em>演示数据 · 刷新后重置</em></div>
          <h2>${profitUiEscape(title)}</h2>
          <p>${profitUiEscape(description)}</p>
        </div>
        <div class="profit-head-controls">
          <label><span>经营日期</span><input data-profit-date-filter type="date" value="${state.activeDate}" /></label>
          ${state.view === "overview" ? `<label><span>店铺</span><select data-profit-store-filter><option value="">全部店铺</option>${stores.map((store) => `<option value="${store.id}" ${state.storeFilter === store.id ? "selected" : ""}>${profitUiEscape(store.name)}</option>`).join("")}</select></label><label><span>链接状态</span><select data-profit-lifecycle-filter><option value="">全部状态</option>${PROFIT_LISTING_LIFECYCLES.filter((status) => status !== "archived").map((status) => `<option value="${status}" ${state.lifecycleFilter === status ? "selected" : ""}>${profitLifecycleLabel(status)}</option>`).join("")}</select></label>` : ""}
          <button class="primary profit-primary-action" data-profit-add-listing type="button">＋ 新增链接</button>
        </div>
      </header>`;
    }

    function renderProfitMetric(label, value, options = {}) {
      return `<div class="profit-metric ${options.tone || ""}"><span>${profitUiEscape(label)}</span><b>${value}</b>${options.detail ? `<small>${profitUiEscape(options.detail)}</small>` : ""}</div>`;
    }

    function renderProfitAttentionQueue(items) {
      return `<aside class="profit-attention-panel">
        <div class="profit-block-title"><div><span>今日动作</span><h3>先处理这些</h3></div><b>${items.length}</b></div>
        <div class="profit-attention-list">${items.length ? items.map((item) => `<button data-profit-open-listing="${item.listingId}" class="${item.tone}" type="button"><i></i><span><b>${profitUiEscape(item.title)}</b><small>${profitUiEscape(item.detail)}</small></span><em>处理</em></button>`).join("") : '<div class="profit-calm-state"><i>✓</i><b>今日无需优先处理</b><span>所有链接均已填写，暂无贡献亏损或待复盘调价。</span></div>'}</div>
      </aside>`;
    }

    function renderProfitProductOverview(state) {
      const rows = selectProductProfitRows(state.repository, state.activeDate, {
        storeId: state.storeFilter,
        lifecycleStatus: state.lifecycleFilter
      });
      const summary = selectProfitWorkspaceSummary(rows);
      const attention = selectProfitAttentionItems(rows);
      return `<div class="profit-overview-layout">
        <main class="profit-overview-main">
          <section class="profit-summary-band" aria-label="产品利润总览">
            ${renderProfitMetric("产品总销量", `${summary.units.toLocaleString("en-US")} 件`, { detail: `${summary.productCount} 个产品 · ${summary.listingCount} 条链接` })}
            ${renderProfitMetric("产品总销售额", profitUiMoney(summary.revenue), { detail: `${summary.activeListingCount} 条正在运营` })}
            ${renderProfitMetric("链接贡献利润合计", profitUiMoney(summary.contributionProfit), { tone: summary.contributionProfit < 0 ? "negative" : "featured", detail: `贡献利润率 ${profitUiPercent(summary.contributionMargin)}` })}
            ${renderProfitMetric("今日待填写", `${summary.pendingEntryCount} 条`, { tone: summary.pendingEntryCount ? "attention" : "", detail: `${summary.observationCount} 条调价观察中` })}
          </section>
          <section class="profit-product-section">
            <div class="profit-block-title"><div><span>按产品管理</span><h3>产品经营总盘</h3><p>先看同一个品的整体结果，再进入具体店铺链接。</p></div><b>${rows.length} 个产品</b></div>
            <div class="profit-product-table-wrap"><table class="profit-product-table">
              <thead><tr><th>产品</th><th>运营链接</th><th>今日销量</th><th>销售额</th><th>链接贡献利润</th><th>贡献利润率</th><th>调价观察</th><th>状态</th><th></th></tr></thead>
              <tbody>${rows.map((row) => `<tr data-profit-open-product="${row.product.id}" tabindex="0">
                <td><div class="profit-product-name"><span>${profitUiEscape(row.product.code)}</span><div><b>${profitUiEscape(row.product.name)}</b><small>${profitUiEscape(row.product.category)}</small></div></div></td>
                <td><b>${row.activeListingCount}</b><small> / ${row.listingCount} 条</small></td>
                <td class="profit-num"><b>${row.result.units.toLocaleString("en-US")}</b><small>件</small></td>
                <td class="profit-num">${profitUiMoney(row.result.revenue)}</td>
                <td class="profit-num ${row.result.contributionProfit < 0 ? "negative" : "positive"}"><b>${profitUiMoney(row.result.contributionProfit)}</b></td>
                <td class="profit-num">${profitUiPercent(row.result.contributionMargin)}</td>
                <td>${row.observationCount ? `<span class="profit-observation-count">${row.observationCount} 个进行中</span>` : '<span class="profit-muted">—</span>'}</td>
                <td>${profitStatusBadge(row.health)}</td>
                <td><button class="profit-row-action" data-profit-open-product="${row.product.id}" type="button">查看链接 <span>→</span></button></td>
              </tr>`).join("")}</tbody>
            </table></div>
            <div class="profit-product-cards">${rows.map((row) => `<button data-profit-open-product="${row.product.id}" type="button"><header><span>${profitUiEscape(row.product.code)}</span><div><b>${profitUiEscape(row.product.name)}</b><small>${row.listingCount} 条链接</small></div>${profitStatusBadge(row.health)}</header><dl><div><dt>销量</dt><dd>${row.result.units.toLocaleString("en-US")}</dd></div><div><dt>贡献利润</dt><dd class="${row.result.contributionProfit < 0 ? "negative" : "positive"}">${profitUiMoney(row.result.contributionProfit)}</dd></div><div><dt>利润率</dt><dd>${profitUiPercent(row.result.contributionMargin)}</dd></div></dl><footer>查看全部链接 <span>→</span></footer></button>`).join("")}</div>
          </section>
        </main>
        ${renderProfitAttentionQueue(attention)}
      </div>`;
    }

    function renderProfitProductDetail(state, productId) {
      const productRow = selectProductProfitRows(state.repository, state.activeDate).find((row) => row.product.id === productId);
      if (!productRow) return '<div class="profit-empty-state">未找到该产品。</div>';
      const result = productRow.result;
      return `<div class="profit-detail-page">
        <nav class="profit-breadcrumb"><button data-profit-back-overview type="button">产品总盘</button><span>/</span><b>${profitUiEscape(productRow.product.code)} · ${profitUiEscape(productRow.product.name)}</b></nav>
        <section class="profit-product-hero">
          <div><span class="profit-code-mark">${profitUiEscape(productRow.product.code)}</span><div><small>${profitUiEscape(productRow.product.category)} · 产品整体</small><h2>${profitUiEscape(productRow.product.name)}</h2><p>合并 ${productRow.listingCount} 条店铺链接后判断整体动销与利润，再进入单条链接处理价格。</p></div></div>
          ${profitStatusBadge(productRow.health)}
        </section>
        <section class="profit-summary-band product-detail">
          ${renderProfitMetric("产品总销量", `${result.units.toLocaleString("en-US")} 件`, { detail: `${productRow.activeListingCount} 条有效链接` })}
          ${renderProfitMetric("产品总销售额", profitUiMoney(result.revenue))}
          ${renderProfitMetric("链接贡献利润合计", profitUiMoney(result.contributionProfit), { tone: result.contributionProfit < 0 ? "negative" : "featured", detail: `贡献利润率 ${profitUiPercent(result.contributionMargin)}` })}
          ${renderProfitMetric("调价观察", `${productRow.observationCount} 个`, { tone: productRow.observationCount ? "attention" : "", detail: `${productRow.pendingListingCount} 条链接待填写` })}
        </section>
        <section class="profit-listing-section">
          <div class="profit-block-title"><div><span>同品跨店比较</span><h3>${profitUiEscape(productRow.product.code)} 的全部链接</h3><p>售价在各链接独立维护；点击链接进入当日 SKU 填写。</p></div><button class="primary" data-profit-add-listing="${productRow.product.id}" type="button">＋ 新增此产品链接</button></div>
          <div class="profit-listing-grid">${productRow.listings.map((row) => {
            const sevenDayUnits = row.skuRows.reduce((sum, skuRow) => sum + skuRow.trend.averageUnits, 0);
            const unitChangeValues = row.skuRows.map((skuRow) => skuRow.trend.unitChange).filter((value) => value !== null);
            const unitChange = unitChangeValues.length ? profitAverage(unitChangeValues) : null;
            return `<article class="profit-listing-card ${row.listing.lifecycleStatus}">
              <header><div><span>${profitUiEscape(row.store?.name || "未分配店铺")}</span><h4>${profitUiEscape(row.listing.displayName)}</h4><small>${profitUiEscape(row.listing.platformListingId)} · ${profitUiEscape(row.listing.ownerName)}</small></div><span class="profit-lifecycle ${row.listing.lifecycleStatus}">${profitLifecycleLabel(row.listing.lifecycleStatus)}</span></header>
              <div class="profit-listing-main"><div><span>今日销量</span><b>${row.result.units.toLocaleString("en-US")}<small> 件</small></b><em class="${unitChange !== null && unitChange < 0 ? "down" : "up"}">近 7 天日均 ${sevenDayUnits.toFixed(0)} · ${profitUiSignedPercent(unitChange)}</em></div><div><span>链接贡献利润</span><b class="${row.result.contributionProfit < 0 ? "negative" : "positive"}">${profitUiMoney(row.result.contributionProfit)}</b><em>贡献利润率 ${profitUiPercent(row.result.contributionMargin)}</em></div></div>
              <div class="profit-listing-meta"><span>${row.skuRows.filter((item) => item.listingSku.active).length} 个 SKU</span><span>${row.observations.length ? `${row.observations.length} 个观察中` : "无调价观察"}</span>${profitStatusBadge(row.health)}</div>
              <footer><a href="${profitUiEscape(row.listing.url)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${profitUiEscape(row.listing.displayName)} 商品链接">商品页 ↗</a><button data-profit-open-listing="${row.listing.id}" type="button">${row.result.pendingSkuCount ? "继续填写" : "查看并调整"} <span>→</span></button></footer>
            </article>`;
          }).join("")}</div>
        </section>
      </div>`;
    }

    function renderProfitSkuTrend(row, expanded) {
      if (!expanded) return "";
      return `<tr class="profit-sku-trend-row"><td colspan="8"><div class="profit-sku-trend"><header><div><b>最近 7 天价格与动销</b><span>价格变化 ${profitUiSignedPercent(row.trend.priceChange)} · 日均销量 ${row.trend.averageUnits.toFixed(1)} 件</span></div>${row.observation ? `<em>调价观察至 ${row.observation.observationEnd}</em>` : ""}</header><div class="profit-trend-points">${row.trend.points.map((point) => `<div class="${point.dateKey === row.fact.dateKey ? "current" : ""}"><span>${profitUiDateLabel(point.dateKey)}</span><b>${point.price === null ? "未填" : profitUiMoney(point.price)}</b><small>${point.units === null ? "待填" : `${point.units} 件`}</small><em class="${point.skuGrossProfit < 0 ? "negative" : ""}">${profitUiMoney(point.skuGrossProfit)}</em></div>`).join("")}</div></div></td></tr>`;
    }

    function renderProfitListingManagement(state, listingResult) {
      if (!state.managementOpen) return "";
      return `<div class="profit-management-layer"><button class="profit-management-overlay" data-profit-close-management type="button" aria-label="关闭设置"></button><aside class="profit-management-drawer" aria-label="链接与 SKU 设置">
        <header><div><span>链接与 SKU 设置</span><h3>${profitUiEscape(listingResult.listing.displayName)}</h3><small>停用和下架都保留历史数据</small></div><button data-profit-close-management type="button" aria-label="关闭">×</button></header>
        <section><div class="profit-management-section-head"><div><b>链接状态</b><small>${profitUiEscape(listingResult.store?.name)} · ${profitLifecycleLabel(listingResult.listing.lifecycleStatus)}</small></div></div><div class="profit-lifecycle-actions">${listingResult.listing.lifecycleStatus !== "active" ? `<button data-profit-set-lifecycle="active" type="button">恢复运营</button>` : '<button data-profit-set-lifecycle="paused" type="button">暂停运营</button>'}<button data-profit-set-lifecycle="delisted" type="button">标记下架</button><button data-profit-set-lifecycle="archived" type="button">归档</button></div></section>
        <section><div class="profit-management-section-head"><div><b>链接 SKU</b><small>成本和佣金作为当日利润快照来源</small></div><button data-profit-add-sku="${listingResult.listing.id}" type="button">＋ 新增 SKU</button></div><div class="profit-management-list">${listingResult.skuRows.map((row) => `<article class="${row.listingSku.active ? "" : "inactive"}"><div><b>${profitUiEscape(row.sku?.name)}</b><span>成本 ${profitUiMoney(row.listingSku.storeCostOverride)} · 佣金 ${profitNumber(row.listingSku.commissionRateOverride).toFixed(1)}%</span></div><button data-profit-toggle-sku="${row.listingSku.id}" type="button">${row.listingSku.active ? "停用" : "恢复"}</button></article>`).join("")}</div></section>
      </aside></div>`;
    }

    function renderProfitListingDetail(state, listingId) {
      const row = selectListingProfitResult(state.repository, listingId, state.activeDate);
      if (!row) return '<div class="profit-empty-state">未找到该商品链接。</div>';
      const activeRows = row.skuRows.filter((item) => item.listingSku.active);
      const inactiveRows = row.skuRows.filter((item) => !item.listingSku.active);
      const expense = row.expense;
      const samples = row.listing.sampleTypes || [];
      return `<div class="profit-detail-page listing-detail">
        <nav class="profit-breadcrumb"><button data-profit-back-overview type="button">产品总盘</button><span>/</span><button data-profit-back-product="${row.product.id}" type="button">${profitUiEscape(row.product.code)} 产品整体</button><span>/</span><b>${profitUiEscape(row.listing.displayName)}</b></nav>
        <section class="profit-listing-context"><div><span class="profit-code-mark">${profitUiEscape(row.product.code)}</span><div><small>${profitUiEscape(row.store?.name)} · ${profitUiEscape(row.listing.platformListingId)}</small><h2>${profitUiEscape(row.listing.displayName)}</h2><p>${profitUiEscape(row.product.name)} · 负责人 ${profitUiEscape(row.listing.ownerName)} · ${state.activeDate}</p></div></div><div class="profit-context-actions"><span class="profit-lifecycle ${row.listing.lifecycleStatus}">${profitLifecycleLabel(row.listing.lifecycleStatus)}</span><a href="${profitUiEscape(row.listing.url)}" target="_blank" rel="noopener noreferrer">打开商品页 ↗</a><button data-profit-open-management type="button">链接与 SKU 设置</button></div></section>
        <section class="profit-summary-band listing-summary">
          ${renderProfitMetric("今日销量", `${row.result.units.toLocaleString("en-US")} 件`, { detail: `${row.result.completedSkuCount}/${activeRows.length} 个 SKU 已完成` })}
          ${renderProfitMetric("销售额", profitUiMoney(row.result.revenue))}
          ${renderProfitMetric("SKU 商品毛利润", profitUiMoney(row.result.skuGrossProfit))}
          ${renderProfitMetric("寄样与营销", profitUiMoney(row.result.sampleCost + row.result.marketingSpend + row.result.adjustments), { detail: `寄样 ${profitUiMoney(row.result.sampleCost)} · 营销 ${profitUiMoney(row.result.marketingSpend)}` })}
          ${renderProfitMetric("链接贡献利润", profitUiMoney(row.result.contributionProfit), { tone: row.result.contributionProfit < 0 ? "negative" : "featured", detail: `贡献利润率 ${profitUiPercent(row.result.contributionMargin)}` })}
        </section>
        <section class="profit-entry-section">
          <div class="profit-block-title"><div><span>今日填写</span><h3>SKU 售价与销量</h3><p>售价默认带入上一日；销量必须由运营确认，系统不会复制昨日销量。</p></div><div class="profit-entry-status">${profitStatusBadge(row.health)}<span>${state.activeDate}</span></div></div>
          <div class="profit-entry-table-wrap"><table class="profit-entry-table"><thead><tr><th>SKU / 规格</th><th>今日售价</th><th>今日销量</th><th>单件商品毛利润</th><th>SKU 商品毛利润</th><th>近 7 天变化</th><th>状态</th><th></th></tr></thead><tbody>${activeRows.map((item) => {
            const expanded = state.expandedSkuIds.has(item.listingSku.id);
            const previousPrice = prepareProfitDailyEntry(state.repository.getDailyFacts(item.listingSku.id).filter((fact) => fact.dateKey < state.activeDate), state.activeDate).price;
            return `<tr class="profit-sku-entry-row" data-profit-sku-row="${item.listingSku.id}"><td><div class="profit-sku-name"><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)} · 成本 ${profitUiMoney(item.listingSku.storeCostOverride)} · 佣金 ${profitNumber(item.listingSku.commissionRateOverride).toFixed(1)}%</small></div></td><td><label class="profit-number-input money"><span>$</span><input data-profit-fact-input data-listing-sku-id="${item.listingSku.id}" data-field="price" data-previous-price="${previousPrice ?? ""}" type="number" min="0" step="0.01" value="${item.result.price ?? ""}" aria-label="${profitUiEscape(item.sku?.name)} 今日售价" /></label></td><td><label class="profit-number-input units"><input data-profit-fact-input data-listing-sku-id="${item.listingSku.id}" data-field="units" type="number" min="0" step="1" value="${item.result.units ?? ""}" placeholder="待填" aria-label="${profitUiEscape(item.sku?.name)} 今日销量" /><span>件</span></label></td><td class="profit-num ${item.result.unitGrossProfit < 0 ? "negative" : ""}">${profitUiMoney(item.result.unitGrossProfit)}</td><td class="profit-num ${item.result.skuGrossProfit < 0 ? "negative" : "positive"}"><b>${profitUiMoney(item.result.skuGrossProfit)}</b></td><td><div class="profit-trend-summary"><b>${profitUiSignedPercent(item.trend.unitChange)}</b><small>日均 ${item.trend.averageUnits.toFixed(1)} 件 · 价格 ${profitUiSignedPercent(item.trend.priceChange)}</small></div></td><td>${item.observation ? `<span class="profit-row-state observing">观察中</span>` : item.result.completed ? '<span class="profit-row-state completed">已填写</span>' : '<span class="profit-row-state pending">待填写</span>'}</td><td><button class="profit-expand-action" data-profit-sku-trend-toggle="${item.listingSku.id}" aria-expanded="${expanded}" type="button">7 天趋势 ${expanded ? "↑" : "↓"}</button></td></tr>${renderProfitSkuTrend(item, expanded)}`;
          }).join("")}</tbody></table></div>
          <div class="profit-mobile-entry-list">${activeRows.map((item) => `<article><header><div><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)}</small></div><strong class="${item.result.skuGrossProfit < 0 ? "negative" : "positive"}">${profitUiMoney(item.result.skuGrossProfit)}</strong></header><div class="profit-mobile-inputs"><label><span>今日售价</span><div class="profit-number-input money"><span>$</span><input data-profit-fact-input data-listing-sku-id="${item.listingSku.id}" data-field="price" data-previous-price="${prepareProfitDailyEntry(state.repository.getDailyFacts(item.listingSku.id).filter((fact) => fact.dateKey < state.activeDate), state.activeDate).price ?? ""}" type="number" min="0" step="0.01" value="${item.result.price ?? ""}" /></div></label><label><span>今日销量</span><div class="profit-number-input units"><input data-profit-fact-input data-listing-sku-id="${item.listingSku.id}" data-field="units" type="number" min="0" step="1" value="${item.result.units ?? ""}" placeholder="待填" /><span>件</span></div></label></div><footer><span>单件 ${profitUiMoney(item.result.unitGrossProfit)}</span><button data-profit-sku-trend-toggle="${item.listingSku.id}" type="button">查看 7 天趋势</button></footer>${state.expandedSkuIds.has(item.listingSku.id) ? `<div class="profit-mobile-trend">${item.trend.points.map((point) => `<div><span>${profitUiDateLabel(point.dateKey)}</span><b>${point.price === null ? "—" : profitUiMoney(point.price)}</b><small>${point.units === null ? "待填" : `${point.units} 件`}</small></div>`).join("")}</div>` : ""}</article>`).join("")}</div>
        </section>
        <section class="profit-expense-section"><div class="profit-block-title"><div><span>链接级费用</span><h3>寄样与营销</h3><p>这些费用只填写一次，由整条链接共同承担。</p></div></div><div class="profit-expense-grid">${samples.map((sample) => `<label><span>${profitUiEscape(sample.name)}数量</span><div class="profit-number-input units"><input data-profit-expense-input data-sample-type-id="${sample.id}" type="number" min="0" step="1" value="${profitNumber(expense.sampleQuantities?.[sample.id])}" /><span>份</span></div><small>${profitUiMoney(sample.unitCost)} / 份</small></label>`).join("")}<label><span>广告营销费</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-input data-field="marketingSpend" type="number" min="0" step="0.01" value="${profitNumber(expense.marketingSpend)}" /></div><small>整条链接当日支出</small></label><label><span>其他调整费用</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-input data-field="adjustments" type="number" min="0" step="0.01" value="${profitNumber(expense.adjustments)}" /></div><small>退款外调整等</small></label><div class="profit-contribution-result"><span>链接贡献利润</span><b class="${row.result.contributionProfit < 0 ? "negative" : "positive"}">${profitUiMoney(row.result.contributionProfit)}</b><small>${profitUiMoney(row.result.skuGrossProfit)} − ${profitUiMoney(row.result.sampleCost + row.result.marketingSpend + row.result.adjustments)}</small></div></div></section>
        ${inactiveRows.length ? `<section class="profit-inactive-strip"><div><b>${inactiveRows.length} 个 SKU 已停用</b><span>历史数据仍保留，不进入今日汇总。</span></div><button data-profit-open-management type="button">查看并恢复</button></section>` : ""}
        ${renderProfitListingManagement(state, row)}
      </div>`;
    }

    function renderProfitTemplateShell(state) {
      let title = "产品利润与链接调价";
      let description = "先看产品整体，再进入具体链接填写 SKU 售价与销量。";
      if (state.view === "product") {
        const product = state.repository.getProduct(state.activeProductId);
        title = `${product?.code || "产品"} · 跨链接经营`;
        description = "比较同一个产品在不同店铺链接中的销量和贡献利润。";
      }
      if (state.view === "listing") {
        const listing = state.repository.getListing(state.activeListingId);
        title = listing?.displayName || "链接利润填写";
        description = "填写整条链接下每个 SKU 的当日售价和销量，利润自动汇总。";
      }
      const body = state.view === "listing"
        ? renderProfitListingDetail(state, state.activeListingId)
        : state.view === "product"
          ? renderProfitProductDetail(state, state.activeProductId)
          : renderProfitProductOverview(state);
      return `<div class="profit-template-shell">${renderProfitWorkspaceHeader(state, title, description)}${body}</div>`;
    }

    function applyProfitWorkspaceAction(state, action) {
      if (!state || !action) return false;
      if (action.type === "openProduct" && state.repository.getProduct(action.productId)) {
        state.view = "product";
        state.activeProductId = action.productId;
        state.activeListingId = null;
        return true;
      }
      if (action.type === "openListing" && state.repository.getListing(action.listingId)) {
        const listing = state.repository.getListing(action.listingId);
        state.view = "listing";
        state.activeProductId = listing.productId;
        state.activeListingId = listing.id;
        state.managementOpen = false;
        return true;
      }
      if (action.type === "backOverview") {
        state.view = "overview";
        state.activeProductId = null;
        state.activeListingId = null;
        return true;
      }
      if (action.type === "backProduct") return applyProfitWorkspaceAction(state, { type: "openProduct", productId: action.productId });
      if (action.type === "toggleSkuTrend") {
        if (state.expandedSkuIds.has(action.listingSkuId)) state.expandedSkuIds.delete(action.listingSkuId);
        else state.expandedSkuIds.add(action.listingSkuId);
        return true;
      }
      return false;
    }

    let profitWorkspaceState = createProfitWorkspaceState("2026-08-05");

    function renderProfitTemplate() {
      const root = typeof document === "undefined" ? null : document.getElementById("profitTemplateRoot");
      if (root) root.innerHTML = renderProfitTemplateShell(profitWorkspaceState);
    }

    function openProfitDialog(id) {
      const dialog = document.getElementById(id);
      if (dialog?.showModal) dialog.showModal();
      else if (dialog) dialog.setAttribute("open", "");
    }

    function closeProfitDialog(id) {
      const dialog = document.getElementById(id);
      if (dialog?.close) dialog.close();
      else dialog?.removeAttribute("open");
    }

    function showProfitFormError(id, message) {
      const node = document.getElementById(id);
      if (node) node.textContent = message || "";
    }

    function prepareProfitLinkDialog(productId = "") {
      const form = document.getElementById("profitLinkForm");
      if (!form) return;
      const state = profitWorkspaceState.repository.getState();
      form.elements.productId.innerHTML = '<option value="">请选择产品</option>' + state.products.map((product) => `<option value="${product.id}" ${product.id === productId ? "selected" : ""}>${profitUiEscape(product.code)} · ${profitUiEscape(product.name)}</option>`).join("");
      form.elements.storeId.innerHTML = '<option value="">请选择店铺</option>' + state.stores.map((store) => `<option value="${store.id}">${profitUiEscape(store.name)}</option>`).join("");
      form.elements.predecessorListingId.innerHTML = '<option value="">无承接关系</option>' + state.listings.map((listing) => `<option value="${listing.id}">${profitUiEscape(listing.displayName)}</option>`).join("");
      openProfitDialog("profitLinkDialog");
    }

    function prepareProfitSkuDialog(listingId) {
      const form = document.getElementById("profitSkuForm");
      const listing = profitWorkspaceState.repository.getListing(listingId);
      if (!form || !listing) return;
      form.elements.listingId.value = listingId;
      const state = profitWorkspaceState.repository.getState();
      const linkedIds = new Set(profitWorkspaceState.repository.getListingSkus(listingId).map((item) => item.skuId));
      form.elements.skuId.innerHTML = '<option value="">请选择公共 SKU</option>' + state.skuMasters.filter((sku) => sku.productId === listing.productId && !linkedIds.has(sku.id)).map((sku) => `<option value="${sku.id}">${profitUiEscape(sku.code)} · ${profitUiEscape(sku.name)}</option>`).join("");
      document.getElementById("profitSkuDialogCopy").textContent = `${listing.displayName} · 新增一个在该链接独立定价的 SKU`;
      openProfitDialog("profitSkuDialog");
    }

    function openProfitObservationDialog(change) {
      profitWorkspaceState.pendingPriceChange = change;
      const row = selectListingProfitResult(profitWorkspaceState.repository, change.listingId, profitWorkspaceState.activeDate)
        ?.skuRows.find((item) => item.listingSku.id === change.listingSkuId);
      const copy = document.getElementById("profitObservationCopy");
      if (copy) copy.textContent = `${row?.sku?.name || "SKU"}：${profitUiMoney(change.oldPrice)} → ${profitUiMoney(change.newPrice)}`;
      openProfitDialog("profitObservationDialog");
    }

    function initProfitTemplate() {
      if (typeof document === "undefined") return;
      const root = document.getElementById("profitTemplateRoot");
      if (!root || root.dataset.profitReady === "true") return;
      root.dataset.profitReady = "true";

      root.addEventListener("click", (event) => {
        const productButton = event.target.closest("[data-profit-open-product]");
        const listingButton = event.target.closest("[data-profit-open-listing]");
        const skuTrend = event.target.closest("[data-profit-sku-trend-toggle]");
        const addListing = event.target.closest("[data-profit-add-listing]");
        const addSku = event.target.closest("[data-profit-add-sku]");
        const toggleSku = event.target.closest("[data-profit-toggle-sku]");
        const lifecycle = event.target.closest("[data-profit-set-lifecycle]");
        if (productButton) applyProfitWorkspaceAction(profitWorkspaceState, { type: "openProduct", productId: productButton.dataset.profitOpenProduct });
        else if (listingButton) applyProfitWorkspaceAction(profitWorkspaceState, { type: "openListing", listingId: listingButton.dataset.profitOpenListing });
        else if (event.target.closest("[data-profit-back-overview]")) applyProfitWorkspaceAction(profitWorkspaceState, { type: "backOverview" });
        else if (event.target.closest("[data-profit-back-product]")) applyProfitWorkspaceAction(profitWorkspaceState, { type: "backProduct", productId: event.target.closest("[data-profit-back-product]").dataset.profitBackProduct });
        else if (skuTrend) applyProfitWorkspaceAction(profitWorkspaceState, { type: "toggleSkuTrend", listingSkuId: skuTrend.dataset.profitSkuTrendToggle });
        else if (addListing) return prepareProfitLinkDialog(addListing.dataset.profitAddListing || profitWorkspaceState.activeProductId || "");
        else if (addSku) return prepareProfitSkuDialog(addSku.dataset.profitAddSku);
        else if (toggleSku) profitWorkspaceState.repository.toggleListingSku(toggleSku.dataset.profitToggleSku);
        else if (lifecycle) {
          profitWorkspaceState.repository.setListingLifecycle(profitWorkspaceState.activeListingId, lifecycle.dataset.profitSetLifecycle, profitWorkspaceState.activeDate);
          profitWorkspaceState.managementOpen = false;
        } else if (event.target.closest("[data-profit-open-management]")) profitWorkspaceState.managementOpen = true;
        else if (event.target.closest("[data-profit-close-management]")) profitWorkspaceState.managementOpen = false;
        else return;
        renderProfitTemplate();
      });

      root.addEventListener("change", (event) => {
        const dateFilter = event.target.closest("[data-profit-date-filter]");
        const storeFilter = event.target.closest("[data-profit-store-filter]");
        const lifecycleFilter = event.target.closest("[data-profit-lifecycle-filter]");
        const factInput = event.target.closest("[data-profit-fact-input]");
        const expenseInput = event.target.closest("[data-profit-expense-input]");
        if (dateFilter) profitWorkspaceState.activeDate = dateFilter.value;
        else if (storeFilter) profitWorkspaceState.storeFilter = storeFilter.value;
        else if (lifecycleFilter) profitWorkspaceState.lifecycleFilter = lifecycleFilter.value;
        else if (factInput) {
          const value = factInput.value === "" ? null : Number(factInput.value);
          const field = factInput.dataset.field;
          const listingSkuId = factInput.dataset.listingSkuId;
          profitWorkspaceState.repository.updateDailyFact(listingSkuId, profitWorkspaceState.activeDate, { [field]: value });
          if (field === "price" && factInput.dataset.previousPrice !== "") {
            const oldPrice = Number(factInput.dataset.previousPrice);
            const newPrice = Number(value);
            if (Number.isFinite(newPrice) && Math.abs(newPrice - oldPrice) >= 0.01) {
              openProfitObservationDialog({ productId: profitWorkspaceState.activeProductId, listingId: profitWorkspaceState.activeListingId, listingSkuId, oldPrice, newPrice });
            }
          }
        } else if (expenseInput) {
          if (expenseInput.dataset.sampleTypeId) {
            profitWorkspaceState.repository.updateDailyExpense(profitWorkspaceState.activeListingId, profitWorkspaceState.activeDate, { sampleQuantities: { [expenseInput.dataset.sampleTypeId]: Math.max(0, Math.round(profitNumber(expenseInput.value))) } });
          } else {
            profitWorkspaceState.repository.updateDailyExpense(profitWorkspaceState.activeListingId, profitWorkspaceState.activeDate, { [expenseInput.dataset.field]: Math.max(0, profitNumber(expenseInput.value)) });
          }
        } else return;
        renderProfitTemplate();
      });

      document.getElementById("profitLinkForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        const error = validateProfitListing(values);
        showProfitFormError("profitLinkError", error);
        if (error) return;
        const listing = profitWorkspaceState.repository.addListing({ ...values, displayName: values.displayName.trim(), url: values.url.trim() });
        profitWorkspaceState.activeProductId = listing.productId;
        profitWorkspaceState.activeListingId = listing.id;
        profitWorkspaceState.view = "listing";
        event.currentTarget.reset();
        closeProfitDialog("profitLinkDialog");
        renderProfitTemplate();
      });

      document.getElementById("profitSkuForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        const error = validateProfitListingSku(values);
        showProfitFormError("profitSkuError", error);
        if (error) return;
        profitWorkspaceState.repository.addListingSku({ ...values, price: Number(values.price), cost: Number(values.cost), commissionRate: Number(values.commissionRate) });
        event.currentTarget.reset();
        closeProfitDialog("profitSkuDialog");
        renderProfitTemplate();
      });

      document.getElementById("profitObservationDialog")?.addEventListener("click", (event) => {
        const choice = event.target.closest("[data-profit-price-change-kind]");
        if (!choice) return;
        const change = profitWorkspaceState.pendingPriceChange;
        if (choice.dataset.profitPriceChangeKind === "planned" && change) {
          profitWorkspaceState.repository.addPriceObservation({ ...change, startedAt: profitWorkspaceState.activeDate, changeKind: "planned" });
        }
        profitWorkspaceState.pendingPriceChange = null;
        closeProfitDialog("profitObservationDialog");
        renderProfitTemplate();
      });

      document.querySelectorAll("[data-profit-dialog-close]").forEach((button) => button.addEventListener("click", () => closeProfitDialog(button.dataset.profitDialogClose)));
      document.querySelectorAll(".profit-dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) closeProfitDialog(dialog.id); }));
      renderProfitTemplate();
    }

    if (typeof document !== "undefined") initProfitTemplate();
