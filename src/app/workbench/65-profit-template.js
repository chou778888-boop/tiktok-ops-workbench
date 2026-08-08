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

    function profitUiSignedMoney(value) {
      const number = profitNumber(value);
      return `${number >= 0 ? "+" : "−"}$${Math.abs(number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    function profitUiResultLabel(result = {}) {
      return result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润";
    }

    function profitUiInputValue(value) {
      return value === null || value === undefined || value === "" ? "" : profitNumber(value);
    }

    function profitUiDateLabel(dateKey) {
      const date = profitIsoDate(dateKey);
      return date ? `${date.getUTCMonth() + 1}/${date.getUTCDate()}` : dateKey;
    }

    function profitChartModel(sourcePoints = []) {
      const chartWidth = 700;
      const chartHeight = 230;
      const plotLeft = 48;
      const plotRight = 18;
      const priceTop = 30;
      const priceBottom = 118;
      const barBaseline = 207;
      const maxBarHeight = 64;
      const normalized = sourcePoints.map((point) => ({
        ...point,
        averageTransactionPrice: point.averageTransactionPrice === null || point.averageTransactionPrice === undefined
          ? null
          : profitNumber(point.averageTransactionPrice),
        itemsSold: point.itemsSold === null || point.itemsSold === undefined ? null : profitNumber(point.itemsSold)
      }));
      const prices = normalized.map((point) => point.averageTransactionPrice).filter((value) => value !== null);
      const units = normalized.map((point) => point.itemsSold).filter((value) => value !== null);
      const minObservedPrice = prices.length ? Math.min(...prices) : 0;
      const maxObservedPrice = prices.length ? Math.max(...prices) : 0;
      const pricePadding = minObservedPrice === maxObservedPrice ? Math.max(Math.abs(maxObservedPrice) * 0.02, 1) : 0;
      const minPrice = minObservedPrice - pricePadding;
      const maxPrice = maxObservedPrice + pricePadding;
      const priceRange = Math.max(maxPrice - minPrice, 0.01);
      const maxUnits = units.length ? Math.max(...units, 0) : 0;
      const step = normalized.length > 1 ? (chartWidth - plotLeft - plotRight) / (normalized.length - 1) : 0;
      const barWidth = Math.min(42, Math.max(18, (chartWidth - plotLeft - plotRight) / Math.max(normalized.length, 1) * 0.48));
      const points = normalized.map((point, index) => {
        const x = profitMoney(plotLeft + step * index);
        const priceY = point.averageTransactionPrice === null
          ? null
          : profitMoney(priceBottom - ((point.averageTransactionPrice - minPrice) / priceRange) * (priceBottom - priceTop));
        const barHeight = point.itemsSold === null || maxUnits <= 0 ? 0 : profitMoney((point.itemsSold / maxUnits) * maxBarHeight);
        return {
          ...point,
          x,
          priceY,
          barX: profitMoney(x - barWidth / 2),
          barY: profitMoney(barBaseline - barHeight),
          barWidth: profitMoney(barWidth),
          barHeight,
          current: index === normalized.length - 1
        };
      });
      let drawing = false;
      const pricePath = points.reduce((path, point) => {
        if (point.priceY === null) {
          drawing = false;
          return path;
        }
        const command = drawing ? "L" : "M";
        drawing = true;
        return `${path}${path ? " " : ""}${command} ${point.x} ${point.priceY}`;
      }, "");
      const firstPrice = prices[0] ?? null;
      const lastPrice = prices.at(-1) ?? null;
      const firstUnits = units[0] ?? null;
      const lastUnits = units.at(-1) ?? null;
      return {
        chartWidth,
        chartHeight,
        points,
        pricePath,
        minPrice: profitMoney(minPrice),
        maxPrice: profitMoney(maxPrice),
        maxUnits: profitMoney(maxUnits),
        averagePrice: prices.length ? profitMoney(prices.reduce((sum, value) => sum + value, 0) / prices.length) : null,
        averageUnits: units.length ? profitMoney(units.reduce((sum, value) => sum + value, 0) / units.length) : null,
        priceChange: firstPrice ? (lastPrice - firstPrice) / firstPrice : null,
        unitChange: firstUnits ? (lastUnits - firstUnits) / firstUnits : null
      };
    }

    function renderProfitTrendChart(sourcePoints = [], options = {}) {
      const title = options.title || "最近 7 天成交均价与销量趋势";
      const model = profitChartModel(sourcePoints);
      const compactClass = options.compact ? " compact" : "";
      const summary = `已同步成交均价 ${model.averagePrice === null ? "待同步" : profitUiMoney(model.averagePrice)}，已同步日均销量 ${model.averageUnits === null ? "待同步" : `${model.averageUnits.toFixed(1)} 件`}`;
      return `<figure class="profit-trend-chart${compactClass}" aria-label="${profitUiEscape(title)}">
        <figcaption><div><b>${profitUiEscape(title)}</b><span>${profitUiEscape(summary)}</span></div><div class="profit-trend-legend"><span class="price"><i></i>成交均价 ${profitUiSignedPercent(model.priceChange)}</span><span class="units"><i></i>销量 ${profitUiSignedPercent(model.unitChange)}</span></div></figcaption>
        <div class="profit-trend-plot"><svg viewBox="0 0 ${model.chartWidth} ${model.chartHeight}" role="img" aria-label="${profitUiEscape(summary)}" preserveAspectRatio="xMidYMid meet"><title>${profitUiEscape(title)}</title><desc>${profitUiEscape(summary)}</desc>
          <line class="profit-trend-grid-line" x1="48" x2="682" y1="30" y2="30"></line><line class="profit-trend-grid-line" x1="48" x2="682" y1="74" y2="74"></line><line class="profit-trend-grid-line" x1="48" x2="682" y1="118" y2="118"></line><line class="profit-trend-baseline" x1="48" x2="682" y1="207" y2="207"></line>
          ${model.points.map((point) => `<rect class="profit-trend-bar${point.current ? " profit-trend-current" : ""}${point.itemsSold === null ? " pending" : ""}" x="${point.barX}" y="${point.barY}" width="${point.barWidth}" height="${point.barHeight}" rx="5"><title>${profitUiDateLabel(point.dateKey)} · ${point.itemsSold === null ? "销量待同步" : `销量 ${point.itemsSold} 件`}</title></rect>`).join("")}
          ${model.pricePath ? `<path class="profit-trend-line" d="${model.pricePath}"></path>` : ""}
          ${model.points.filter((point) => point.priceY !== null).map((point) => `<circle class="profit-trend-point${point.current ? " profit-trend-current" : ""}" cx="${point.x}" cy="${point.priceY}" r="${point.current ? 6 : 4}"><title>${profitUiDateLabel(point.dateKey)} · 成交均价 ${profitUiMoney(point.averageTransactionPrice)}</title></circle>`).join("")}
        </svg></div>
        <div class="profit-trend-axis">${model.points.map((point) => `<span class="${point.current ? "current" : ""}">${profitUiDateLabel(point.dateKey)}<small>${point.itemsSold === null ? "待同步" : `${point.itemsSold} 件`}</small></span>`).join("")}</div>
      </figure>`;
    }

    function profitLifecycleLabel(status) {
      return ({ draft: "准备上线", active: "正常运营", paused: "暂停运营", delisted: "已下架", archived: "已归档" })[status] || status;
    }

    function createProfitWorkspaceState(anchorDate = "2026-08-03") {
      const workspaceState = typeof state === "undefined" ? null : state;
      const persist = (snapshot) => {
        if (!workspaceState) return;
        Object.assign(state, snapshot);
        saveState();
      };
      const repository = createProfitRepository(anchorDate, {
        initialState: workspaceState,
        onChange: persist
      });
      if (workspaceState) Object.assign(workspaceState, serializeProfitRepositoryState(repository.getState()));
      return {
        repository,
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

    function hydrateProfitWorkspaceFromState() {
      if (typeof state === "undefined" || typeof profitWorkspaceState === "undefined" || !profitWorkspaceState?.repository) return;
      profitWorkspaceState.repository.hydrate(state);
    }

    function profitStatusBadge(health) {
      return `<span class="profit-health ${health.tone}"><i></i>${profitUiEscape(health.label)}</span>`;
    }

    function profitSettlementBadge(result = {}) {
      const settled = result.profitStatus === "settled";
      return `<span class="profit-settlement-status ${settled ? "settled" : "estimated"}"><i></i>${settled ? "已结算" : "预估中"}</span>`;
    }

    function renderProfitSyncCard(state) {
      const sync = state.repository.getState().syncStatus;
      const lastSyncLabel = `${profitUiDateLabel(String(sync.lastSyncedAt).slice(0, 10))} ${String(sync.lastSyncedAt).slice(11, 16)}`;
      return `<section class="profit-sync-card" aria-label="数据同步状态">
        <div class="profit-sync-icon"><i></i></div>
        <div class="profit-sync-copy"><span>店铺数据同步</span><b>${profitUiEscape(sync.message)}</b><small>${profitUiEscape(sync.source)} · 店铺经营时区 ${profitUiEscape(sync.storeTimezone)}</small></div>
        <div class="profit-sync-times"><span>最近核对 <b>${lastSyncLabel}</b></span><span>固定同步 <b>每天 17:00（北京时间）</b></span></div>
        <button data-profit-sync-preview type="button">立即同步</button>
      </section>`;
    }

    function renderProfitWorkspaceHeader(state, title, description) {
      const stores = state.repository.getState().stores;
      return `<header class="profit-workspace-head">
        <div class="profit-workspace-title">
          <div class="profit-eyebrow"><span>链接利润分析</span><em>真实店铺样本 · 已验证 1 条链接</em></div>
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
        <div class="profit-attention-list">${items.length ? items.map((item) => `<button data-profit-open-listing="${item.listingId}" class="${item.tone}" type="button"><i></i><span><b>${profitUiEscape(item.title)}</b><small>${profitUiEscape(item.detail)}</small></span><em>处理</em></button>`).join("") : '<div class="profit-calm-state"><i>✓</i><b>今日无需优先处理</b><span>全部链接已同步，暂无亏损、对账差异或调价观察。</span></div>'}</div>
      </aside>`;
    }

    function renderProfitProductOverview(state) {
      const rows = selectProductProfitRows(state.repository, state.activeDate, {
        storeId: state.storeFilter,
        lifecycleStatus: state.lifecycleFilter
      });
      const summary = selectProfitWorkspaceSummary(rows);
      const attention = selectProfitAttentionItems(rows);
      return `${renderProfitSyncCard(state)}<div class="profit-overview-layout">
        <main class="profit-overview-main">
          <section class="profit-summary-band" aria-label="近七天产品利润总览">
            ${renderProfitMetric("近 7 天 GMV", profitUiMoney(summary.gmv), { detail: `${summary.productCount} 个产品 · ${summary.listingCount} 条链接` })}
            ${renderProfitMetric("实际/预估到手", profitUiMoney(summary.receivedAmount), { detail: `${summary.settledListingCount} 个链接日已结算` })}
            ${renderProfitMetric(profitUiResultLabel(summary), profitUiMoney(summary.finalProfit), { tone: summary.finalProfit < 0 ? "negative" : "featured", detail: summary.profitCompleteness === "provisional" ? "广告、样品待补" : `利润率 ${profitUiPercent(summary.contributionMargin)}` })}
            ${renderProfitMetric("近 7 天销量", `${summary.itemsSold.toLocaleString("en-US")} 件`, { detail: `${summary.pendingEntryCount} 条数据待同步 · ${summary.observationCount} 条调价观察` })}
          </section>
          <section class="profit-product-section">
            <div class="profit-block-title"><div><span>产品经营总盘</span><h3>近 7 天产品利润总盘</h3><p>先判断一个品在所有店铺的整体结果，再进入具体链接处理异常。</p></div><b>${rows.length} 个产品</b></div>
            <div class="profit-product-table-wrap"><table class="profit-product-table">
              <thead><tr><th>产品</th><th>运营链接</th><th>7 天销量</th><th>7 天 GMV</th><th>实际/预估到手</th><th>利润结果</th><th>利润率</th><th>结算</th><th>状态</th><th></th></tr></thead>
              <tbody>${rows.map((row) => { const result = row.sevenDay.result; return `<tr data-profit-open-product="${row.product.id}" tabindex="0">
                <td><div class="profit-product-name"><span>${profitUiEscape(row.product.code)}</span><div><b>${profitUiEscape(row.product.name)}</b><small>${profitUiEscape(row.product.category)}</small></div></div></td>
                <td><b>${row.activeListingCount}</b><small> / ${row.listingCount} 条</small></td>
                <td class="profit-num"><b>${result.itemsSold.toLocaleString("en-US")}</b><small>件</small></td>
                <td class="profit-num">${profitUiMoney(result.gmv)}</td>
                <td class="profit-num">${profitUiMoney(result.receivedAmount)}</td>
                <td class="profit-num ${result.finalProfit < 0 ? "negative" : "positive"}"><b>${profitUiMoney(result.finalProfit)}</b></td>
                <td class="profit-num">${profitUiPercent(result.contributionMargin)}</td>
                <td><span class="profit-settlement-count">${result.settledListingCount}<small> / ${result.settledListingCount + result.estimatedListingCount}</small></span></td>
                <td>${profitStatusBadge(row.health)}</td>
                <td><button class="profit-row-action" data-profit-open-product="${row.product.id}" type="button">查看链接 <span>→</span></button></td>
              </tr>`; }).join("")}</tbody>
            </table></div>
            <div class="profit-product-cards">${rows.map((row) => { const result = row.sevenDay.result; return `<button data-profit-open-product="${row.product.id}" type="button"><header><span>${profitUiEscape(row.product.code)}</span><div><b>${profitUiEscape(row.product.name)}</b><small>${row.listingCount} 条链接 · 近 7 天</small></div>${profitStatusBadge(row.health)}</header><dl><div><dt>销量</dt><dd>${result.itemsSold.toLocaleString("en-US")}</dd></div><div><dt>${profitUiResultLabel(result)}</dt><dd class="${result.finalProfit < 0 ? "negative" : "positive"}">${profitUiMoney(result.finalProfit)}</dd></div><div><dt>利润率</dt><dd>${profitUiPercent(result.contributionMargin)}</dd></div></dl><footer>查看全部链接 <span>→</span></footer></button>`; }).join("")}</div>
          </section>
        </main>
        ${renderProfitAttentionQueue(attention)}
      </div>`;
    }

    function renderProfitProductDetail(state, productId) {
      const productRow = selectProductProfitRows(state.repository, state.activeDate).find((row) => row.product.id === productId);
      if (!productRow) return '<div class="profit-empty-state">未找到该产品。</div>';
      const result = productRow.sevenDay.result;
      return `<div class="profit-detail-page">
        <nav class="profit-breadcrumb"><button data-profit-back-overview type="button">产品总盘</button><span>/</span><b>${profitUiEscape(productRow.product.code)} · ${profitUiEscape(productRow.product.name)}</b></nav>
        <section class="profit-product-hero">
          <div><span class="profit-code-mark">${profitUiEscape(productRow.product.code)}</span><div><small>${profitUiEscape(productRow.product.category)} · 产品整体</small><h2>${profitUiEscape(productRow.product.name)}</h2><p>合并 ${productRow.listingCount} 条店铺链接后判断整体利润与动销，再进入单条链接处理异常。</p></div></div>
          <div class="profit-product-cost-control"><label><span>统一产品成本</span><div><span>$</span><input data-profit-product-cost-input data-product-id="${productRow.product.id}" type="number" min="0" step="0.01" value="${profitNumber(productRow.product.standardUnitCost)}" /><button data-profit-apply-product-cost data-product-id="${productRow.product.id}" type="button">应用</button></div><small>${productRow.product.costEffectiveAt} 起生效 · 批量应用全部链接与 SKU</small></label>${profitStatusBadge(productRow.health)}</div>
        </section>
        <section class="profit-summary-band product-detail">
          ${renderProfitMetric("近 7 天销量", `${result.itemsSold.toLocaleString("en-US")} 件`, { detail: `${productRow.activeListingCount} 条有效链接` })}
          ${renderProfitMetric("近 7 天 GMV", profitUiMoney(result.gmv), { detail: `成交均价 ${profitUiMoney(productRow.sevenDay.averageTransactionPrice)}` })}
          ${renderProfitMetric("实际/预估到手", profitUiMoney(result.receivedAmount), { detail: `${result.settledListingCount} 个链接日已结算` })}
          ${renderProfitMetric(profitUiResultLabel(result), profitUiMoney(result.finalProfit), { tone: result.finalProfit < 0 ? "negative" : "featured", detail: result.profitCompleteness === "provisional" ? "广告、样品待补" : `利润率 ${profitUiPercent(result.contributionMargin)}` })}
        </section>
        <section class="profit-listing-section">
          <div class="profit-block-title"><div><span>同品跨店比较</span><h3>${profitUiEscape(productRow.product.code)} 的全部链接</h3><p>比较各店铺链接的成交均价、动销和真实利润；费用与结算互不串改。</p></div><button class="primary" data-profit-add-listing="${productRow.product.id}" type="button">＋ 新增此产品链接</button></div>
          <div class="profit-listing-grid">${productRow.listings.map((row) => {
            const linkResult = row.sevenDay.result;
            const unitChangeValues = row.skuRows.map((skuRow) => skuRow.trend.unitChange).filter((value) => value !== null);
            const unitChange = unitChangeValues.length ? profitAverage(unitChangeValues) : null;
            return `<article class="profit-listing-card ${row.listing.lifecycleStatus}">
              <header><div><span>${profitUiEscape(row.store?.name || "未分配店铺")}</span><h4>${profitUiEscape(row.listing.displayName)}</h4><small>${profitUiEscape(row.listing.platformListingId)} · ${profitUiEscape(row.listing.ownerName)}</small></div><span class="profit-lifecycle ${row.listing.lifecycleStatus}">${profitLifecycleLabel(row.listing.lifecycleStatus)}</span></header>
              <div class="profit-listing-main"><div><span>近 7 天销量</span><b>${linkResult.itemsSold.toLocaleString("en-US")}<small> 件</small></b><em class="${unitChange !== null && unitChange < 0 ? "down" : "up"}">成交均价 ${profitUiMoney(row.sevenDay.averageTransactionPrice)} · ${profitUiSignedPercent(unitChange)}</em></div><div><span>${profitUiResultLabel(linkResult)}</span><b class="${linkResult.finalProfit < 0 ? "negative" : "positive"}">${profitUiMoney(linkResult.finalProfit)}</b><em>${linkResult.profitCompleteness === "provisional" ? "内部费用待补" : `利润率 ${profitUiPercent(linkResult.contributionMargin)}`}</em></div></div>
              <div class="profit-listing-meta"><span>${row.skuRows.filter((item) => item.listingSku.active).length} 个 SKU</span>${profitSettlementBadge(row.result)}${profitStatusBadge(row.health)}</div>
              <footer><a href="${profitUiEscape(row.listing.url)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${profitUiEscape(row.listing.displayName)} 商品链接">商品页 ↗</a><button data-profit-open-listing="${row.listing.id}" type="button">查看链接利润 <span>→</span></button></footer>
            </article>`;
          }).join("")}</div>
        </section>
      </div>`;
    }

    function renderProfitSkuTrend(row, expanded) {
      if (!expanded) return "";
      return `<tr class="profit-sku-trend-row"><td colspan="7"><div class="profit-sku-trend">${row.observation ? `<div class="profit-trend-observation">调价观察至 ${row.observation.observationEnd}</div>` : ""}${renderProfitTrendChart(row.trend.points, { title: "最近 7 天成交均价与动销", compact: true })}</div></td></tr>`;
    }

    function renderProfitListingManagement(state, listingResult) {
      if (!state.managementOpen) return "";
      return `<div class="profit-management-layer"><button class="profit-management-overlay" data-profit-close-management type="button" aria-label="关闭设置"></button><aside class="profit-management-drawer" aria-label="链接与 SKU 设置">
        <header><div><span>链接与 SKU 设置</span><h3>${profitUiEscape(listingResult.listing.displayName)}</h3><small>停用和下架都保留历史数据</small></div><button data-profit-close-management type="button" aria-label="关闭">×</button></header>
        <section><div class="profit-management-section-head"><div><b>链接状态</b><small>${profitUiEscape(listingResult.store?.name)} · ${profitLifecycleLabel(listingResult.listing.lifecycleStatus)}</small></div></div><div class="profit-lifecycle-actions">${listingResult.listing.lifecycleStatus !== "active" ? `<button data-profit-set-lifecycle="active" type="button">恢复运营</button>` : '<button data-profit-set-lifecycle="paused" type="button">暂停运营</button>'}<button data-profit-set-lifecycle="delisted" type="button">标记下架</button><button data-profit-set-lifecycle="archived" type="button">归档</button></div></section>
        <section><div class="profit-management-section-head"><div><b>链接 SKU</b><small>SKU 身份跨链接共享，经营与结算数据按链接独立同步</small></div><button data-profit-add-sku="${listingResult.listing.id}" type="button">＋ 新增 SKU</button></div><div class="profit-management-list">${listingResult.skuRows.map((row) => `<article class="${row.listingSku.active ? "" : "inactive"}"><div><b>${profitUiEscape(row.sku?.name)}</b><span>${profitUiEscape(row.sku?.code)} · 产品统一成本 ${profitUiMoney(listingResult.product.standardUnitCost)}</span></div><button data-profit-toggle-sku="${row.listingSku.id}" type="button">${row.listingSku.active ? "停用" : "恢复"}</button></article>`).join("")}</div></section>
      </aside></div>`;
    }

    function renderProfitSevenDayStrip(listingResult) {
      const points = listingResult.sevenDay.days.map((day) => {
        const dayCompleted = day.result.completedSkuCount > 0;
        return {
          dateKey: day.dateKey,
          averageTransactionPrice: dayCompleted && day.result.itemsSold ? day.result.gmv / day.result.itemsSold : null,
          itemsSold: dayCompleted ? day.result.itemsSold : null,
          finalProfit: dayCompleted ? day.result.finalProfit : null
        };
      });
      return `<section class="profit-seven-day-section"><div class="profit-block-title"><div><span>趋势判断</span><h3>最近 7 天链接表现</h3><p>价格线判断调价幅度，销量柱判断动销变化；两者共用经营日期。</p></div><span class="profit-history-collapsed">更早记录已收起</span></div>${renderProfitTrendChart(points, { title: "最近 7 天成交均价与销量趋势" })}</section>`;
    }

    function renderProfitBreakdown(state, listingResult) {
      const result = listingResult.result;
      const receivedLabel = result.profitStatus === "settled" ? "实际到手" : "预估到手";
      const expensePending = result.profitCompleteness === "provisional";
      const resultLabel = profitUiResultLabel(result);
      const skuDifference = Math.abs(result.reconciliationDifference) >= 0.01 ? `<em>SKU 汇总差异 ${profitUiSignedMoney(result.reconciliationDifference)}</em>` : "";
      return `<section class="profit-profit-breakdown">
        <div class="profit-block-title profit-breakdown-head"><div><h3>当日利润拆解</h3><p>经营与财务口径分开呈现，避免重复扣费和虚假分摊。</p></div>${profitSettlementBadge(result)}</div>
        <div class="profit-breakdown-ledger">
          <div class="profit-breakdown-row"><span>经营 GMV<small>Product Analytics</small></span><b>${profitUiMoney(result.gmv)}</b></div>
          <div class="profit-breakdown-row subtotal"><span>平台确认销售额<small>已含平台优惠 ${profitUiMoney(result.platformDiscounts)}</small></span><b>${profitUiMoney(result.netProductSales)}</b></div>
          <div class="profit-breakdown-row reconciliation"><span>经营与财务口径差异</span><b>${profitUiSignedMoney(result.financialReconciliationDifference)}</b></div>
          <div class="profit-breakdown-row deduction"><span>平台订单成本<small>运费及平台各项费用</small></span><b>− ${profitUiMoney(result.platformFees + result.shippingFee)}</b></div>
          <div class="profit-breakdown-row subtotal"><span>${receivedLabel}</span><b>${profitUiMoney(result.receivedAmount)}</b></div>
          <div class="profit-breakdown-row deduction"><span>产品成本</span><b>− ${profitUiMoney(result.productCostTotal)}</b></div>
          <div class="profit-breakdown-row deduction ${expensePending ? "pending" : ""}"><span>广告、样品与调整</span><b>${expensePending ? "待补" : `− ${profitUiMoney(result.knownInternalExpenses)}`}</b></div>
        </div>
        <div class="profit-breakdown-result ${result.finalProfit < 0 ? "loss" : ""}"><span>${resultLabel}<small>${expensePending ? "广告、样品待补；补齐后转最终利润" : `利润率 ${profitUiPercent(result.contributionMargin)}`}</small></span><b>${profitUiMoney(result.finalProfit)}</b></div>
        <footer><span>来源：${profitUiEscape(listingResult.settlement.source)}</span><span>${state.activeDate} · ${profitUiEscape(listingResult.listing.timezone)}</span>${skuDifference}</footer>
      </section>`;
    }

    function renderProfitDecisionRow(state, listingResult) {
      return `<div class="profit-decision-grid">${renderProfitSevenDayStrip(listingResult)}${renderProfitBreakdown(state, listingResult)}</div>`;
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
          ${renderProfitMetric("经营 GMV", profitUiMoney(row.result.gmv), { detail: `${row.result.itemsSold.toLocaleString("en-US")} 件 · ${activeRows.length} 个 SKU` })}
          ${renderProfitMetric("成交均价", row.result.itemsSold ? profitUiMoney(row.result.gmv / row.result.itemsSold) : "—", { detail: "GMV ÷ 实际售出件数" })}
          ${renderProfitMetric(row.result.profitStatus === "settled" ? "实际到手" : "预估到手", profitUiMoney(row.result.receivedAmount), { detail: row.result.profitStatus === "settled" ? "平台最终结算金额" : "结算后自动回填" })}
          ${renderProfitMetric("销量成本", profitUiMoney(row.result.productCostTotal), { detail: `统一单件成本 ${profitUiMoney(row.product.standardUnitCost)}` })}
          ${renderProfitMetric(profitUiResultLabel(row.result), profitUiMoney(row.result.finalProfit), { tone: row.result.finalProfit < 0 ? "negative" : "featured", detail: row.result.profitCompleteness === "provisional" ? "广告、样品待补" : `利润率 ${profitUiPercent(row.result.contributionMargin)}` })}
        </section>
        ${renderProfitDecisionRow(state, row)}
        <section class="profit-entry-section">
          <div class="profit-block-title"><div><span>动销优先</span><h3>SKU 成交与商品毛利</h3><p>SKU 商品毛利只扣统一产品成本；平台订单成本在链接层核算，不做比例伪分摊。</p></div><div class="profit-entry-status">${profitStatusBadge(row.health)}<span>${state.activeDate}</span></div></div>
          <div class="profit-entry-table-wrap"><table class="profit-entry-table"><thead><tr><th>SKU / 规格</th><th>成交均价</th><th>销量</th><th>SKU GMV</th><th>销量成本</th><th>SKU 商品毛利</th><th>近 7 天</th></tr></thead><tbody>${activeRows.map((item) => {
            const expanded = state.expandedSkuIds.has(item.listingSku.id);
            return `<tr class="profit-sku-entry-row" data-profit-sku-row="${item.listingSku.id}"><td><div class="profit-sku-name"><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)} · ${item.result.completed ? "已同步" : "待同步"}</small></div></td><td class="profit-num"><b>${item.result.averageTransactionPrice === null ? "—" : profitUiMoney(item.result.averageTransactionPrice)}</b></td><td class="profit-num"><b>${item.result.itemsSold ?? "—"}</b><small>件</small></td><td class="profit-num">${profitUiMoney(item.result.gmv)}</td><td class="profit-num">${profitUiMoney(item.result.productCostTotal)}</td><td class="profit-num ${item.result.skuGrossProfit < 0 ? "negative" : "positive"}"><b>${profitUiMoney(item.result.skuGrossProfit)}</b></td><td><div class="profit-trend-summary"><b>${profitUiSignedPercent(item.trend.unitChange)}</b><small>日均 ${item.trend.averageUnits.toFixed(1)} 件 · 均价 ${profitUiSignedPercent(item.trend.priceChange)}</small></div><button class="profit-expand-action" data-profit-sku-trend-toggle="${item.listingSku.id}" aria-expanded="${expanded}" type="button">查看趋势 ${expanded ? "↑" : "↓"}</button></td></tr>${renderProfitSkuTrend(item, expanded)}`;
          }).join("")}</tbody></table></div>
          <div class="profit-mobile-entry-list">${activeRows.map((item) => `<article><header><div><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)} · ${item.result.completed ? "已同步" : "待同步"}</small></div><strong class="${item.result.skuGrossProfit < 0 ? "negative" : "positive"}">${profitUiMoney(item.result.skuGrossProfit)}</strong></header><dl><div><dt>成交均价</dt><dd>${item.result.averageTransactionPrice === null ? "—" : profitUiMoney(item.result.averageTransactionPrice)}</dd></div><div><dt>销量</dt><dd>${item.result.itemsSold ?? "—"} 件</dd></div><div><dt>SKU GMV</dt><dd>${profitUiMoney(item.result.gmv)}</dd></div><div><dt>销量成本</dt><dd>${profitUiMoney(item.result.productCostTotal)}</dd></div></dl><footer><span>SKU 商品毛利</span><button data-profit-sku-trend-toggle="${item.listingSku.id}" type="button">查看 7 天趋势</button></footer>${state.expandedSkuIds.has(item.listingSku.id) ? `<div class="profit-mobile-chart">${renderProfitTrendChart(item.trend.points, { title: "最近 7 天成交均价与动销", compact: true })}</div>` : ""}</article>`).join("")}</div>
        </section>
        <section class="profit-expense-section"><div class="profit-block-title"><div><span>团队维护</span><h3>链接广告与样品费用</h3><p>平台无法提供的费用只填写一次；空白代表待补，不会被系统误算为 0。</p></div></div><div class="profit-expense-grid">${samples.map((sample) => `<label><span>${profitUiEscape(sample.name)}数量</span><div class="profit-number-input units"><input data-profit-expense-input data-sample-type-id="${sample.id}" type="number" min="0" step="1" value="${profitUiInputValue(expense.sampleQuantities?.[sample.id])}" placeholder="待补" /><span>份</span></div><small>${profitUiMoney(sample.unitCost)} / 份</small></label>`).join("")}<label><span>广告费</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-input data-field="advertisingSpend" type="number" min="0" step="0.01" value="${profitUiInputValue(expense.advertisingSpend)}" placeholder="待补" /></div><small>对应此链接当日支出</small></label><label><span>其他调整费用</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-input data-field="adjustments" type="number" min="0" step="0.01" value="${profitUiInputValue(expense.adjustments)}" placeholder="待补" /></div><small>无调整也请填写 0</small></label><div class="profit-contribution-result"><span>${profitUiResultLabel(row.result)}</span><b class="${row.result.finalProfit < 0 ? "negative" : "positive"}">${profitUiMoney(row.result.finalProfit)}</b><small>${row.result.profitCompleteness === "provisional" ? "广告、样品待补；当前仅扣实际到手与产品成本" : `${profitUiMoney(row.result.receivedAmount)} − 成本与链接费用`}</small></div></div></section>
        ${inactiveRows.length ? `<section class="profit-inactive-strip"><div><b>${inactiveRows.length} 个 SKU 已停用</b><span>历史数据仍保留，不进入今日汇总。</span></div><button data-profit-open-management type="button">查看并恢复</button></section>` : ""}
        ${renderProfitListingManagement(state, row)}
      </div>`;
    }

    function renderProfitTemplateShell(state) {
      let title = "产品与链接利润";
      let description = "先看近七天产品整体，再进入具体链接判断成交均价、动销和真实利润。";
      if (state.view === "product") {
        const product = state.repository.getProduct(state.activeProductId);
        title = `${product?.code || "产品"} · 跨链接经营`;
        description = "比较同一个产品在不同店铺链接中的成交、结算和利润完整度。";
      }
      if (state.view === "listing") {
        const listing = state.repository.getListing(state.activeListingId);
        title = listing?.displayName || "链接利润详情";
        description = "查看整条链接及每个 SKU 的成交均价、销量、平台结算与最近七天趋势。";
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
      if (action.type === "updateProductCost" && state.repository.getProduct(action.productId)) {
        state.repository.updateProductCost(action.productId, action.value, action.effectiveAt || state.activeDate);
        return true;
      }
      return false;
    }

    let profitWorkspaceState = createProfitWorkspaceState("2026-08-03");

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
      document.getElementById("profitSkuDialogCopy").textContent = `${listing.displayName} · 关联公共 SKU 后由店铺同步成交与结算数据`;
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
        const syncPreview = event.target.closest("[data-profit-sync-preview]");
        const applyProductCost = event.target.closest("[data-profit-apply-product-cost]");
        if (syncPreview) {
          profitWorkspaceState.repository.updateSyncStatus({
            state: "synced",
            message: "当前展示 8 月 3 日已交叉核对的真实样本"
          });
        } else if (productButton) applyProfitWorkspaceAction(profitWorkspaceState, { type: "openProduct", productId: productButton.dataset.profitOpenProduct });
        else if (applyProductCost) {
          const input = applyProductCost.parentElement?.querySelector("[data-profit-product-cost-input]");
          applyProfitWorkspaceAction(profitWorkspaceState, {
            type: "updateProductCost",
            productId: applyProductCost.dataset.productId,
            value: input?.value,
            effectiveAt: profitWorkspaceState.activeDate
          });
          showToast("统一产品成本已应用到全部链接与 SKU");
        }
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
        const expenseInput = event.target.closest("[data-profit-expense-input]");
        if (dateFilter) profitWorkspaceState.activeDate = dateFilter.value;
        else if (storeFilter) profitWorkspaceState.storeFilter = storeFilter.value;
        else if (lifecycleFilter) profitWorkspaceState.lifecycleFilter = lifecycleFilter.value;
        else if (expenseInput) {
          const inputValue = expenseInput.value === "" ? null : expenseInput.value;
          if (expenseInput.dataset.sampleTypeId) {
            profitWorkspaceState.repository.updateDailyExpense(profitWorkspaceState.activeListingId, profitWorkspaceState.activeDate, { sampleQuantities: { [expenseInput.dataset.sampleTypeId]: inputValue } });
          } else {
            profitWorkspaceState.repository.updateDailyExpense(profitWorkspaceState.activeListingId, profitWorkspaceState.activeDate, { [expenseInput.dataset.field]: inputValue });
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
        profitWorkspaceState.repository.addListingSku(values);
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
