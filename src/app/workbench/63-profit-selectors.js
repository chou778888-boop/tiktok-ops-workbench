    function profitObservationActive(observation, dateKey) {
      return observation && ["observing", "review"].includes(observation.status)
        && observation.observationStart <= dateKey;
    }

    function selectListingSkuTrend(repository, listingSkuId, anchorDate, count = 7) {
      const dates = profitDateWindow(anchorDate, count);
      const facts = repository.getDailyFacts(listingSkuId);
      const points = dates.map((dateKey) => {
        const fact = facts.find((item) => item.dateKey === dateKey) || prepareProfitDailyEntry(facts, dateKey);
        return { dateKey, ...calculateProfitSkuFact(fact) };
      });
      const completePoints = points.filter((point) => point.completed);
      const averageUnits = profitAverage(completePoints.map((point) => point.units));
      const averageTransactionPrice = profitAverage(completePoints.map((point) => point.averageTransactionPrice));
      const firstPrice = completePoints[0]?.averageTransactionPrice;
      const lastPrice = completePoints.at(-1)?.averageTransactionPrice;
      const priceChange = firstPrice ? (lastPrice - firstPrice) / firstPrice : null;
      const previousDates = profitDateWindow(profitShiftDate(dates[0], -1), count);
      const previousPoints = previousDates.map((dateKey) => calculateProfitSkuFact(
        facts.find((item) => item.dateKey === dateKey) || prepareProfitDailyEntry(facts, dateKey)
      )).filter((point) => point.completed);
      const previousAverageUnits = profitAverage(previousPoints.map((point) => point.units));
      const unitChange = previousAverageUnits ? (averageUnits - previousAverageUnits) / previousAverageUnits : null;
      return { points, averageUnits, averageTransactionPrice, previousAverageUnits, unitChange, priceChange };
    }

    function classifyProfitHealth(result = {}, observing = false) {
      if (profitNumber(result.pendingSkuCount) > 0) return { key: "pending", label: "数据待同步", tone: "pending" };
      if (result.profitCompleteness === "provisional") return { key: "expense_pending", label: "费用待补", tone: "warning" };
      if (profitNumber(result.finalProfit ?? result.contributionProfit) < 0) return { key: "loss", label: "经营亏损", tone: "critical" };
      if (profitNumber(result.contributionMargin) < 0.08) return { key: "low_margin", label: "利润偏低", tone: "warning" };
      if (observing) return { key: "observing", label: "调价观察中", tone: "observing" };
      if (result.profitStatus && result.profitStatus !== "settled") return { key: "processing", label: "结算处理中", tone: "processing" };
      return { key: "healthy", label: "经营正常", tone: "healthy" };
    }

    function selectListingDailyResult(repository, listing, listingSkus, product, dateKey) {
      const activeListingSkus = listingSkus.filter((row) => row.active);
      const facts = activeListingSkus.map((listingSku) => {
        const entries = repository.getDailyFacts(listingSku.id);
        const entry = repository.getDailyFact(listingSku.id, dateKey) || prepareProfitDailyEntry(entries, dateKey);
        return {
          ...entry,
          productCostSnapshot: entry.productCostSnapshot ?? product?.standardUnitCost,
          costSnapshot: entry.costSnapshot ?? product?.standardUnitCost,
          commissionSnapshot: entry.commissionSnapshot ?? listingSku.commissionRateOverride
        };
      });
      const expense = repository.getDailyExpense(listing.id, dateKey) || {
        listingId: listing.id,
        dateKey,
        sampleQuantities: {},
        sampleCost: null,
        advertisingSpend: null,
        marketingSpend: null,
        adjustments: null,
        entryStatus: "pending"
      };
      const settlement = repository.getDailySettlement(listing.id, dateKey) || {
        listingId: listing.id,
        dateKey,
        settlementStatus: "estimated",
        listingGmv: facts.reduce((sum, fact) => sum + profitNumber(fact.gmv), 0),
        settlementAmount: null,
        source: "待同步"
      };
      return { dateKey, facts, expense, settlement, result: calculateListingContribution(facts, expense, settlement) };
    }

    function selectListingProfitResult(repository, listingId, dateKey) {
      const listing = repository.getListing(listingId);
      if (!listing) return null;
      const product = repository.getProduct(listing.productId);
      const listingSkus = repository.getListingSkus(listingId, { includeInactive: true });
      const skuRows = listingSkus.map((listingSku) => {
        const sku = repository.getSkuMaster(listingSku.skuId);
        const facts = repository.getDailyFacts(listingSku.id);
        const entry = repository.getDailyFact(listingSku.id, dateKey) || prepareProfitDailyEntry(facts, dateKey);
        const fact = {
          ...entry,
          productCostSnapshot: entry.productCostSnapshot ?? product?.standardUnitCost,
          costSnapshot: entry.costSnapshot ?? product?.standardUnitCost,
          commissionSnapshot: entry.commissionSnapshot ?? listingSku.commissionRateOverride
        };
        const observation = repository.getState().priceObservations.find((item) => (
          item.listingSkuId === listingSku.id && profitObservationActive(item, dateKey)
        )) || null;
        return {
          listingSku,
          sku,
          fact,
          result: calculateProfitSkuFact(fact),
          trend: selectListingSkuTrend(repository, listingSku.id, dateKey),
          observation
        };
      });
      const daily = selectListingDailyResult(repository, listing, listingSkus, product, dateKey);
      const sevenDays = profitDateWindow(dateKey, 7).map((day) => selectListingDailyResult(repository, listing, listingSkus, product, day));
      const sevenDayResult = aggregateProductContribution(sevenDays.map((day) => day.result));
      const sevenDay = {
        days: sevenDays,
        result: sevenDayResult,
        averageTransactionPrice: sevenDayResult.itemsSold ? profitMoney(sevenDayResult.gmv / sevenDayResult.itemsSold) : null
      };
      const observations = skuRows.map((row) => row.observation).filter(Boolean);
      return {
        listing,
        store: repository.getStore(listing.storeId),
        product,
        skuRows,
        expense: daily.expense,
        settlement: daily.settlement,
        result: daily.result,
        sevenDay,
        observations,
        health: classifyProfitHealth(daily.result, observations.length > 0)
      };
    }

    function selectProductProfitRows(repository, dateKey, filters = {}) {
      const state = repository.getState();
      return state.products
        .filter((product) => product.status !== "archived")
        .map((product) => {
          let listings = repository.getProductListings(product.id, { includeArchived: true });
          if (filters.storeId) listings = listings.filter((listing) => listing.storeId === filters.storeId);
          if (filters.lifecycleStatus) listings = listings.filter((listing) => listing.lifecycleStatus === filters.lifecycleStatus);
          const listingRows = listings
            .filter((listing) => listing.lifecycleStatus !== "archived")
            .filter((listing) => !(listing.lifecycleStatus === "delisted" && listing.delistedAt && listing.delistedAt < dateKey))
            .map((listing) => selectListingProfitResult(repository, listing.id, dateKey));
          const result = aggregateProductContribution(listingRows.map((row) => row.result));
          const sevenDays = profitDateWindow(dateKey, 7).map((day) => {
            const dayResults = listingRows.map((row) => row.sevenDay.days.find((item) => item.dateKey === day)?.result).filter(Boolean);
            return { dateKey: day, result: aggregateProductContribution(dayResults) };
          });
          const sevenDayResult = aggregateProductContribution(
            listingRows.flatMap((row) => row.sevenDay.days.map((day) => day.result))
          );
          const observationCount = listingRows.reduce((sum, row) => sum + row.observations.length, 0);
          const pendingListingCount = listingRows.filter((row) => row.result.pendingSkuCount > 0).length;
          const health = classifyProfitHealth({
            ...result,
            pendingSkuCount: listingRows.reduce((sum, row) => sum + row.result.pendingSkuCount, 0)
          }, observationCount > 0);
          return {
            product,
            listings: listingRows,
            listingCount: listingRows.length,
            activeListingCount: listingRows.filter((row) => row.listing.lifecycleStatus === "active").length,
            newListingCount: listingRows.filter((row) => row.listing.launchedAt >= profitShiftDate(dateKey, -7)).length,
            delistedListingCount: listings.filter((listing) => listing.lifecycleStatus === "delisted").length,
            pendingListingCount,
            observationCount,
            result,
            sevenDay: {
              days: sevenDays,
              result: sevenDayResult,
              averageTransactionPrice: sevenDayResult.itemsSold ? profitMoney(sevenDayResult.gmv / sevenDayResult.itemsSold) : null
            },
            health
          };
        })
        .filter((row) => row.listingCount > 0)
        .sort((left, right) => right.sevenDay.result.itemsSold - left.sevenDay.result.itemsSold);
    }

    function selectProfitWorkspaceSummary(productRows = []) {
      const result = aggregateProductContribution(productRows.map((row) => row.sevenDay?.result || row.result));
      return {
        productCount: productRows.length,
        listingCount: productRows.reduce((sum, row) => sum + row.listingCount, 0),
        activeListingCount: productRows.reduce((sum, row) => sum + row.activeListingCount, 0),
        pendingEntryCount: productRows.reduce((sum, row) => sum + row.pendingListingCount, 0),
        observationCount: productRows.reduce((sum, row) => sum + row.observationCount, 0),
        ...result
      };
    }

    function selectProfitAttentionItems(productRows = []) {
      const items = [];
      productRows.forEach((productRow) => {
        productRow.listings.forEach((listingRow) => {
          if (listingRow.result.pendingSkuCount > 0) {
            items.push({
              id: `pending-${listingRow.listing.id}`,
              kind: "pending",
              tone: "pending",
              priority: 0,
              productId: productRow.product.id,
              listingId: listingRow.listing.id,
              title: `${productRow.product.code} · ${listingRow.listing.displayName}`,
              detail: `${listingRow.result.pendingSkuCount} 个 SKU 待填写今日销量`
            });
          }
          if (listingRow.result.profitCompleteness === "provisional") {
            items.push({
              id: `expense-pending-${listingRow.listing.id}`,
              kind: "expense_pending",
              tone: "warning",
              priority: 1,
              productId: productRow.product.id,
              listingId: listingRow.listing.id,
              title: `${productRow.product.code} · 广告、样品待补`,
              detail: `已得暂算利润 ${listingRow.result.provisionalProfit.toFixed(2)} 美元，补齐内部费用后转为最终利润`
            });
          }
          if (listingRow.result.finalProfit < 0) {
            items.push({
              id: `loss-${listingRow.listing.id}`,
              kind: "loss",
              tone: "critical",
              priority: 1,
              productId: productRow.product.id,
              listingId: listingRow.listing.id,
              title: `${productRow.product.code} · ${listingRow.listing.displayName}`,
              detail: `当前利润 ${listingRow.result.finalProfit.toFixed(2)} 美元`
            });
          }
          if (Math.abs(profitNumber(listingRow.result.reconciliationDifference)) >= 0.01) {
            items.push({
              id: `reconcile-${listingRow.listing.id}`,
              kind: "reconcile",
              tone: "warning",
              priority: 2,
              productId: productRow.product.id,
              listingId: listingRow.listing.id,
              title: `${productRow.product.code} · SKU 对账差异`,
              detail: `链接与 SKU 汇总相差 ${profitMoney(Math.abs(listingRow.result.reconciliationDifference)).toFixed(2)} 美元`
            });
          }
          listingRow.observations.forEach((observation) => {
            const currentDay = Math.min(7, Math.max(1, Math.floor((profitIsoDate(observation.observationEnd) - profitIsoDate(observation.observationStart)) / 86400000) + 1));
            items.push({
              id: observation.id,
              kind: "observation",
              tone: "observing",
              priority: 2,
              productId: productRow.product.id,
              listingId: listingRow.listing.id,
              listingSkuId: observation.listingSkuId,
              title: `${productRow.product.code} · 调价观察`,
              detail: `观察至 ${observation.observationEnd}，目标 SKU 动销优先`,
              progress: currentDay
            });
          });
        });
      });
      return items.sort((left, right) => left.priority - right.priority).slice(0, 8);
    }
