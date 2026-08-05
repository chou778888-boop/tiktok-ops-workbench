    function createProfitRepository(anchorDate = "2026-08-05") {
      const stores = [
        { id: "store-dreamweave", name: "DreamWeave" },
        { id: "store-dreamdaily", name: "Dreamdaily" },
        { id: "store-dreamland", name: "Dreamland" },
        { id: "store-moondream", name: "MoonDream" },
        { id: "store-sweet-dream", name: "sweet dream" },
        { id: "store-himood", name: "Himood Smile" }
      ];
      const definitions = [
        {
          code: "JZZ", name: "针织毯", category: "家居纺织",
          skus: [["white", "白色", 12, 16.99, 72], ["grey", "灰色", 12, 17.49, 164], ["sage", "灰绿色", 12, 21.49, 18], ["purple", "紫色", 12, 18.99, 36], ["grey-4", "灰色 4PCS", 20, 39.99, 6]],
          listings: [
            ["jzz-main", "store-dreamweave", "JZZ 主链接", 1, 238, 0, "active"],
            ["jzz-alt", "store-dreamdaily", "JZZ 动销链接", 0.92, 86, 0.7, "active"]
          ]
        },
        {
          code: "JDZ", name: "酒店枕套", category: "家居纺织",
          skus: [["standard", "标准款", 12, 9.95, 286], ["bk-q", "BK-Q", 15, 11.99, 32], ["bk-k", "BK-K", 15, 18.62, 24], ["four-pack", "4PCS", 20, 23.85, 8]],
          listings: [["jdz-main", "store-dreamdaily", "JDZ 核心链接", 1, 112, 0, "active"]]
        },
        {
          code: "NHZ", name: "绒面毯", category: "家居纺织",
          skus: [["grey", "Grey", 12, 19.99, 26], ["white", "White", 12, 17.99, 23], ["grey-4", "Grey 4PCS", 22, 35.99, 4]],
          listings: [["nhz-main", "store-dreamland", "NHZ 常规链接", 1, 46, 0, "active"]]
        },
        {
          code: "YG", name: "银管套装", category: "个护",
          skus: [["one", "银管-1", 5.6, 8.49, 8], ["two", "银管-2", 6.5, 13.99, 4], ["set", "银管套装", 7.4, 15.11, 9]],
          listings: [["yg-main", "store-moondream", "YG 主链接", 1, 34, 0, "active"]]
        },
        {
          code: "ZG", name: "紫管套装", category: "个护",
          skus: [["one", "紫管-1", 5.5, 6.89, 4], ["two", "紫管-2", 6.2, 11.99, 2], ["set", "紫管套装", 7.1, 14.77, 3]],
          listings: [["zg-main", "store-sweet-dream", "ZG 主链接", 1, 29, 0, "paused"]]
        },
        {
          code: "YT", name: "牙贴", category: "个护",
          skus: [["one", "牙贴-1", 6.3, 7.22, 9], ["two", "牙贴-2", 7.6, 11.99, 3], ["three", "牙贴-3", 8.9, 14.99, 2]],
          listings: [["yt-main", "store-himood", "YT 测款链接", 1, 38, 0, "active"]]
        }
      ];

      const state = {
        anchorDate,
        stores,
        products: [],
        skuMasters: [],
        listings: [],
        listingSkus: [],
        dailyFacts: [],
        dailyExpenses: [],
        priceObservations: []
      };
      const dates = profitDateWindow(anchorDate, 30);

      definitions.forEach((definition, productIndex) => {
        const productId = `product-${definition.code.toLowerCase()}`;
        state.products.push({ id: productId, code: definition.code, name: definition.name, category: definition.category, status: "active" });
        const masters = definition.skus.map(([code, name, standardCost]) => {
          const master = { id: `${productId}-sku-${code}`, productId, code: `${definition.code}-${code}`.toUpperCase(), name, specification: name, standardCost, currency: "USD", status: "active" };
          state.skuMasters.push(master);
          return master;
        });

        definition.listings.forEach(([slug, storeId, displayName, priceFactor, marketingBase, unitFactorOffset, lifecycleStatus], listingIndex) => {
          const listingId = `listing-${slug}`;
          const sampleTypes = [{ id: `${listingId}-sample`, name: "标准寄样", unitCost: definition.skus[0][2] }];
          state.listings.push({
            id: listingId,
            productId,
            storeId,
            platformListingId: `TT-${definition.code}-${listingIndex + 1}`,
            url: `https://www.tiktok.com/shop/pdp/${slug}`,
            displayName,
            ownerId: `operator-${(productIndex % 3) + 1}`,
            ownerName: ["小林", "Annie", "Mia"][productIndex % 3],
            currency: "USD",
            timezone: "America/Los_Angeles",
            predecessorListingId: null,
            lifecycleStatus,
            launchedAt: profitShiftDate(anchorDate, -(46 + productIndex * 8 + listingIndex * 12)),
            delistedAt: null,
            sampleTypes
          });

          masters.forEach((master, skuIndex) => {
            const definitionSku = definition.skus[skuIndex];
            const listingSkuId = `${listingId}-sku-${definitionSku[0]}`;
            state.listingSkus.push({
              id: listingSkuId,
              listingId,
              skuId: master.id,
              active: true,
              storeCostOverride: definitionSku[2],
              commissionRateOverride: productIndex < 3 ? 20.5 : 25,
              activatedAt: profitShiftDate(anchorDate, -45),
              deactivatedAt: null
            });
            dates.forEach((dateKey, dayIndex) => {
              const weekdayFactor = [0.82, 0.91, 0.97, 1.02, 1.08, 1.16, 1.1][dayIndex % 7];
              const variation = ((dayIndex + skuIndex * 2 + listingIndex) % 5 - 2) * 0.035;
              const basePrice = definitionSku[3] * priceFactor + (listingIndex ? skuIndex * 0.12 : 0);
              const units = Math.max(0, Math.round(definitionSku[4] * (weekdayFactor + variation + unitFactorOffset * 0.08)));
              const isPendingToday = definition.code === "YT" && dateKey === anchorDate;
              state.dailyFacts.push({
                id: `${listingSkuId}-${dateKey}`,
                listingId,
                listingSkuId,
                dateKey,
                price: Number(Math.max(definitionSku[2], basePrice + ((dayIndex + skuIndex) % 5 - 2) * 0.14).toFixed(2)),
                units: isPendingToday ? null : units,
                costSnapshot: definitionSku[2],
                commissionSnapshot: productIndex < 3 ? 20.5 : 25,
                entryStatus: isPendingToday ? "pending" : "completed"
              });
            });
          });

          dates.forEach((dateKey, dayIndex) => {
            const sampleQuantities = {};
            sampleQuantities[sampleTypes[0].id] = (dayIndex + productIndex + listingIndex) % 7 === 0 ? 2 : 0;
            state.dailyExpenses.push({
              id: `${listingId}-expense-${dateKey}`,
              listingId,
              dateKey,
              sampleQuantities,
              marketingSpend: Number((marketingBase * (0.82 + (dayIndex % 5) * 0.08)).toFixed(2)),
              adjustments: dayIndex % 13 === 0 ? 8 : 0,
              entryStatus: "completed"
            });
          });
        });
      });

      const jzzAltGrey = state.listingSkus.find((item) => item.id === "listing-jzz-alt-sku-grey");
      if (jzzAltGrey) {
        state.priceObservations.push(createPriceObservation({
          id: "observation-jzz-grey",
          productId: "product-jzz",
          listingId: "listing-jzz-alt",
          listingSkuId: jzzAltGrey.id,
          oldPrice: 16.39,
          newPrice: 15.89,
          startedAt: profitShiftDate(anchorDate, -3),
          changeKind: "planned"
        }));
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
        const sampleCost = (listing?.sampleTypes || []).reduce((sum, sample) => (
          sum + profitNumber(expense.sampleQuantities?.[sample.id]) * profitNumber(sample.unitCost)
        ), 0);
        return { ...expense, sampleCost };
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
            costSnapshot: listingSku.storeCostOverride,
            commissionSnapshot: listingSku.commissionRateOverride,
            entryStatus: "pending"
          };
          state.dailyFacts.push(fact);
        }
        if (Object.hasOwn(changes, "price")) fact.price = Math.max(0, profitNumber(changes.price));
        if (Object.hasOwn(changes, "units")) fact.units = changes.units === null || changes.units === "" ? null : Math.max(0, Math.round(profitNumber(changes.units)));
        fact.entryStatus = fact.price !== null && fact.units !== null ? "completed" : "in_progress";
        return fact;
      }

      function updateDailyExpense(listingId, dateKey, changes = {}) {
        let expense = state.dailyExpenses.find((item) => item.listingId === listingId && item.dateKey === dateKey);
        if (!expense) {
          expense = { id: globalThis.crypto?.randomUUID?.(), listingId, dateKey, sampleQuantities: {}, marketingSpend: 0, adjustments: 0, entryStatus: "pending" };
          state.dailyExpenses.push(expense);
        }
        if (changes.sampleQuantities) expense.sampleQuantities = { ...expense.sampleQuantities, ...changes.sampleQuantities };
        if (Object.hasOwn(changes, "marketingSpend")) expense.marketingSpend = Math.max(0, profitNumber(changes.marketingSpend));
        if (Object.hasOwn(changes, "adjustments")) expense.adjustments = Math.max(0, profitNumber(changes.adjustments));
        expense.entryStatus = "completed";
        return getDailyExpense(listingId, dateKey);
      }

      function setListingLifecycle(listingId, lifecycleStatus, dateKey = null) {
        if (!PROFIT_LISTING_LIFECYCLES.includes(lifecycleStatus)) return null;
        const listing = getListing(listingId);
        if (!listing) return null;
        listing.lifecycleStatus = lifecycleStatus;
        listing.delistedAt = lifecycleStatus === "delisted" ? (dateKey || anchorDate) : null;
        return listing;
      }

      function toggleListingSku(listingSkuId) {
        const listingSku = state.listingSkus.find((item) => item.id === listingSkuId);
        if (!listingSku) return null;
        listingSku.active = !listingSku.active;
        listingSku.deactivatedAt = listingSku.active ? null : anchorDate;
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
        return listing;
      }

      function addListingSku(values) {
        const listingSku = {
          id: globalThis.crypto?.randomUUID?.() ?? `listing-sku-${state.listingSkus.length + 1}`,
          listingId: values.listingId,
          skuId: values.skuId,
          active: true,
          storeCostOverride: Math.max(0, profitNumber(values.cost)),
          commissionRateOverride: Math.min(100, Math.max(0, profitNumber(values.commissionRate))),
          activatedAt: anchorDate,
          deactivatedAt: null
        };
        state.listingSkus.push(listingSku);
        if (values.price !== undefined) updateDailyFact(listingSku.id, anchorDate, { price: values.price, units: null });
        return listingSku;
      }

      function addPriceObservation(values) {
        const observation = createPriceObservation(values);
        if (observation) state.priceObservations.push(observation);
        return observation;
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
        updateDailyFact,
        updateDailyExpense,
        setListingLifecycle,
        toggleListingSku,
        addListing,
        addListingSku,
        addPriceObservation
      };
    }
