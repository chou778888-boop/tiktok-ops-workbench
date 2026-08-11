    const PROFIT_PRICE_CHANGE_LABELS = { planned: "计划调价", correction: "数据修正" };
    let profitSyncInFlight = false;
    let profitAuthorizationInFlight = false;

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
        allSkusExpanded: false,
        trendExpanded: false,
        historyExpanded: false,
        managementOpen: false,
        expenseDrawerOpen: false,
        expenseDraft: null,
        expenseError: "",
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

    async function syncProfitWorkspace(button) {
      if (profitSyncInFlight) return;
      profitSyncInFlight = true;
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "正在同步…";
      }
      try {
        const result = await requestProfitAutomaticSync({ dateKey: profitWorkspaceState.activeDate });
        await refreshCloudState({ force: true });
        showToast(result.status === "partial" ? "经营数据已同步，部分数据源待重试" : "订单、结算与广告数据已同步");
      } catch (error) {
        showToast(error?.message || "利润数据同步失败，请稍后重试");
      } finally {
        profitSyncInFlight = false;
        if (button?.isConnected) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          button.textContent = "立即同步";
        }
      }
    }

    async function connectTikTokShop(button) {
      if (profitAuthorizationInFlight) return;
      const stores = profitWorkspaceState.repository.getState().stores;
      const storeId = profitWorkspaceState.storeFilter || (stores.length === 1 ? stores[0]?.id : "");
      if (!storeId && stores.length > 1) {
        showToast("请先在上方选择要授权的店铺");
        return;
      }
      if (!storeId) {
        showToast("请先建立利润店铺，再连接 TikTok Shop");
        return;
      }
      profitAuthorizationInFlight = true;
      if (button) {
        button.disabled = true;
        button.setAttribute("aria-busy", "true");
        button.textContent = "正在连接…";
      }
      try {
        const result = await requestTikTokShopAuthorization({ storeId });
        location.assign(result.authorizationUrl);
      } catch (error) {
        showToast(error?.message || "TikTok 店铺授权启动失败");
        profitAuthorizationInFlight = false;
        if (button?.isConnected) {
          button.disabled = false;
          button.removeAttribute("aria-busy");
          button.textContent = "连接店铺";
        }
      }
    }

    function renderProfitSyncCard(state) {
      const sync = state.repository.getState().syncStatus;
      const lastSyncLabel = `${profitUiDateLabel(String(sync.lastSyncedAt).slice(0, 10))} ${String(sync.lastSyncedAt).slice(11, 16)}`;
      const canAuthorize = typeof window !== "undefined" && window.__workbenchUser?.role === "admin";
      return `<section class="profit-sync-card" aria-label="数据同步状态">
        <div class="profit-sync-icon"><i></i></div>
        <div class="profit-sync-copy"><span>店铺数据同步</span><b>${profitUiEscape(sync.message)}</b><small>${profitUiEscape(sync.source)} · 店铺经营时区 ${profitUiEscape(sync.storeTimezone)}</small></div>
        <div class="profit-sync-times"><span>最近核对 <b>${lastSyncLabel}</b></span><span>固定同步 <b>每天 17:00（北京时间）</b></span></div>
        <div class="profit-sync-actions">${canAuthorize ? '<button data-profit-connect-shop type="button">连接店铺</button>' : ""}<button data-profit-sync type="button">立即同步</button></div>
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

    function profitListingTrendPoints(listingResult) {
      return listingResult.sevenDay.days.map((day) => {
        const dayCompleted = day.result.completedSkuCount > 0;
        return {
          dateKey: day.dateKey,
          averageTransactionPrice: dayCompleted && day.result.itemsSold ? day.result.gmv / day.result.itemsSold : null,
          itemsSold: dayCompleted ? day.result.itemsSold : null,
          finalProfit: dayCompleted ? day.result.finalProfit : null
        };
      });
    }

    function renderProfitListingContext(state, row) {
      return `<section class="profit-listing-toolbar">
        <nav class="profit-breadcrumb" aria-label="链接利润层级"><button data-profit-back-overview type="button">产品总盘</button><span>/</span><button data-profit-back-product="${row.product.id}" type="button">${profitUiEscape(row.product.code)} 产品整体</button><span>/</span><b>${profitUiEscape(row.listing.displayName)}</b></nav>
        <label class="profit-listing-date"><span>经营日期</span><input data-profit-date-filter type="date" value="${state.activeDate}" /></label>
        <div class="profit-listing-identity"><span class="profit-code-mark">${profitUiEscape(row.product.code)}</span><div><small>${profitUiEscape(row.store?.name)} · ${profitUiEscape(row.listing.platformListingId)}</small><h2>${profitUiEscape(row.listing.displayName)}</h2><p>${profitUiEscape(row.product.name)} · 负责人 ${profitUiEscape(row.listing.ownerName)}</p></div></div>
        <div class="profit-context-actions"><span class="profit-lifecycle ${row.listing.lifecycleStatus}">${profitLifecycleLabel(row.listing.lifecycleStatus)}</span><a href="${profitUiEscape(row.listing.url)}" target="_blank" rel="noopener noreferrer">打开商品页 ↗</a><button data-profit-open-management type="button">链接与 SKU 设置</button></div>
      </section>`;
    }

    function profitDecisionMetricValue(metric) {
      if (metric.key === "units") return `${profitNumber(metric.value).toLocaleString("en-US")} 件`;
      return metric.value === null || metric.value === undefined ? "—" : profitUiMoney(metric.value);
    }

    function renderProfitDecisionCard(row, decision) {
      const completeness = row.result.profitCompleteness === "provisional" ? "广告、样品待补" : "经营费用已完整";
      const receivedLabel = row.result.profitStatus === "settled" ? "实际到手" : "预估到手";
      return `<section class="profit-decision-card ${decision.key}" aria-labelledby="profitDecisionTitle">
        <div class="profit-decision-main"><span class="profit-decision-status"><i></i>${profitUiEscape(row.health.label)}</span><small>${profitUiEscape(decision.amountLabel)}</small><h2 id="profitDecisionTitle">${profitUiEscape(decision.title)}</h2><strong class="${decision.amount < 0 ? "negative" : "positive"}">${profitUiMoney(decision.amount)}</strong><p>${profitUiEscape(decision.summary)}</p></div>
        <div class="profit-decision-facts" aria-label="利润判断依据"><div><span>利润率</span><b>${profitUiPercent(decision.margin)}</b></div><div><span>${receivedLabel}</span><b>${profitUiMoney(decision.receivedAmount)}</b></div><div><span>数据完整度</span><b>${profitUiEscape(completeness)}</b></div></div>
        <button class="profit-decision-action" data-profit-primary-action="${decision.action.key}" type="button">${profitUiEscape(decision.action.label)} <span>→</span></button>
        <dl class="profit-decision-metrics">${decision.auxiliaryMetrics.map((metric) => `<div><dt>${profitUiEscape(metric.label)}</dt><dd>${profitDecisionMetricValue(metric)}</dd></div>`).join("")}</dl>
      </section>`;
    }

    function renderProfitTrendState(title, description, meta = "") {
      return `<section class="profit-trend-evidence compact"><div><span>近 7 天经营证据</span><h3>${profitUiEscape(title)}</h3><p>${profitUiEscape(description)}</p></div>${meta ? `<em>${profitUiEscape(meta)}</em>` : ""}</section>`;
    }

    function renderProfitTrendEvidence(state, listingResult) {
      const availability = buildProfitTrendAvailability(listingResult.sevenDay);
      if (availability.mode === "empty") return renderProfitTrendState("等待店铺数据同步", "暂无可用于趋势判断的完整经营日", "0/7 天");
      if (availability.mode === "insufficient") return renderProfitTrendState(`${availability.completeDayCount}/7 天已同步`, "数据不足，暂不形成趋势判断", "周期未完整");
      const points = profitListingTrendPoints(listingResult);
      const summary = availability.mode === "partial"
        ? "周期未完整，仅展示已同步日期，不生成环比结论。"
        : "七个完整经营日已同步，可展开查看成交均价与销量变化。";
      return `<section class="profit-trend-evidence ${availability.mode}"><div><span>近 7 天经营证据</span><h3>${availability.completeDayCount}/7 天已同步</h3><p>${summary}</p></div><button data-profit-toggle-trend aria-expanded="${state.trendExpanded}" type="button">${state.trendExpanded ? "收起完整趋势" : "展开完整趋势"}</button>${state.trendExpanded ? renderProfitTrendChart(points, { title: "最近 7 天成交均价与销量趋势", compact: true }) : ""}</section>`;
    }

    function renderProfitLedger(listingResult) {
      const rows = buildProfitLedgerRows(listingResult.result);
      return `<section class="profit-profit-breakdown"><div class="profit-block-title"><div><span>利润形成</span><h3>这笔利润如何形成</h3><p>平台到手、产品成本和内部费用分层核算。</p></div>${profitSettlementBadge(listingResult.result)}</div><div class="profit-breakdown-ledger">${rows.map((item) => {
        const value = item.value === null ? "待补" : item.key === "financial_difference" ? profitUiSignedMoney(item.value) : profitUiMoney(item.value);
        return `<div class="profit-breakdown-row ${item.kind}"><span>${profitUiEscape(item.label)}${item.detail ? `<small>${profitUiEscape(item.detail)}</small>` : ""}</span><b>${value}</b></div>`;
      }).join("")}</div><footer><span>来源：${profitUiEscape(listingResult.settlement.source)}</span><span>${profitUiEscape(listingResult.listing.timezone)}</span></footer></section>`;
    }

    function renderProfitFocusSkuTable(state, listingResult) {
      const activeRows = listingResult.skuRows.filter((item) => item.listingSku.active);
      const focusRows = selectProfitFocusSkuRows(activeRows, 3);
      return `<section class="profit-focus-sku"><div class="profit-block-title"><div><span>SKU 经营原因</span><h3>重点贡献与异常 SKU</h3><p>SKU 仅核算商品毛利；平台订单成本保留在链接层。</p></div><button data-profit-toggle-all-skus aria-expanded="${state.allSkusExpanded}" type="button">${state.allSkusExpanded ? "收起完整明细" : `查看全部 ${activeRows.length} 个 SKU`}</button></div><div class="profit-focus-sku-table" role="table" aria-label="重点 SKU 商品毛利"><div class="profit-focus-sku-head" role="row"><span>SKU / 规格</span><span>成交均价</span><span>销量</span><span>SKU 商品毛利</span><span>经营信号</span></div>${focusRows.map((item) => `<div class="profit-focus-sku-row" role="row"><div><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)}</small></div><strong>${item.result.averageTransactionPrice === null ? "—" : profitUiMoney(item.result.averageTransactionPrice)}</strong><strong>${item.result.itemsSold ?? "—"} 件</strong><strong class="${item.result.skuGrossProfit < 0 ? "negative" : "positive"}">${profitUiMoney(item.result.skuGrossProfit)}</strong><em class="signal-${item.focusPriority}">${profitUiEscape(item.focusSignal)}</em></div>`).join("")}</div></section>`;
    }

    function renderProfitCauseGrid(state, listingResult) {
      return `<div class="profit-cause-grid">${renderProfitLedger(listingResult)}${renderProfitFocusSkuTable(state, listingResult)}</div>`;
    }

    function renderProfitAllSkuPanel(state, row, activeRows, inactiveRows) {
      if (!state.allSkusExpanded) return "";
      return `<section class="profit-entry-section profit-all-sku-panel">
        <div class="profit-block-title"><div><span>完整经营证据</span><h3>全部 SKU 成交与商品毛利</h3><p>展开单个 SKU 可查看最近七天成交均价与动销。</p></div><div class="profit-entry-status">${profitStatusBadge(row.health)}<span>${state.activeDate}</span></div></div>
        <div class="profit-entry-table-wrap"><table class="profit-entry-table"><thead><tr><th>SKU / 规格</th><th>成交均价</th><th>销量</th><th>SKU GMV</th><th>销量成本</th><th>SKU 商品毛利</th><th>近 7 天</th></tr></thead><tbody>${activeRows.map((item) => {
          const expanded = state.expandedSkuIds.has(item.listingSku.id);
          return `<tr class="profit-sku-entry-row" data-profit-sku-row="${item.listingSku.id}"><td><div class="profit-sku-name"><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)} · ${item.result.completed ? "已同步" : "待同步"}</small></div></td><td class="profit-num"><b>${item.result.averageTransactionPrice === null ? "—" : profitUiMoney(item.result.averageTransactionPrice)}</b></td><td class="profit-num"><b>${item.result.itemsSold ?? "—"}</b><small>件</small></td><td class="profit-num">${profitUiMoney(item.result.gmv)}</td><td class="profit-num">${profitUiMoney(item.result.productCostTotal)}</td><td class="profit-num ${item.result.skuGrossProfit < 0 ? "negative" : "positive"}"><b>${profitUiMoney(item.result.skuGrossProfit)}</b></td><td><div class="profit-trend-summary"><b>${profitUiSignedPercent(item.trend.unitChange)}</b><small>日均 ${item.trend.averageUnits.toFixed(1)} 件 · 均价 ${profitUiSignedPercent(item.trend.priceChange)}</small></div><button class="profit-expand-action" data-profit-sku-trend-toggle="${item.listingSku.id}" aria-expanded="${expanded}" type="button">查看趋势 ${expanded ? "↑" : "↓"}</button></td></tr>${renderProfitSkuTrend(item, expanded)}`;
        }).join("")}</tbody></table></div>
        <div class="profit-mobile-entry-list">${activeRows.map((item) => `<article><header><div><b>${profitUiEscape(item.sku?.name)}</b><small>${profitUiEscape(item.sku?.code)} · ${item.result.completed ? "已同步" : "待同步"}</small></div><strong class="${item.result.skuGrossProfit < 0 ? "negative" : "positive"}">${profitUiMoney(item.result.skuGrossProfit)}</strong></header><dl><div><dt>成交均价</dt><dd>${item.result.averageTransactionPrice === null ? "—" : profitUiMoney(item.result.averageTransactionPrice)}</dd></div><div><dt>销量</dt><dd>${item.result.itemsSold ?? "—"} 件</dd></div><div><dt>SKU GMV</dt><dd>${profitUiMoney(item.result.gmv)}</dd></div><div><dt>销量成本</dt><dd>${profitUiMoney(item.result.productCostTotal)}</dd></div></dl><footer><span>SKU 商品毛利</span><button data-profit-sku-trend-toggle="${item.listingSku.id}" type="button">查看 7 天趋势</button></footer>${state.expandedSkuIds.has(item.listingSku.id) ? `<div class="profit-mobile-chart">${renderProfitTrendChart(item.trend.points, { title: "最近 7 天成交均价与动销", compact: true })}</div>` : ""}</article>`).join("")}</div>
        ${inactiveRows.length ? `<div class="profit-inactive-strip"><div><b>${inactiveRows.length} 个 SKU 已停用</b><span>历史数据仍保留，不进入今日汇总。</span></div><button data-profit-open-management type="button">查看并恢复</button></div>` : ""}
      </section>`;
    }

    function profitExpensePreview(row, draft) {
      const samples = row.listing.sampleTypes || [];
      const sampleComplete = samples.every((sample) => draft?.sampleQuantities?.[sample.id] !== null && draft?.sampleQuantities?.[sample.id] !== undefined && draft?.sampleQuantities?.[sample.id] !== "");
      const sampleCost = sampleComplete ? profitMoney(samples.reduce((sum, sample) => sum + profitNumber(draft.sampleQuantities?.[sample.id]) * profitNumber(sample.unitCost), 0)) : null;
      return calculateListingContribution(row.skuRows.filter((item) => item.listingSku.active).map((item) => item.fact), { ...draft, sampleCost }, row.settlement);
    }

    function renderProfitExpenseDrawer(state, row) {
      if (!state.expenseDrawerOpen || !state.expenseDraft) return "";
      const draft = state.expenseDraft;
      const samples = row.listing.sampleTypes || [];
      const preview = profitExpensePreview(row, draft);
      return `<div class="profit-expense-layer"><button class="profit-drawer-overlay" data-profit-close-expense type="button" aria-label="关闭费用补录"></button><aside class="profit-expense-drawer" role="dialog" aria-modal="true" aria-labelledby="profitExpenseTitle"><header><div><span>费用补录</span><h2 id="profitExpenseTitle">确认最终利润</h2><p>${profitUiEscape(row.listing.displayName)} · ${state.activeDate}</p></div><button data-profit-close-expense type="button" aria-label="关闭">×</button></header><div class="profit-expense-form">${samples.map((sample) => `<label><span>${profitUiEscape(sample.name)}数量</span><div class="profit-number-input units"><input data-profit-expense-draft data-sample-type-id="${sample.id}" type="number" min="0" step="1" value="${profitUiInputValue(draft.sampleQuantities?.[sample.id])}" placeholder="待补" /><span>份</span></div><small>${profitUiMoney(sample.unitCost)} / 份</small></label>`).join("")}<label><span>广告费</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-draft data-field="advertisingSpend" type="number" min="0" step="0.01" value="${profitUiInputValue(draft.advertisingSpend)}" placeholder="待补" /></div><small>对应此链接当日支出</small></label><label><span>其他调整费用</span><div class="profit-number-input money"><span>$</span><input data-profit-expense-draft data-field="adjustments" type="number" min="0" step="0.01" value="${profitUiInputValue(draft.adjustments)}" placeholder="待补" /></div><small>确实无费用时填写 0</small></label><div class="profit-expense-preview"><span>补录后利润预览</span><b class="${preview.finalProfit < 0 ? "negative" : "positive"}">${profitUiMoney(preview.finalProfit)}</b><small>${profitExpenseDraftComplete(row.listing, draft) ? `利润率 ${profitUiPercent(preview.contributionMargin)}` : "仍有费用待补"}</small></div><div class="profit-expense-error" role="alert">${profitUiEscape(state.expenseError)}</div></div><footer><button data-profit-close-expense type="button">取消</button><button class="primary" data-profit-save-expense type="button">保存并确认最终利润</button></footer></aside></div>`;
    }

    function renderProfitListingDetail(state, listingId) {
      const row = selectListingProfitResult(state.repository, listingId, state.activeDate);
      if (!row) return '<div class="profit-empty-state">未找到该商品链接。</div>';
      const activeRows = row.skuRows.filter((item) => item.listingSku.active);
      const inactiveRows = row.skuRows.filter((item) => !item.listingSku.active);
      const decision = buildProfitListingDecisionModel(row);
      return `<div class="profit-detail-page listing-detail">
        ${renderProfitListingContext(state, row)}
        ${renderProfitDecisionCard(row, decision)}
        ${renderProfitCauseGrid(state, row)}
        ${renderProfitAllSkuPanel(state, row, activeRows, inactiveRows)}
        ${renderProfitTrendEvidence(state, row)}
        ${renderProfitListingManagement(state, row)}
        ${renderProfitExpenseDrawer(state, row)}
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
        state.expenseDrawerOpen = false;
        state.expenseDraft = null;
        state.expenseError = "";
        state.allSkusExpanded = false;
        state.trendExpanded = false;
        state.expandedSkuIds.clear();
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
      if (action.type === "toggleAllSkus") {
        state.allSkusExpanded = !state.allSkusExpanded;
        if (!state.allSkusExpanded) state.expandedSkuIds.clear();
        return true;
      }
      if (action.type === "toggleTrend") {
        state.trendExpanded = !state.trendExpanded;
        return true;
      }
      if (action.type === "openExpenseDrawer") {
        const row = selectListingProfitResult(state.repository, state.activeListingId, state.activeDate);
        if (!row) return false;
        state.expenseDrawerOpen = true;
        state.expenseDraft = JSON.parse(JSON.stringify(row.expense));
        state.expenseError = "";
        return true;
      }
      if (action.type === "updateExpenseDraft" && state.expenseDrawerOpen && state.expenseDraft) {
        if (action.sampleTypeId) {
          state.expenseDraft.sampleQuantities = { ...state.expenseDraft.sampleQuantities, [action.sampleTypeId]: action.value };
        } else if (action.field) state.expenseDraft[action.field] = action.value;
        return true;
      }
      if (action.type === "closeExpenseDrawer") {
        state.expenseDrawerOpen = false;
        state.expenseDraft = null;
        state.expenseError = "";
        return true;
      }
      if (action.type === "saveExpenseDraft") {
        const listing = state.repository.getListing(state.activeListingId);
        if (!listing || !profitExpenseDraftComplete(listing, state.expenseDraft)) {
          state.expenseError = "请填写全部费用；确实无费用时填写 0";
          return false;
        }
        state.repository.updateDailyExpense(state.activeListingId, state.activeDate, {
          sampleQuantities: state.expenseDraft.sampleQuantities,
          advertisingSpend: state.expenseDraft.advertisingSpend,
          adjustments: state.expenseDraft.adjustments
        });
        state.expenseDrawerOpen = false;
        state.expenseDraft = null;
        state.expenseError = "";
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

    function focusProfitExpenseDrawer(preferredControl) {
      const drawer = document.querySelector(".profit-expense-drawer");
      if (!drawer) return;
      const target = preferredControl
        ? [...drawer.querySelectorAll("[data-profit-expense-draft]")].find((control) => control.dataset.sampleTypeId === preferredControl.sampleTypeId && control.dataset.field === preferredControl.field)
        : drawer.querySelector("[data-profit-expense-draft]");
      (target || drawer.querySelector("button"))?.focus();
    }

    function restoreProfitDecisionFocus() {
      (document.querySelector("[data-profit-primary-action]") || document.querySelector("[data-profit-toggle-all-skus]") || document.getElementById("profitTemplateRoot"))?.focus?.();
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
        const expenseWasOpen = profitWorkspaceState.expenseDrawerOpen;
        const productButton = event.target.closest("[data-profit-open-product]");
        const listingButton = event.target.closest("[data-profit-open-listing]");
        const skuTrend = event.target.closest("[data-profit-sku-trend-toggle]");
        const addListing = event.target.closest("[data-profit-add-listing]");
        const addSku = event.target.closest("[data-profit-add-sku]");
        const toggleSku = event.target.closest("[data-profit-toggle-sku]");
        const lifecycle = event.target.closest("[data-profit-set-lifecycle]");
        const syncButton = event.target.closest("[data-profit-sync]");
        const connectShop = event.target.closest("[data-profit-connect-shop]");
        const applyProductCost = event.target.closest("[data-profit-apply-product-cost]");
        const primaryAction = event.target.closest("[data-profit-primary-action]");
        const toggleAllSkus = event.target.closest("[data-profit-toggle-all-skus]");
        const toggleTrend = event.target.closest("[data-profit-toggle-trend]");
        const closeExpense = event.target.closest("[data-profit-close-expense]");
        const saveExpense = event.target.closest("[data-profit-save-expense]");
        if (connectShop) void connectTikTokShop(connectShop);
        else if (syncButton) void syncProfitWorkspace(syncButton);
        else if (productButton) applyProfitWorkspaceAction(profitWorkspaceState, { type: "openProduct", productId: productButton.dataset.profitOpenProduct });
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
        else if (toggleAllSkus) applyProfitWorkspaceAction(profitWorkspaceState, { type: "toggleAllSkus" });
        else if (toggleTrend) applyProfitWorkspaceAction(profitWorkspaceState, { type: "toggleTrend" });
        else if (closeExpense) applyProfitWorkspaceAction(profitWorkspaceState, { type: "closeExpenseDrawer" });
        else if (saveExpense) {
          const saved = applyProfitWorkspaceAction(profitWorkspaceState, { type: "saveExpenseDraft" });
          if (saved) showToast("费用已保存，最终利润已更新");
        }
        else if (primaryAction) {
          const actionKey = primaryAction.dataset.profitPrimaryAction;
          if (actionKey === "complete_expenses") applyProfitWorkspaceAction(profitWorkspaceState, { type: "openExpenseDrawer" });
          else if (actionKey === "view_sync") showToast("店铺数据每日 17:00 同步");
          else profitWorkspaceState.allSkusExpanded = true;
        }
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
        if (profitWorkspaceState.expenseDrawerOpen && (!expenseWasOpen || saveExpense)) focusProfitExpenseDrawer();
        else if (expenseWasOpen && !profitWorkspaceState.expenseDrawerOpen) restoreProfitDecisionFocus();
      });

      root.addEventListener("change", (event) => {
        const dateFilter = event.target.closest("[data-profit-date-filter]");
        const storeFilter = event.target.closest("[data-profit-store-filter]");
        const lifecycleFilter = event.target.closest("[data-profit-lifecycle-filter]");
        const expenseDraftInput = event.target.closest("[data-profit-expense-draft]");
        if (dateFilter) profitWorkspaceState.activeDate = dateFilter.value;
        else if (storeFilter) profitWorkspaceState.storeFilter = storeFilter.value;
        else if (lifecycleFilter) profitWorkspaceState.lifecycleFilter = lifecycleFilter.value;
        else if (expenseDraftInput) {
          applyProfitWorkspaceAction(profitWorkspaceState, {
            type: "updateExpenseDraft",
            sampleTypeId: expenseDraftInput.dataset.sampleTypeId,
            field: expenseDraftInput.dataset.field,
            value: expenseDraftInput.value === "" ? null : expenseDraftInput.value
          });
        } else return;
        renderProfitTemplate();
        if (expenseDraftInput) {
          focusProfitExpenseDrawer({
            sampleTypeId: expenseDraftInput.dataset.sampleTypeId,
            field: expenseDraftInput.dataset.field
          });
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Tab" && profitWorkspaceState.expenseDrawerOpen) {
          const drawer = document.querySelector(".profit-expense-drawer");
          const controls = drawer ? [...drawer.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')] : [];
          if (controls.length) {
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
          return;
        }
        if (event.key !== "Escape") return;
        if (profitWorkspaceState.expenseDrawerOpen) {
          applyProfitWorkspaceAction(profitWorkspaceState, { type: "closeExpenseDrawer" });
          renderProfitTemplate();
          restoreProfitDecisionFocus();
        } else if (profitWorkspaceState.managementOpen) {
          profitWorkspaceState.managementOpen = false;
          renderProfitTemplate();
        }
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
      const authorizationResultUrl = new URL(location.href);
      if (authorizationResultUrl.searchParams.get("tiktok_shop") === "connected") {
        showToast("TikTok 店铺已安全连接，可以开始同步");
        authorizationResultUrl.searchParams.delete("tiktok_shop");
        history.replaceState(null, "", `${authorizationResultUrl.pathname}${authorizationResultUrl.search}${authorizationResultUrl.hash}`);
      }
    }

    if (typeof document !== "undefined") initProfitTemplate();
