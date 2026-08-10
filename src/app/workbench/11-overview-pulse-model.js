    function overviewPulseDensity(points = []) {
      const syncedDays = (Array.isArray(points) ? points : []).filter((point) => point?.synced).length;
      return { syncedDays, sparse: syncedDays < 2 };
    }

    function overviewTrendComparisonState(currentDays, previousDays, expectedDays = 7) {
      const current = Math.max(0, Number(currentDays) || 0);
      const previous = Math.max(0, Number(previousDays) || 0);
      if (current < expectedDays) return { comparable: false, label: `当前仅${current}天数据` };
      if (previous < expectedDays) return { comparable: false, label: "前7日数据不完整" };
      return { comparable: true, label: "" };
    }

    function overviewCompactMoney(value) {
      const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
      const absolute = Math.abs(amount);
      if (absolute >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}m`;
      if (absolute >= 1_000) return `$${(amount / 1_000).toFixed(1)}k`;
      return `$${Math.round(amount).toLocaleString("en-US")}`;
    }

    function overviewModelNumber(value) {
      return Number.isFinite(Number(value)) ? Number(value) : 0;
    }

    function overviewModelDateKeys(start, end) {
      const keys = [];
      const cursor = new Date(`${String(start || "")}T00:00:00Z`);
      const limit = new Date(`${String(end || "")}T00:00:00Z`);
      while (!Number.isNaN(cursor.getTime()) && !Number.isNaN(limit.getTime()) && cursor <= limit) {
        keys.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      return keys;
    }

    function makeOverviewOperatingTrendModel(entries = [], range = {}) {
      const rows = Array.isArray(entries) ? entries.filter(Boolean) : [];
      const points = overviewModelDateKeys(range?.start, range?.end).map((dateKey) => {
        const dayRows = rows.filter((entry) => String(entry?.date || "") === dateKey);
        if (!dayRows.length) {
          return { dateKey, synced: false, gmv: null, orders: null, averageOrderValue: null };
        }
        const gmv = dayRows.reduce((sum, entry) => sum + overviewModelNumber(entry.gmv), 0);
        const orders = dayRows.reduce((sum, entry) => sum + overviewModelNumber(entry.orders), 0);
        return {
          dateKey,
          synced: true,
          gmv,
          orders,
          averageOrderValue: orders > 0 ? Math.round(gmv / orders * 100) / 100 : null
        };
      });
      const syncedPoints = points.filter((point) => point.synced);
      const gmv = syncedPoints.reduce((sum, point) => sum + point.gmv, 0);
      const orders = syncedPoints.reduce((sum, point) => sum + point.orders, 0);
      return {
        points,
        summary: {
          gmv,
          orders,
          averageOrderValue: orders > 0 ? Math.round(gmv / orders * 100) / 100 : null,
          syncedDays: syncedPoints.length,
          expectedDays: points.length
        }
      };
    }

    function latestCompleteOverviewDay(entries = [], selectedDate = "") {
      const rows = (Array.isArray(entries) ? entries : []).filter((entry) => {
        const dateKey = String(entry?.date || "");
        return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) && dateKey <= String(selectedDate || "");
      });
      const dateKey = rows.map((entry) => String(entry.date)).sort().at(-1);
      if (!dateKey) return null;
      const dayRows = rows.filter((entry) => String(entry.date) === dateKey);
      const totals = dayRows.reduce((result, entry) => ({
        gmv: result.gmv + overviewModelNumber(entry.gmv),
        orders: result.orders + overviewModelNumber(entry.orders),
        units: result.units + overviewModelNumber(entry.units),
        adSpend: result.adSpend + overviewModelNumber(entry.adSpend),
        adGmv: result.adGmv + overviewModelNumber(entry.adGmv)
      }), { gmv: 0, orders: 0, units: 0, adSpend: 0, adGmv: 0 });
      return {
        dateKey,
        ...totals,
        roi: totals.adSpend > 0 ? Math.round(totals.adGmv / totals.adSpend * 100) / 100 : 0
      };
    }

    function overviewEntrySource(entry = {}) {
      return String(entry?.source || "历史录入");
    }

    function overviewAnalysisVisibility(mode = "gmv", dualDisplay = false) {
      const normalizedMode = mode === "link" ? "link" : "gmv";
      const isDual = Boolean(dualDisplay);
      return {
        mode: normalizedMode,
        dualDisplay: isDual,
        gmvHidden: isDual ? false : normalizedMode !== "gmv",
        linkHidden: isDual ? false : normalizedMode !== "link",
        gmvPressed: normalizedMode === "gmv",
        linkPressed: normalizedMode === "link"
      };
    }

    function overviewViewActivationPlan(viewName, renderedRevision, currentRevision) {
      const renderFullView = renderedRevision !== currentRevision;
      return {
        renderFullView,
        syncOverviewAnalysis: viewName === "overview" && !renderFullView
      };
    }

    function overviewAnalysisResizeDecision(previousSize = {}, nextSize = {}, isOverviewActive = false) {
      const width = Math.max(0, Math.round(Number(nextSize.width) || 0));
      const height = Math.max(0, Math.round(Number(nextSize.height) || 0));
      const previousWidth = Math.max(0, Math.round(Number(previousSize.width) || 0));
      const previousHeight = Math.max(0, Math.round(Number(previousSize.height) || 0));
      return {
        width,
        height,
        redraw: Boolean(isOverviewActive && width > 0 && height > 0
          && (width !== previousWidth || height !== previousHeight))
      };
    }

    function overviewChartState(hasData) {
      const shouldDraw = Boolean(hasData);
      return { isEmpty: !shouldDraw, shouldDraw };
    }

    function overviewProfitNavigationTarget(listingId, getListing) {
      const normalizedListingId = String(listingId || "");
      if (!normalizedListingId || typeof getListing !== "function") return null;
      const listing = getListing(normalizedListingId);
      if (!listing) return null;
      return {
        listingId: normalizedListingId,
        productId: listing.productId || null
      };
    }

    function overviewPulseRangeLabel(points = []) {
      const dateKeys = (Array.isArray(points) ? points : [])
        .map((point) => String(point?.dateKey || ""))
        .filter((dateKey) => /^\d{4}-\d{2}-\d{2}$/.test(dateKey))
        .sort();
      if (!dateKeys.length) return "链接周期待同步";
      return dateKeys[0] === dateKeys.at(-1) ? dateKeys[0] : `${dateKeys[0]}—${dateKeys.at(-1)}`;
    }

    function makeOverviewDecisionModel(totals = {}, anomalies = [], context = {}) {
      const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
      const storesWithData = Math.max(0, number(context.storesWithData));
      const totalStores = Math.max(storesWithData, number(context.totalStores));
      const available = storesWithData > 0 || number(totals.gmv) > 0 || number(totals.orders) > 0;
      const levelRank = { "紧急": 0, "重要": 1, "观察": 2 };
      const risks = (Array.isArray(anomalies) ? anomalies : [])
        .filter(Boolean)
        .map((item, index) => ({ item, index }))
        .sort((left, right) => (
          (levelRank[left.item.level] ?? 3) - (levelRank[right.item.level] ?? 3)
          || left.index - right.index
        ))
        .map(({ item }) => item);
      const urgentCount = risks.filter((item) => item.level === "紧急").length;
      const importantCount = risks.filter((item) => item.level === "重要").length;
      const priority = risks[0] || null;
      const rangeLabel = String(context.rangeLabel || "当前");
      const roi = number(totals.adSpend) > 0
        ? Math.round(number(totals.adGmv) / number(totals.adSpend) * 100) / 100
        : 0;

      if (!available) {
        return {
          available: false,
          tone: "pending",
          statusLabel: "等待数据",
          headline: "所选范围还没有经营数据",
          detail: "完成店群日报或同步店铺数据后，系统会先形成整体经营判断。",
          pathLabel: "店群 → 店铺 → 链接 → SKU → 负责人",
          priority: null,
          metrics: { gmv: 0, orders: 0, units: 0, roi: 0, riskCount: 0, highPriorityCount: 0, storesWithData, totalStores }
        };
      }

      const tone = urgentCount ? "critical" : importantCount ? "warning" : "healthy";
      const headline = urgentCount
        ? `${urgentCount}项紧急风险正在影响${rangeLabel}经营结果`
        : importantCount
          ? `${importantCount}项重要风险需要优先推进`
          : "整体经营稳定，继续观察来源结构";
      const detail = priority
        ? `最优先处理：${String(priority.title || "经营异常")}。${String(priority.detail || "请进入明细确认原因。")}`
        : `${storesWithData}/${totalStores}家店铺在所选范围内有数据，当前没有系统识别出的高优先异常。`;
      const pathLabel = priority
        ? `店群 → ${String(priority.store || "待定位店铺")} → ${String(priority.sku || "无SKU")} → ${String(priority.owner || "待分配")}`
        : `店群 → ${storesWithData}家店铺 → 来源结构 → 日常优化`;

      return {
        available: true,
        tone,
        statusLabel: urgentCount ? `${urgentCount}项紧急` : importantCount ? `${importantCount}项重要` : "经营稳定",
        headline,
        detail,
        pathLabel,
        priority,
        metrics: {
          gmv: number(totals.gmv),
          orders: number(totals.orders),
          units: number(totals.units),
          roi,
          riskCount: risks.length,
          highPriorityCount: urgentCount + importantCount,
          storesWithData,
          totalStores
        }
      };
    }

    function makeOverviewPulseModel(productRows = [], attentionItems = [], activeDate = "") {
      const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
      const products = Array.isArray(productRows) ? productRows.filter((row) => row?.product) : [];
      const productRow = products.find((row) => Array.isArray(row.listings) && row.listings.length) || null;
      if (!productRow) {
        return {
          available: false,
          activeDate,
          productCode: "",
          productName: "",
          listingId: "",
          listingName: "",
          storeName: "",
          activeSkuCount: 0,
          pathLabel: "产品 → 店铺 → 链接 → SKU",
          healthLabel: "等待数据",
          healthTone: "pending",
          focusTitle: "还没有可判断的产品链接",
          focusDetail: "同步店铺经营与结算数据后，这里会自动定位最值得处理的链接。",
          metrics: {
            itemsSold: 0,
            gmv: 0,
            receivedAmount: 0,
            finalProfit: 0,
            profitLabel: "暂算利润",
            periodLabel: "近7日"
          },
          signals: {
            priceLabel: "等待成交数据",
            motionLabel: "等待同步数据",
            actionLabel: "等待经营判断"
          },
          points: []
        };
      }

      const listings = [...productRow.listings].filter(Boolean).sort((left, right) => (
        number(right?.sevenDay?.result?.itemsSold) - number(left?.sevenDay?.result?.itemsSold)
      ));
      const listingRow = listings[0];
      const result = listingRow?.sevenDay?.result || listingRow?.result || {};
      const attention = (Array.isArray(attentionItems) ? attentionItems : []).find((item) => (
        item?.listingId === listingRow?.listing?.id
      )) || null;
      const productCode = String(productRow.product.code || productRow.product.name || "产品");
      const storeName = String(listingRow?.store?.name || "未分配店铺");
      const listingName = String(listingRow?.listing?.displayName || "主链接");
      const activeSkuCount = (listingRow?.skuRows || []).filter((row) => row?.listingSku?.active).length;
      const averageFallback = number(listingRow?.sevenDay?.averageTransactionPrice);
      const points = (listingRow?.sevenDay?.days || []).map((day) => {
        const dayResult = day?.result || {};
        const itemsSold = number(dayResult.itemsSold);
        const gmv = number(dayResult.gmv);
        const synced = number(dayResult.completedSkuCount) > 0 || itemsSold > 0 || gmv > 0;
        return {
          dateKey: String(day?.dateKey || ""),
          synced,
          itemsSold: synced ? itemsSold : null,
          averageTransactionPrice: synced
            ? (itemsSold > 0 ? Math.round(gmv / itemsSold * 100) / 100 : averageFallback || null)
            : null
        };
      });
      const syncedPoints = points.filter((point) => point.synced);
      const latestPoint = syncedPoints.at(-1) || null;
      const priceLabel = latestPoint?.averageTransactionPrice
        ? `$${latestPoint.averageTransactionPrice.toFixed(2)} 当前成交均价`
        : "等待成交数据";

      return {
        available: true,
        activeDate,
        productCode,
        productName: String(productRow.product.name || ""),
        listingId: String(listingRow?.listing?.id || ""),
        listingName,
        storeName,
        activeSkuCount,
        pathLabel: `${productCode} · ${storeName} · 主链接 · ${activeSkuCount} 个 SKU`,
        healthLabel: String(listingRow?.health?.label || productRow?.health?.label || (attention ? "需要处理" : "经营正常")),
        healthTone: String(listingRow?.health?.tone || productRow?.health?.tone || attention?.tone || "healthy"),
        focusTitle: String(attention?.title || `${productCode} · ${listingRow?.health?.label || "查看链接经营结果"}`),
        focusDetail: attention?.detail
          ? `${activeDate || "当前经营日"} 单日判断 · ${String(attention.detail)}`
          : `近 7 天销量 ${number(result.itemsSold).toLocaleString("en-US")} 件，进入链接查看成交均价、实际到手与 SKU 利润。`,
        metrics: {
          itemsSold: number(result.itemsSold),
          gmv: number(result.gmv),
          receivedAmount: number(result.receivedAmount),
          finalProfit: number(result.finalProfit),
          profitLabel: result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润",
          periodLabel: "近7日"
        },
        signals: {
          priceLabel,
          motionLabel: `${syncedPoints.length}/7 天已同步 · ${number(result.itemsSold).toLocaleString("en-US")} 件`,
          actionLabel: String(attention?.title || listingRow?.health?.label || "查看链接经营结果")
        },
        points
      };
    }
