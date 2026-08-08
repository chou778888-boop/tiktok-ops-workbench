    const PROFIT_WORKSPACE_COLLECTIONS = {
      stores: "profitStores",
      products: "profitProducts",
      skuMasters: "profitSkuMasters",
      listings: "profitListings",
      listingSkus: "profitListingSkus",
      dailyFacts: "profitDailyFacts",
      dailyExpenses: "profitDailyExpenses",
      dailySettlements: "profitDailySettlements",
      productCostHistory: "profitProductCostHistory",
      priceObservations: "profitPriceObservations"
    };

    function profitRepositoryClone(value) {
      return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function defaultProfitSyncStatus() {
      return {
        id: "main",
        state: "synced",
        lastSyncedAt: "2026-08-04T08:00:00+08:00",
        nextScheduledAt: "2026-08-04T17:00:00+08:00",
        scheduleTimezone: "Asia/Shanghai",
        storeTimezone: "America/Los_Angeles",
        source: "站斧 · TikTok Shop",
        message: "8 月 3 日经营与结算数据已核对"
      };
    }

    function serializeProfitRepositoryState(repositoryState = {}) {
      const serialized = {};
      Object.entries(PROFIT_WORKSPACE_COLLECTIONS).forEach(([internalKey, workspaceKey]) => {
        serialized[workspaceKey] = profitRepositoryClone(Array.isArray(repositoryState[internalKey]) ? repositoryState[internalKey] : []);
      });
      serialized.profitSyncRecords = [profitRepositoryClone({ ...defaultProfitSyncStatus(), ...(repositoryState.syncStatus || {}), id: "main" })];
      return serialized;
    }

    function normalizeProfitRepositoryState(initialState, anchorDate) {
      const source = initialState && typeof initialState === "object" ? initialState : {};
      const normalized = { anchorDate };
      Object.entries(PROFIT_WORKSPACE_COLLECTIONS).forEach(([internalKey, workspaceKey]) => {
        const records = Array.isArray(source[workspaceKey]) ? source[workspaceKey] : source[internalKey];
        normalized[internalKey] = profitRepositoryClone(Array.isArray(records) ? records : []);
      });
      const syncRecord = Array.isArray(source.profitSyncRecords)
        ? source.profitSyncRecords.find((item) => item?.id === "main") || source.profitSyncRecords[0]
        : source.syncStatus;
      normalized.syncStatus = { ...defaultProfitSyncStatus(), ...(profitRepositoryClone(syncRecord) || {}), id: "main" };
      return normalized;
    }

    function createProfitRepository(anchorDate = "2026-08-03", options = {}) {
      const state = normalizeProfitRepositoryState(options.initialState, anchorDate);
      const commit = () => {
        options.onChange?.(serializeProfitRepositoryState(state));
        return state;
      };

      if (!state.products.length && options.seedDemo !== false) {
      state.stores.push({ id: "store-dreamweave", name: "Ufist-DreamWeave", accountName: "宝立星（杭州）" });
      const productId = "product-jzz";
      const listingId = "listing-jzz-main";
      const sampleTypeId = `${listingId}-sample`;
      const actualSkuRows = [
        ["grey", "灰色 2 件套", "1731777760711315985", 356.79, 21, 21],
        ["white", "白色 2 件套", "1731777428039635473", 181.80, 11, 9],
        ["purple", "紫色 2 件套", "1731777662919676433", 56.97, 3, 3],
        ["dark-green", "深绿色 2 件套", "1732265156925624849", 41.98, 2, 2],
        ["blue", "蓝色 2 件套", "1731777662919545361", 37.98, 2, 2],
        ["pink", "粉色 2 件套", "1732265157400367633", 0, 0, 0]
      ];
      state.products.push({
        id: productId,
        code: "JZZ",
        name: "UFIST 颈椎按摩枕 2 件套",
        category: "寝具",
        standardUnitCost: 12,
        costEffectiveAt: "2026-08-03",
        status: "active"
      });
      state.productCostHistory.push({ id: `${productId}-cost-2026-08-03`, productId, standardUnitCost: 12, effectiveAt: "2026-08-03" });
      state.listings.push({
        id: listingId,
        productId,
        storeId: "store-dreamweave",
        platformListingId: "1731776510060368401",
        url: "https://seller-us.tiktok.com/compass/product-analysis/detail?id=1731776510060368401&from=product-analysis",
        displayName: "UFIST 2-Piece Cervical Massage Pillow Set",
        ownerId: "operator-1",
        ownerName: "小林",
        currency: "USD",
        timezone: "America/Los_Angeles",
        predecessorListingId: null,
        lifecycleStatus: "active",
        launchedAt: "2026-08-03",
        delistedAt: null,
        sampleTypes: [{ id: sampleTypeId, name: "标准寄样", unitCost: 12 }]
      });
      actualSkuRows.forEach(([code, name, platformSkuId, gmv, itemsSold, orderCount]) => {
        const skuId = `${productId}-sku-${code}`;
        const listingSkuId = `${listingId}-sku-${code}`;
        state.skuMasters.push({ id: skuId, productId, code: `JZZ-${code}`.toUpperCase(), name, specification: name, platformSkuId, standardCost: 12, currency: "USD", status: "active" });
        state.listingSkus.push({ id: listingSkuId, listingId, skuId, platformSkuId, active: true, storeCostOverride: 12, commissionRateOverride: null, activatedAt: "2026-08-03", deactivatedAt: null });
        state.dailyFacts.push({
          id: `${listingSkuId}-2026-08-03`,
          listingId,
          listingSkuId,
          dateKey: "2026-08-03",
          price: itemsSold ? profitMoney(gmv / itemsSold) : null,
          units: itemsSold,
          gmv,
          itemsSold,
          orderCount,
          grossSales: null,
          estimatedShippingFee: 0,
          estimatedPlatformFees: 0,
          estimatedReceived: gmv,
          productCostSnapshot: 12,
          costSnapshot: 12,
          commissionSnapshot: null,
          entryStatus: "completed",
          source: "TikTok Shop Product Analytics"
        });
      });
      state.dailyExpenses.push({ id: `${listingId}-expense-2026-08-03`, listingId, dateKey: "2026-08-03", sampleQuantities: { [sampleTypeId]: null }, advertisingSpend: null, marketingSpend: null, adjustments: null, entryStatus: "pending" });
      state.dailySettlements.push({
        id: `${listingId}-settlement-2026-08-03`,
        listingId,
        dateKey: "2026-08-03",
        listingGmv: 675.52,
        sumSkuGmv: 675.52,
        orderCount: 37,
        itemsSold: 39,
        netProductSales: 697.60,
        platformDiscounts: 5.09,
        shippingFee: 0,
        platformFees: 66.13,
        totalOrderCost: 66.13,
        estimatedReceived: 631.47,
        settlementAmount: 631.47,
        settlementStatus: "settled",
        statementDate: "2026-08-03",
        source: "TikTok Shop Earnings Analytics",
        sourceUpdatedAt: "2026-08-03T17:00:00-07:00"
      });
      }

      function getStore(storeId) {
        return state.stores.find((store) => store.id === storeId) || null;
      }

      function getProduct(productId) {
        return state.products.find((product) => product.id === productId) || null;
      }

      function getListing(listingId) {
        return state.listings.find((listing) => listing.id === listingId) || null;
      }

      function getProductListings(productId, { includeArchived = true } = {}) {
        return state.listings.filter((listing) => listing.productId === productId && (includeArchived || listing.lifecycleStatus !== "archived"));
      }

      function getListingSkus(listingId, { includeInactive = true } = {}) {
        return state.listingSkus.filter((item) => item.listingId === listingId && (includeInactive || item.active));
      }

      function getSkuMaster(skuId) {
        return state.skuMasters.find((sku) => sku.id === skuId) || null;
      }

      function getDailyFact(listingSkuId, dateKey) {
        return state.dailyFacts.find((fact) => fact.listingSkuId === listingSkuId && fact.dateKey === dateKey) || null;
      }

      function getDailyFacts(listingSkuId) {
        return state.dailyFacts.filter((fact) => fact.listingSkuId === listingSkuId);
      }

      function getDailyExpense(listingId, dateKey) {
        const expense = state.dailyExpenses.find((item) => item.listingId === listingId && item.dateKey === dateKey);
        if (!expense) return null;
        const listing = getListing(listingId);
        const sampleTypes = listing?.sampleTypes || [];
        const sampleValues = sampleTypes.map((sample) => expense.sampleQuantities?.[sample.id]);
        const samplesComplete = sampleValues.every((value) => value !== null && value !== undefined && value !== "");
        const sampleCost = samplesComplete
          ? profitMoney(sampleTypes.reduce((sum, sample) => sum + profitNumber(expense.sampleQuantities?.[sample.id]) * profitNumber(sample.unitCost), 0))
          : null;
        return { ...expense, sampleCost };
      }

      function getDailySettlement(listingId, dateKey) {
        return state.dailySettlements.find((item) => item.listingId === listingId && item.dateKey === dateKey) || null;
      }

      function updateProductCost(productId, standardUnitCost, effectiveAt = anchorDate) {
        const product = getProduct(productId);
        if (!product) return null;
        product.standardUnitCost = Math.max(0, profitNumber(standardUnitCost));
        product.costEffectiveAt = effectiveAt;
        state.skuMasters.filter((sku) => sku.productId === productId).forEach((sku) => {
          sku.standardCost = product.standardUnitCost;
        });
        const listingIds = new Set(getProductListings(productId).map((listing) => listing.id));
        state.dailyFacts.forEach((fact) => {
          if (!listingIds.has(fact.listingId) || fact.dateKey < effectiveAt) return;
          fact.productCostSnapshot = product.standardUnitCost;
          fact.costSnapshot = product.standardUnitCost;
        });
        const historyId = `${productId}-cost-${effectiveAt}`;
        const historyIndex = state.productCostHistory.findIndex((item) => item.id === historyId);
        const historyRecord = { id: historyId, productId, standardUnitCost: product.standardUnitCost, effectiveAt };
        if (historyIndex >= 0) state.productCostHistory[historyIndex] = historyRecord;
        else state.productCostHistory.push(historyRecord);
        commit();
        return product;
      }

      function updateDailyFact(listingSkuId, dateKey, changes = {}) {
        const listingSku = state.listingSkus.find((item) => item.id === listingSkuId);
        if (!listingSku) return null;
        let fact = getDailyFact(listingSkuId, dateKey);
        if (!fact) {
          const prepared = prepareProfitDailyEntry(getDailyFacts(listingSkuId), dateKey);
          fact = {
            id: globalThis.crypto?.randomUUID?.() ?? `${listingSkuId}-${dateKey}`,
            listingId: listingSku.listingId,
            listingSkuId,
            dateKey,
            price: prepared.price,
            units: prepared.units,
            productCostSnapshot: getProduct(getListing(listingSku.listingId)?.productId)?.standardUnitCost,
            costSnapshot: getProduct(getListing(listingSku.listingId)?.productId)?.standardUnitCost,
            commissionSnapshot: listingSku.commissionRateOverride,
            entryStatus: "pending"
          };
          state.dailyFacts.push(fact);
        }
        if (Object.hasOwn(changes, "price")) fact.price = Math.max(0, profitNumber(changes.price));
        if (Object.hasOwn(changes, "units")) fact.units = changes.units === null || changes.units === "" ? null : Math.max(0, Math.round(profitNumber(changes.units)));
        if (Object.hasOwn(changes, "gmv")) fact.gmv = changes.gmv === null || changes.gmv === "" ? null : Math.max(0, profitMoney(changes.gmv));
        if (Object.hasOwn(changes, "itemsSold")) fact.itemsSold = changes.itemsSold === null || changes.itemsSold === "" ? null : Math.max(0, Math.round(profitNumber(changes.itemsSold)));
        if (Object.hasOwn(changes, "units") && !Object.hasOwn(changes, "itemsSold")) fact.itemsSold = fact.units;
        if ((Object.hasOwn(changes, "price") || Object.hasOwn(changes, "units")) && !Object.hasOwn(changes, "gmv")) {
          fact.gmv = fact.price !== null && fact.units !== null ? profitMoney(fact.price * fact.units) : null;
        }
        fact.entryStatus = fact.gmv !== null && fact.itemsSold !== null ? "completed" : "in_progress";
        commit();
        return fact;
      }

      function updateDailyExpense(listingId, dateKey, changes = {}) {
        let expense = state.dailyExpenses.find((item) => item.listingId === listingId && item.dateKey === dateKey);
        if (!expense) {
          expense = { id: globalThis.crypto?.randomUUID?.(), listingId, dateKey, sampleQuantities: {}, advertisingSpend: null, marketingSpend: null, adjustments: null, entryStatus: "pending" };
          state.dailyExpenses.push(expense);
        }
        if (changes.sampleQuantities) {
          expense.sampleQuantities = { ...expense.sampleQuantities };
          Object.entries(changes.sampleQuantities).forEach(([sampleId, value]) => {
            expense.sampleQuantities[sampleId] = value === null || value === "" ? null : Math.max(0, Math.round(profitNumber(value)));
          });
        }
        if (Object.hasOwn(changes, "advertisingSpend")) {
          expense.advertisingSpend = changes.advertisingSpend === null || changes.advertisingSpend === "" ? null : Math.max(0, profitMoney(changes.advertisingSpend));
          expense.marketingSpend = expense.advertisingSpend;
        }
        if (Object.hasOwn(changes, "marketingSpend")) {
          expense.marketingSpend = changes.marketingSpend === null || changes.marketingSpend === "" ? null : Math.max(0, profitMoney(changes.marketingSpend));
          expense.advertisingSpend = expense.marketingSpend;
        }
        if (Object.hasOwn(changes, "adjustments")) expense.adjustments = changes.adjustments === null || changes.adjustments === "" ? null : Math.max(0, profitMoney(changes.adjustments));
        const sampleTypes = getListing(listingId)?.sampleTypes || [];
        const samplesComplete = sampleTypes.every((sample) => {
          const value = expense.sampleQuantities?.[sample.id];
          return value !== null && value !== undefined && value !== "";
        });
        expense.entryStatus = samplesComplete && expense.advertisingSpend !== null && expense.adjustments !== null ? "completed" : "in_progress";
        commit();
        return getDailyExpense(listingId, dateKey);
      }

      function setListingLifecycle(listingId, lifecycleStatus, dateKey = null) {
        if (!PROFIT_LISTING_LIFECYCLES.includes(lifecycleStatus)) return null;
        const listing = getListing(listingId);
        if (!listing) return null;
        listing.lifecycleStatus = lifecycleStatus;
        listing.delistedAt = lifecycleStatus === "delisted" ? (dateKey || anchorDate) : null;
        commit();
        return listing;
      }

      function toggleListingSku(listingSkuId) {
        const listingSku = state.listingSkus.find((item) => item.id === listingSkuId);
        if (!listingSku) return null;
        listingSku.active = !listingSku.active;
        listingSku.deactivatedAt = listingSku.active ? null : anchorDate;
        commit();
        return listingSku;
      }

      function addListing(values) {
        const listing = {
          id: globalThis.crypto?.randomUUID?.() ?? `listing-${state.listings.length + 1}`,
          productId: values.productId,
          storeId: values.storeId,
          platformListingId: values.platformListingId || "",
          url: values.url,
          displayName: values.displayName,
          ownerId: values.ownerId || "",
          ownerName: values.ownerName || "待分配",
          currency: "USD",
          timezone: "America/Los_Angeles",
          predecessorListingId: values.predecessorListingId || null,
          lifecycleStatus: values.lifecycleStatus || "draft",
          launchedAt: values.launchedAt || anchorDate,
          delistedAt: null,
          sampleTypes: []
        };
        state.listings.push(listing);
        commit();
        return listing;
      }

      function addListingSku(values) {
        const listingSku = {
          id: globalThis.crypto?.randomUUID?.() ?? `listing-sku-${state.listingSkus.length + 1}`,
          listingId: values.listingId,
          skuId: values.skuId,
          active: true,
          storeCostOverride: getProduct(getListing(values.listingId)?.productId)?.standardUnitCost ?? Math.max(0, profitNumber(values.cost)),
          commissionRateOverride: Math.min(100, Math.max(0, profitNumber(values.commissionRate))),
          activatedAt: anchorDate,
          deactivatedAt: null
        };
        state.listingSkus.push(listingSku);
        if (values.price !== undefined) updateDailyFact(listingSku.id, anchorDate, { price: values.price, units: null });
        else commit();
        return listingSku;
      }

      function addPriceObservation(values) {
        const observation = createPriceObservation(values);
        if (observation) {
          state.priceObservations.push(observation);
          commit();
        }
        return observation;
      }

      function updateSyncStatus(changes = {}) {
        state.syncStatus = { ...state.syncStatus, ...changes, id: "main" };
        commit();
        return state.syncStatus;
      }

      function hydrate(initialState) {
        const profitInitialized = Array.isArray(initialState?.profitSyncRecords) && initialState.profitSyncRecords.length > 0;
        if (!profitInitialized && state.products.length && options.seedDemo !== false) {
          commit();
          return state;
        }
        const hydrated = normalizeProfitRepositoryState(initialState, anchorDate);
        Object.keys(PROFIT_WORKSPACE_COLLECTIONS).forEach((key) => {
          state[key] = hydrated[key];
        });
        state.syncStatus = hydrated.syncStatus;
        return state;
      }

      return {
        getState: () => state,
        getStore,
        getProduct,
        getListing,
        getProductListings,
        getListingSkus,
        getSkuMaster,
        getDailyFact,
        getDailyFacts,
        getDailyExpense,
        getDailySettlement,
        updateProductCost,
        updateDailyFact,
        updateDailyExpense,
        setListingLifecycle,
        toggleListingSku,
        addListing,
        addListingSku,
        addPriceObservation,
        updateSyncStatus,
        hydrate
      };
    }
