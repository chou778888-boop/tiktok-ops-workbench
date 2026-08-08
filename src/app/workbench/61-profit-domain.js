    const PROFIT_LISTING_LIFECYCLES = ["draft", "active", "paused", "delisted", "archived"];

    function profitNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function profitIsoDate(dateKey) {
      const [year, month, day] = String(dateKey || "").split("-").map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return Number.isFinite(date.getTime()) ? date : null;
    }

    function profitShiftDate(dateKey, days) {
      const date = profitIsoDate(dateKey);
      if (!date) return "";
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    }

    function profitDateWindow(anchorDate, count = 7) {
      const size = Math.max(0, Math.floor(profitNumber(count)));
      if (!profitIsoDate(anchorDate) || !size) return [];
      return Array.from({ length: size }, (_, index) => profitShiftDate(anchorDate, index - size + 1));
    }

    function profitAverage(values) {
      const numbers = (values || []).map(Number).filter(Number.isFinite);
      return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
    }

    function profitMoney(value) {
      return Math.round((profitNumber(value) + Number.EPSILON) * 100) / 100;
    }

    function calculateProfitSkuFact(fact = {}) {
      const itemsSource = fact.itemsSold ?? fact.units;
      const itemsMissing = itemsSource === null || itemsSource === undefined || itemsSource === "";
      const itemsSold = itemsMissing ? null : Math.max(0, Math.round(profitNumber(itemsSource)));
      const priceMissing = fact.price === null || fact.price === undefined || fact.price === "";
      const price = priceMissing ? null : Math.max(0, profitNumber(fact.price));
      const gmvSource = fact.gmv ?? (price !== null && itemsSold !== null ? price * itemsSold : null);
      const gmvMissing = gmvSource === null || gmvSource === undefined || gmvSource === "";
      const gmv = gmvMissing ? null : profitMoney(Math.max(0, profitNumber(gmvSource)));
      const completed = gmv !== null && itemsSold !== null;
      const safeGmv = gmv ?? 0;
      const safeItems = itemsSold ?? 0;
      const productCost = Math.max(0, profitNumber(fact.productCostSnapshot ?? fact.costSnapshot ?? fact.cost));
      const productCostTotal = profitMoney(productCost * safeItems);
      const commissionRate = Math.min(100, Math.max(0, profitNumber(fact.commissionSnapshot ?? fact.commissionRate)));
      const estimatedShippingFee = profitMoney(Math.max(0, profitNumber(fact.estimatedShippingFee)));
      const estimatedPlatformFees = fact.estimatedPlatformFees === null || fact.estimatedPlatformFees === undefined
        ? profitMoney(safeGmv * commissionRate / 100)
        : profitMoney(Math.max(0, profitNumber(fact.estimatedPlatformFees)));
      const estimatedReceived = fact.estimatedReceived === null || fact.estimatedReceived === undefined
        ? profitMoney(safeGmv - estimatedShippingFee - estimatedPlatformFees)
        : profitMoney(fact.estimatedReceived);
      const contributionProfit = profitMoney(estimatedReceived - productCostTotal);
      const averageTransactionPrice = safeItems ? profitMoney(safeGmv / safeItems) : null;
      const unitGrossProfit = safeItems ? profitMoney(contributionProfit / safeItems) : profitMoney(-productCost);
      return {
        gmv,
        itemsSold,
        grossSales: fact.grossSales === null || fact.grossSales === undefined ? null : profitMoney(Math.max(0, profitNumber(fact.grossSales))),
        averageTransactionPrice,
        productCost,
        productCostTotal,
        estimatedShippingFee,
        estimatedPlatformFees,
        estimatedReceived,
        contributionProfit,
        price: price ?? averageTransactionPrice,
        units: itemsSold,
        revenue: safeGmv,
        unitGrossProfit,
        skuGrossProfit: contributionProfit,
        completed
      };
    }

    function calculateListingContribution(skuFacts = [], expense = {}, settlement = {}) {
      const results = skuFacts.map(calculateProfitSkuFact);
      const total = results.reduce((summary, result) => {
        summary.itemsSold += result.itemsSold ?? 0;
        summary.sumSkuGmv += result.gmv ?? 0;
        summary.productCostTotal += result.productCostTotal;
        summary.estimatedReceived += result.estimatedReceived;
        summary.skuContributionProfit += result.contributionProfit;
        summary.completedSkuCount += result.completed ? 1 : 0;
        summary.pendingSkuCount += result.completed ? 0 : 1;
        return summary;
      }, { itemsSold: 0, sumSkuGmv: 0, productCostTotal: 0, estimatedReceived: 0, skuContributionProfit: 0, completedSkuCount: 0, pendingSkuCount: 0 });
      const gmv = settlement.listingGmv === null || settlement.listingGmv === undefined
        ? profitMoney(total.sumSkuGmv)
        : profitMoney(Math.max(0, profitNumber(settlement.listingGmv)));
      const sumSkuGmv = profitMoney(total.sumSkuGmv);
      const reconciliationDifference = profitMoney(gmv - sumSkuGmv);
      const netProductSales = settlement.netProductSales === null || settlement.netProductSales === undefined
        ? gmv
        : profitMoney(Math.max(0, profitNumber(settlement.netProductSales)));
      const financialReconciliationDifference = profitMoney(netProductSales - gmv);
      const platformDiscounts = profitMoney(Math.max(0, profitNumber(settlement.platformDiscounts)));
      const sampleCostSource = expense.sampleCost ?? expense.sampleSpend;
      const advertisingSpendSource = expense.advertisingSpend ?? expense.marketingSpend;
      const adjustmentSource = expense.adjustments;
      const expenseValues = [sampleCostSource, advertisingSpendSource, adjustmentSource];
      const expensesComplete = expense.entryStatus !== "pending"
        && expenseValues.every((value) => value !== null && value !== undefined && value !== "");
      const sampleCost = sampleCostSource === null || sampleCostSource === undefined || sampleCostSource === ""
        ? null
        : profitMoney(Math.max(0, profitNumber(sampleCostSource)));
      const advertisingSpend = advertisingSpendSource === null || advertisingSpendSource === undefined || advertisingSpendSource === ""
        ? null
        : profitMoney(Math.max(0, profitNumber(advertisingSpendSource)));
      const adjustments = adjustmentSource === null || adjustmentSource === undefined || adjustmentSource === ""
        ? null
        : profitMoney(Math.max(0, profitNumber(adjustmentSource)));
      const estimatedReceived = settlement.estimatedReceived === null || settlement.estimatedReceived === undefined
        ? profitMoney(total.estimatedReceived)
        : profitMoney(settlement.estimatedReceived);
      const isSettled = settlement.settlementStatus === "settled"
        && settlement.settlementAmount !== null
        && settlement.settlementAmount !== undefined;
      const actualReceived = isSettled ? profitMoney(settlement.settlementAmount) : null;
      const receivedAmount = actualReceived ?? estimatedReceived;
      const productCostTotal = profitMoney(total.productCostTotal);
      const provisionalProfit = profitMoney(receivedAmount - productCostTotal);
      const knownInternalExpenses = profitMoney(profitNumber(sampleCost) + profitNumber(advertisingSpend) + profitNumber(adjustments));
      const finalProfit = profitMoney(provisionalProfit - knownInternalExpenses);
      const contributionMargin = gmv ? finalProfit / gmv : 0;
      return {
        gmv,
        sumSkuGmv,
        reconciliationDifference,
        netProductSales,
        financialReconciliationDifference,
        platformDiscounts,
        itemsSold: total.itemsSold,
        productCostTotal,
        estimatedReceived,
        actualReceived,
        receivedAmount,
        shippingFee: profitMoney(Math.max(0, profitNumber(settlement.shippingFee))),
        platformFees: profitMoney(Math.max(0, profitNumber(settlement.platformFees))),
        settlementStatus: settlement.settlementStatus || "estimated",
        profitStatus: isSettled ? "settled" : "estimated",
        sampleCost,
        advertisingSpend,
        adjustments,
        knownInternalExpenses,
        provisionalProfit,
        finalProfit,
        profitCompleteness: expensesComplete ? "complete" : "provisional",
        contributionMargin,
        skuContributionProfit: profitMoney(total.skuContributionProfit),
        completedSkuCount: total.completedSkuCount,
        pendingSkuCount: total.pendingSkuCount,
        units: total.itemsSold,
        revenue: gmv,
        skuGrossProfit: profitMoney(sumSkuGmv - productCostTotal),
        marketingSpend: advertisingSpend,
        contributionProfit: finalProfit
      };
    }

    function aggregateProductContribution(listingResults = []) {
      const total = (listingResults || []).reduce((summary, result) => {
        ["gmv", "sumSkuGmv", "netProductSales", "itemsSold", "productCostTotal", "estimatedReceived", "receivedAmount", "shippingFee", "platformFees", "platformDiscounts", "knownInternalExpenses", "provisionalProfit", "finalProfit", "skuContributionProfit", "skuGrossProfit"].forEach((key) => {
          summary[key] += profitNumber(result?.[key]);
        });
        summary.provisionalListingCount += result?.profitCompleteness === "provisional" ? 1 : 0;
        summary.actualReceived += result?.actualReceived === null || result?.actualReceived === undefined ? 0 : profitNumber(result.actualReceived);
        const isAggregated = Number.isFinite(Number(result?.settledListingCount))
          && Number.isFinite(Number(result?.estimatedListingCount));
        summary.settledListingCount += isAggregated
          ? profitNumber(result.settledListingCount)
          : (result?.profitStatus === "settled" ? 1 : 0);
        summary.estimatedListingCount += isAggregated
          ? profitNumber(result.estimatedListingCount)
          : (result?.profitStatus === "settled" ? 0 : 1);
        return summary;
      }, { gmv: 0, sumSkuGmv: 0, netProductSales: 0, itemsSold: 0, productCostTotal: 0, estimatedReceived: 0, actualReceived: 0, receivedAmount: 0, shippingFee: 0, platformFees: 0, platformDiscounts: 0, knownInternalExpenses: 0, provisionalProfit: 0, finalProfit: 0, skuContributionProfit: 0, skuGrossProfit: 0, settledListingCount: 0, estimatedListingCount: 0, provisionalListingCount: 0 });
      Object.keys(total).forEach((key) => { if (typeof total[key] === "number") total[key] = profitMoney(total[key]); });
      return {
        ...total,
        reconciliationDifference: profitMoney(total.gmv - total.sumSkuGmv),
        financialReconciliationDifference: profitMoney(total.netProductSales - total.gmv),
        profitCompleteness: total.provisionalListingCount > 0 ? "provisional" : "complete",
        contributionMargin: total.gmv ? total.finalProfit / total.gmv : 0,
        units: total.itemsSold,
        revenue: total.gmv,
        marketingSpend: total.knownInternalExpenses,
        contributionProfit: total.finalProfit
      };
    }

    function prepareProfitDailyEntry(facts = [], dateKey) {
      const existing = (facts || []).find((fact) => fact.dateKey === dateKey);
      if (existing) {
        return {
          dateKey,
          price: existing.price ?? null,
          units: existing.units ?? null,
          entryStatus: existing.entryStatus || (existing.units === null || existing.units === undefined ? "pending" : "completed")
        };
      }
      const previous = (facts || [])
        .filter((fact) => fact.dateKey < dateKey && fact.price !== null && fact.price !== undefined && fact.price !== "")
        .sort((left, right) => right.dateKey.localeCompare(left.dateKey))[0];
      return { dateKey, price: previous ? profitNumber(previous.price) : null, units: null, entryStatus: "pending" };
    }

    function createPriceObservation(values = {}) {
      if (values.changeKind !== "planned") return null;
      const startedAt = values.startedAt;
      if (!profitIsoDate(startedAt)) return null;
      return {
        id: values.id || (globalThis.crypto?.randomUUID?.() ?? `observation-${startedAt}`),
        productId: values.productId,
        listingId: values.listingId,
        listingSkuId: values.listingSkuId,
        oldPrice: profitNumber(values.oldPrice),
        newPrice: profitNumber(values.newPrice),
        purpose: "target_sku_velocity",
        startedAt,
        baselineStart: profitShiftDate(startedAt, -7),
        baselineEnd: profitShiftDate(startedAt, -1),
        observationStart: startedAt,
        observationEnd: profitShiftDate(startedAt, 6),
        status: "observing",
        decision: null
      };
    }

    function evaluatePriceObservation(observation, evidence = {}, threshold = 0.1) {
      const baselineTarget = profitAverage(evidence.baselineTargetUnits);
      const observedTarget = profitAverage(evidence.observedTargetUnits);
      const baselineProduct = profitAverage(evidence.baselineProductUnits);
      const observedProduct = profitAverage(evidence.observedProductUnits);
      const targetUnitLift = baselineTarget ? (observedTarget - baselineTarget) / baselineTarget : null;
      const productUnitLift = baselineProduct ? (observedProduct - baselineProduct) / baselineProduct : null;
      const baselineProfit = profitNumber(evidence.baselineContributionProfit);
      const observedProfit = profitNumber(evidence.observedContributionProfit);
      const profitLift = baselineProfit ? (observedProfit - baselineProfit) / Math.abs(baselineProfit) : null;
      let decision = "insufficient_data";
      if (targetUnitLift !== null && productUnitLift !== null && profitLift !== null) {
        if (targetUnitLift >= threshold && productUnitLift > 0 && observedProfit >= 0) decision = "improved";
        else if (targetUnitLift >= threshold && observedProfit < baselineProfit) decision = "velocity_up_profit_pressure";
        else if (targetUnitLift >= threshold && productUnitLift <= 0) decision = "possible_cannibalization";
        else if (targetUnitLift > 0) decision = "no_clear_improvement";
        else decision = "failed";
      }
      return { ...observation, status: "review", decision, targetUnitLift, productUnitLift, profitLift };
    }

    function validateProfitProduct(values = {}) {
      if (!String(values.code || "").trim()) return "请输入产品简称";
      if (!String(values.name || "").trim()) return "请输入产品名称";
      return "";
    }

    function validateProfitListing(values = {}) {
      if (!String(values.productId || "").trim()) return "请选择所属产品";
      if (!String(values.storeId || "").trim()) return "请选择所属店铺";
      try {
        const url = new URL(String(values.url || "").trim());
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error("invalid protocol");
      } catch {
        return "请输入有效的商品链接";
      }
      if (!PROFIT_LISTING_LIFECYCLES.includes(values.lifecycleStatus || "active")) return "链接状态无效";
      return "";
    }

    function validateProfitListingSku(values = {}) {
      if (!String(values.listingId || "").trim()) return "请选择商品链接";
      if (!String(values.skuId || "").trim()) return "请选择公共 SKU";
      return "";
    }
