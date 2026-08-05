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

    function calculateProfitSkuFact(fact = {}) {
      const priceMissing = fact.price === null || fact.price === undefined || fact.price === "";
      const unitsMissing = fact.units === null || fact.units === undefined || fact.units === "";
      const price = priceMissing ? null : Math.max(0, profitNumber(fact.price));
      const units = unitsMissing ? null : Math.max(0, Math.round(profitNumber(fact.units)));
      const completed = price !== null && units !== null;
      const safePrice = price ?? 0;
      const safeUnits = units ?? 0;
      const cost = Math.max(0, profitNumber(fact.costSnapshot ?? fact.cost));
      const commissionRate = Math.min(100, Math.max(0, profitNumber(fact.commissionSnapshot ?? fact.commissionRate)));
      const unitGrossProfit = safePrice * (1 - commissionRate / 100) - cost;
      return {
        price,
        units,
        revenue: safePrice * safeUnits,
        unitGrossProfit,
        skuGrossProfit: unitGrossProfit * safeUnits,
        completed
      };
    }

    function calculateListingContribution(skuFacts = [], expense = {}) {
      const results = skuFacts.map(calculateProfitSkuFact);
      const total = results.reduce((summary, result) => {
        summary.units += result.units ?? 0;
        summary.revenue += result.revenue;
        summary.skuGrossProfit += result.skuGrossProfit;
        summary.completedSkuCount += result.completed ? 1 : 0;
        summary.pendingSkuCount += result.completed ? 0 : 1;
        return summary;
      }, { units: 0, revenue: 0, skuGrossProfit: 0, completedSkuCount: 0, pendingSkuCount: 0 });
      const sampleCost = Math.max(0, profitNumber(expense.sampleCost));
      const marketingSpend = Math.max(0, profitNumber(expense.marketingSpend));
      const adjustments = Math.max(0, profitNumber(expense.adjustments));
      const contributionProfit = total.skuGrossProfit - sampleCost - marketingSpend - adjustments;
      return {
        units: total.units,
        revenue: total.revenue,
        skuGrossProfit: total.skuGrossProfit,
        sampleCost,
        marketingSpend,
        adjustments,
        contributionProfit,
        contributionMargin: total.revenue ? contributionProfit / total.revenue : 0,
        completedSkuCount: total.completedSkuCount,
        pendingSkuCount: total.pendingSkuCount
      };
    }

    function aggregateProductContribution(listingResults = []) {
      const total = (listingResults || []).reduce((summary, result) => {
        ["units", "revenue", "skuGrossProfit", "sampleCost", "marketingSpend", "adjustments", "contributionProfit"].forEach((key) => {
          summary[key] += profitNumber(result?.[key]);
        });
        return summary;
      }, { units: 0, revenue: 0, skuGrossProfit: 0, sampleCost: 0, marketingSpend: 0, adjustments: 0, contributionProfit: 0 });
      return { ...total, contributionMargin: total.revenue ? total.contributionProfit / total.revenue : 0 };
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
      if (profitNumber(values.cost, -1) < 0) return "单件成本不能小于 0";
      const commissionRate = profitNumber(values.commissionRate, -1);
      if (commissionRate < 0 || commissionRate > 100) return "佣金率必须在 0–100% 之间";
      return "";
    }
