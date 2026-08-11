    function buildProfitTrendAvailability(sevenDay = {}) {
      const days = Array.isArray(sevenDay.days) ? sevenDay.days : [];
      const completeDays = days.filter((day) => profitNumber(day?.result?.completedSkuCount) > 0);
      const completeDayCount = completeDays.length;
      const mode = completeDayCount === 0
        ? "empty"
        : completeDayCount <= 2
          ? "insufficient"
          : completeDayCount < 7 ? "partial" : "complete";
      return { mode, completeDayCount, comparisonAllowed: completeDayCount === 7, days, completeDays };
    }

    function profitExpenseDraftComplete(listing = {}, draft = {}) {
      const sampleTypes = Array.isArray(listing.sampleTypes) ? listing.sampleTypes : [];
      const isPresent = (value) => value !== null && value !== undefined && value !== "";
      const samplesComplete = sampleTypes.every((sample) => isPresent(draft.sampleQuantities?.[sample.id]));
      return samplesComplete && isPresent(draft.advertisingSpend) && isPresent(draft.adjustments);
    }

    function buildProfitListingDecisionModel(listingResult = {}) {
      const result = listingResult.result || {};
      const amount = profitNumber(result.finalProfit);
      const reconciliationDifference = Math.abs(profitNumber(result.reconciliationDifference));
      let decision = {
        key: "healthy",
        tone: "healthy",
        title: "当前经营盈利",
        summary: "数据已完整，可继续查看经营建议。",
        action: { key: "view_recommendations", label: "查看经营建议" }
      };
      if (profitNumber(result.pendingSkuCount) > 0) {
        decision = {
          key: "pending",
          tone: "pending",
          title: "今日数据待同步",
          summary: "当前数据不足以形成今日利润判断。",
          action: { key: "view_sync", label: "查看同步状态" }
        };
      } else if (reconciliationDifference >= 0.01) {
        decision = {
          key: "reconciliation",
          tone: "warning",
          title: "链接与 SKU 汇总待核对",
          summary: "链接汇总与 SKU 汇总存在差异。",
          action: { key: "review_reconciliation", label: "核对汇总差异" }
        };
      } else if (result.profitCompleteness === "provisional") {
        decision = {
          key: "expense_pending",
          tone: "warning",
          title: `当前暂算${amount < 0 ? "亏损" : "盈利"}`,
          summary: "平台已结算；补齐广告、样品和调整后才能确认最终利润。",
          action: { key: "complete_expenses", label: "补齐费用" }
        };
      } else if (amount < 0) {
        decision = {
          key: "loss",
          tone: "critical",
          title: "当前经营亏损",
          summary: "优先检查最大成本项和低商品毛利 SKU。",
          action: { key: "view_profit_drag", label: "查看利润拖累" }
        };
      } else if (profitNumber(result.contributionMargin) < 0.08) {
        decision = {
          key: "low_margin",
          tone: "warning",
          title: "当前利润偏低",
          summary: "利润率低于 8% 经营阈值。",
          action: { key: "view_opportunities", label: "查看改善机会" }
        };
      }
      const averageTransactionPrice = profitNumber(result.itemsSold) > 0
        ? profitMoney(profitNumber(result.gmv) / profitNumber(result.itemsSold))
        : null;
      return {
        ...decision,
        amount,
        amountLabel: result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润",
        margin: result.contributionMargin,
        receivedAmount: result.receivedAmount,
        auxiliaryMetrics: [
          { key: "gmv", label: "经营 GMV", value: result.gmv },
          { key: "average_price", label: "成交均价", value: averageTransactionPrice },
          { key: "units", label: "销量", value: result.itemsSold },
          { key: "product_cost", label: "产品成本", value: result.productCostTotal }
        ]
      };
    }

    function selectProfitFocusSkuRows(skuRows = [], limit = 3) {
      const active = skuRows.filter((row) => row?.listingSku?.active);
      const gross = (row) => profitNumber(row?.result?.skuGrossProfit);
      const units = (row) => profitNumber(row?.result?.itemsSold);
      const withSignal = (row, focusSignal, focusPriority) => ({ ...row, focusSignal, focusPriority });
      const pending = active
        .filter((row) => !row.result?.completed)
        .map((row) => withSignal(row, "数据待同步", 0));
      const losses = active
        .filter((row) => row.result?.completed && gross(row) < 0)
        .sort((left, right) => gross(left) - gross(right))
        .map((row) => withSignal(row, "商品毛利亏损", 1));
      const zeroSales = active
        .filter((row) => row.result?.completed && units(row) === 0)
        .map((row) => withSignal(row, "零销量", 2));
      const positive = active.filter((row) => row.result?.completed && units(row) > 0 && gross(row) >= 0);
      const lowest = [...positive]
        .sort((left, right) => gross(left) - gross(right))
        .slice(0, 1)
        .map((row) => withSignal(row, "低商品毛利", 3));
      const leaders = [...positive]
        .sort((left, right) => gross(right) - gross(left))
        .map((row) => withSignal(row, "主要贡献", 4));
      const output = [];
      const seen = new Set();
      [...pending, ...losses, ...zeroSales, ...lowest, ...leaders].forEach((row) => {
        if (output.length >= limit || seen.has(row.listingSku.id)) return;
        seen.add(row.listingSku.id);
        output.push(row);
      });
      return output;
    }

    function buildProfitLedgerRows(result = {}) {
      const rows = [{
        key: "gmv",
        label: "经营 GMV",
        detail: "Product Analytics",
        value: profitNumber(result.gmv),
        kind: "income"
      }];
      if (Math.abs(profitNumber(result.financialReconciliationDifference)) >= 0.01) {
        rows.push(
          {
            key: "net_product_sales",
            label: "平台确认销售额",
            detail: "Earnings Analytics",
            value: profitNumber(result.netProductSales),
            kind: "subtotal"
          },
          {
            key: "financial_difference",
            label: "经营与财务口径差异",
            detail: "口径说明",
            value: profitNumber(result.financialReconciliationDifference),
            kind: "information"
          }
        );
      }
      rows.push(
        {
          key: "platform_cost",
          label: "平台订单成本",
          detail: "运费及平台各项费用",
          value: -profitNumber(result.platformFees) - profitNumber(result.shippingFee),
          kind: "deduction"
        },
        {
          key: "received",
          label: result.profitStatus === "settled" ? "实际到手" : "预估到手",
          detail: "",
          value: profitNumber(result.receivedAmount),
          kind: "subtotal"
        },
        {
          key: "product_cost",
          label: "产品成本",
          detail: "",
          value: -profitNumber(result.productCostTotal),
          kind: "deduction"
        },
        {
          key: "internal_expenses",
          label: "广告、样品及调整",
          detail: "",
          value: result.profitCompleteness === "provisional" ? null : -profitNumber(result.knownInternalExpenses),
          kind: result.profitCompleteness === "provisional" ? "pending" : "deduction"
        },
        {
          key: "profit",
          label: result.profitCompleteness === "provisional" ? "暂算利润" : "最终利润",
          detail: "",
          value: profitNumber(result.finalProfit),
          kind: profitNumber(result.finalProfit) < 0 ? "loss" : "result"
        }
      );
      return rows;
    }
