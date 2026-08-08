    let costingState = (() => {
      try {
        const parsed = JSON.parse(localStorage.getItem(costingStoreKey));
        return {
          history: Array.isArray(parsed?.history) ? parsed.history : [],
          profiles: Array.isArray(parsed?.profiles)
            ? parsed.profiles
              .filter((item) => !legacyCostProfileIds.has(String(item?.id || "")))
              .map((item) => ({ ...item, id: item.id || crypto.randomUUID(), product: item.product || "" }))
            : []
        };
      } catch { return { history: [], profiles: [] }; }
    })();

    function costNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }

    function costNonNegative(value) {
      return Math.max(0, costNumber(value));
    }

    function costRate(value) {
      return Math.min(100, costNonNegative(value));
    }

    function costFormValues() {
      const form = document.getElementById("costCalculatorForm");
      return Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, ["store", "sku", "channel"].includes(key) ? value : costNumber(value)]));
    }

    function calculateCost(values) {
      const sellerDiscount = costNonNegative(values.discount);
      const grossUnitRevenue = Math.max(0, costNonNegative(values.price) - sellerDiscount);
      const refundRate = costRate(values.refundRate) / 100;
      const netUnitRevenue = grossUnitRevenue * (1 - refundRate);
      const productCost = costNonNegative(values.purchase) + costNonNegative(values.packaging) + costNonNegative(values.firstMile);
      const fulfillment = costNonNegative(values.warehouse) + costNonNegative(values.lastMile) + costNonNegative(values.fulfillmentOther) + refundRate * costNonNegative(values.returnLoss);
      const referralRate = costRate(values.platformRate) / 100;
      const referralFeeBeforeRefund = grossUnitRevenue * referralRate;
      const refundAdministrationFee = refundRate * Math.min(referralFeeBeforeRefund * .2, 5);
      const platform = referralFeeBeforeRefund * (1 - refundRate) + refundAdministrationFee;
      const smartPromotionRate = Math.min(100, costNonNegative(values.smartPromotionRate) + costNonNegative(values.campaignPeriodRate)) / 100;
      const smartPromotionFee = netUnitRevenue * smartPromotionRate;
      const appliedCommissionRate = values.channel === "affiliate"
        ? costRate(values.creatorRate)
        : values.channel === "ads" ? costRate(values.adCommissionRate) : 0;
      const channelCommission = netUnitRevenue * appliedCommissionRate / 100;
      const ads = values.channel === "ads" ? costNonNegative(values.adCost) : 0;
      const totalCost = productCost + fulfillment + platform + smartPromotionFee + channelCommission + ads;
      const unitProfit = netUnitRevenue - totalCost;
      const margin = netUnitRevenue ? unitProfit / netUnitRevenue : 0;
      const priceForMargin = (targetMargin) => {
        const evaluatePrice = (price) => {
          const base = Math.max(0, price - sellerDiscount);
          const net = base * (1 - refundRate);
          const referral = base * referralRate;
          const refundAdmin = refundRate * Math.min(referral * .2, 5);
          const platformAtPrice = referral * (1 - refundRate) + refundAdmin;
          const smartPromotionAtPrice = net * smartPromotionRate;
          const commissionAtPrice = net * appliedCommissionRate / 100;
          const profitAtPrice = net - productCost - fulfillment - platformAtPrice - smartPromotionAtPrice - commissionAtPrice - ads;
          return profitAtPrice - net * targetMargin;
        };
        let low = sellerDiscount;
        let high = Math.max(100, values.price * 2, low + 1);
        while (evaluatePrice(high) < 0 && high < 100000) high *= 2;
        if (evaluatePrice(high) < 0) return 0;
        for (let index = 0; index < 72; index += 1) {
          const middle = (low + high) / 2;
          if (evaluatePrice(middle) >= 0) high = middle;
          else low = middle;
        }
        return high;
      };
      const breakEvenPrice = priceForMargin(0);
      const targetRate = Math.min(.95, Math.max(0, values.targetMargin / 100));
      const targetPrice = priceForMargin(targetRate);
      const preAdProfit = unitProfit + ads;
      const breakEvenRoas = values.channel === "ads" && preAdProfit > 0 && grossUnitRevenue > 0 ? grossUnitRevenue / preAdProfit : 0;
      const nonCreatorCost = productCost + fulfillment + platform + smartPromotionFee + ads;
      const creatorCeiling = netUnitRevenue > 0 ? Math.max(0, (netUnitRevenue * (1 - targetRate) - nonCreatorCost) / netUnitRevenue * 100) : 0;
      return { grossUnitRevenue, netUnitRevenue, productCost, fulfillment, platform, refundAdministrationFee, smartPromotionFee, channelCommission, appliedCommissionRate, ads, totalCost, unitProfit, margin, breakEvenPrice, targetPrice, breakEvenRoas, creatorCeiling };
    }

    function money(value) {
      return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function renderCostCalculator() {
      const values = costFormValues();
      const result = calculateCost(values);
      const profitEl = document.getElementById("costTotalProfit");
      profitEl.textContent = money(result.unitProfit);
      profitEl.className = `cost-profit ${result.unitProfit >= 0 ? "positive" : "negative"}`;
      document.getElementById("costProfitSummary").textContent = `${values.store} · ${values.sku}`;
      document.getElementById("costUnitProfit").textContent = money(result.netUnitRevenue);
      document.getElementById("costMargin").textContent = `${(result.margin * 100).toFixed(1)}%`;
      document.getElementById("costBreakEvenPrice").textContent = money(result.breakEvenPrice);
      document.getElementById("costTargetPrice").textContent = money(result.targetPrice);
      document.getElementById("costBreakEvenRoas").textContent = values.channel === "ads" ? (result.breakEvenRoas ? `${result.breakEvenRoas.toFixed(2)}x` : "无法保本") : "仅投流场景";
      document.getElementById("costCreatorCeiling").textContent = `${result.creatorCeiling.toFixed(1)}%`;
      document.getElementById("costCommissionCeilingLabel").textContent = values.channel === "ads" ? "广告佣金上限" : values.channel === "affiliate" ? "达人佣金上限" : "可用渠道费率";
      document.getElementById("costNetRevenueLabel").textContent = `净收入 ${money(result.netUnitRevenue)}`;
      const expenseRatio = result.netUnitRevenue > 0 ? result.totalCost / result.netUnitRevenue * 100 : 0;
      document.getElementById("costExpenseRatio").textContent = `${expenseRatio.toFixed(1)}%`;
      const risk = document.getElementById("costRiskBadge");
      const target = values.targetMargin / 100;
      risk.textContent = result.margin < 0 ? "当前亏损" : result.margin < target ? "低于目标" : "利润健康";
      risk.className = `badge ${result.margin < 0 ? "red" : result.margin < target ? "amber" : "green"}`;
      const bars = [
        ["商品成本", result.productCost, "cost-product"],
        ["履约成本", result.fulfillment, "cost-fulfillment"],
        ["Referral Fee", result.platform, "cost-platform"],
        ["Smart Promotion", result.smartPromotionFee, "cost-promotion"],
        [values.channel === "ads" ? "广告佣金" : values.channel === "affiliate" ? "达人佣金" : "渠道佣金", result.channelCommission, "cost-commission"],
        ["投流费用", result.ads, "cost-ads"]
      ];
      document.getElementById("costWaterfall").innerHTML = bars.map(([label, value, type]) => {
        const ratio = result.netUnitRevenue > 0 ? value / result.netUnitRevenue * 100 : 0;
        return `<div class="cost-bar-row"><span>${label}</span><div class="cost-bar-track"><div class="cost-bar ${type}" style="width:${Math.min(100, Math.max(value > 0 ? 2 : 0, ratio))}%"></div></div><strong>${money(value)} <small>${ratio.toFixed(1)}%</small></strong></div>`;
      }).join("");
      document.getElementById("costWaterfallProfit").textContent = `${money(result.unitProfit)} · ${(result.margin * 100).toFixed(1)}%`;
      document.getElementById("costWaterfallProfit").style.color = result.unitProfit >= 0 ? "#86ffc8" : "#ff8f8f";
      const advice = result.margin < 0
        ? `当前单件亏损 ${money(Math.abs(result.unitProfit))}。售价至少需达到 ${money(result.breakEvenPrice)}，或优先降低广告、佣金及尾程成本。`
        : result.margin < target
          ? `当前已盈利但低于 ${(target * 100).toFixed(0)}% 目标。建议售价约 ${money(result.targetPrice)}；${values.channel === "ads" ? "广告佣金" : "达人佣金"}最好控制在 ${result.creatorCeiling.toFixed(1)}% 以内。`
          : values.channel === "ads"
            ? `投流场景达到目标。扣除广告佣金和每单 ${money(result.ads)} 投流费用后，仍有 ${money(result.unitProfit)} 单件贡献利润。`
            : `方案达到目标，当前单件贡献利润为 ${money(result.unitProfit)}。`;
      const shopAdsFloorWarning = values.channel === "ads" && values.creatorRate > 0 && values.adCommissionRate < values.creatorRate * .3
        ? ` Shop Ads 佣金低于标准佣金的 30%，Partner Campaign 可能会提示调整。`
        : "";
      document.getElementById("costAdvice").textContent = advice + shopAdsFloorWarning;
      renderCostScenarios(values);
    }

    function renderCostScenarios(base) {
      const scenarios = [
        { name: "自然 / 商品卡", channel: "organic", creatorRate: 0, adCommissionRate: 0, adCost: 0 },
        { name: "达人自然出单", channel: "affiliate", creatorRate: base.creatorRate, adCommissionRate: 0, adCost: 0 },
        { name: "达人投流出单", channel: "ads", creatorRate: 0, adCommissionRate: base.adCommissionRate, adCost: base.adCost }
      ].map((scenario) => ({ ...scenario, result: calculateCost({ ...base, ...scenario }) }));
      const best = Math.max(...scenarios.map((item) => item.result.margin));
      document.getElementById("costScenarioGrid").innerHTML = `<div class="cost-compare-list">${scenarios.map((item) => {
        const isBest = item.result.margin === best;
        return `<article class="cost-compare-card ${isBest ? "best" : ""}">
          <div class="cost-compare-name"><b>${item.name}</b><small>${isBest ? "当前最优方案" : "实时测算"}</small></div>
          <div class="cost-compare-main"><span>单件利润</span><strong class="${item.result.unitProfit >= 0 ? "positive" : "negative"}">${money(item.result.unitProfit)}</strong></div>
          <div class="cost-compare-meta"><div><span>利润率</span><b>${(item.result.margin * 100).toFixed(1)}%</b></div><div><span>保本价</span><b>${money(item.result.breakEvenPrice)}</b></div></div>
        </article>`;
      }).join("")}</div>`;
    }

    function saveCostingState() {
      try {
        const persisted = JSON.parse(localStorage.getItem(costingStoreKey) || "{}");
        const mergeById = (storedItems, currentItems, timeKey) => {
          const merged = new Map();
          [...(Array.isArray(storedItems) ? storedItems : []), ...(Array.isArray(currentItems) ? currentItems : [])].forEach((item) => {
            if (!item?.id) return;
            const previous = merged.get(item.id);
            const previousTime = new Date(previous?.[timeKey] || 0).getTime();
            const itemTime = new Date(item?.[timeKey] || 0).getTime();
            if (!previous || itemTime >= previousTime) merged.set(item.id, item);
          });
          return [...merged.values()].sort((a, b) => new Date(b?.[timeKey] || 0) - new Date(a?.[timeKey] || 0));
        };
        const nextState = {
          history: mergeById(persisted?.history, costingState.history, "savedAt"),
          profiles: mergeById(persisted?.profiles, costingState.profiles, "updatedAt")
        };
        localStorage.setItem(costingStoreKey, JSON.stringify(nextState));
        costingState = nextState;
        return true;
      } catch (error) {
        console.warn("Costing state save failed", error);
        showToast("本地存储空间不足。请重新选择图片，系统会压缩后再保存");
        return false;
      }
    }

    const costProfileNumericKeys = [
      "price", "targetMargin", "purchase", "packaging", "firstMile", "warehouse",
      "lastMile", "fulfillmentOther", "platformRate", "smartPromotionRate",
      "campaignPeriodRate", "refundRate", "returnLoss", "discount", "creatorRate",
      "adCommissionRate", "adCost"
    ];

    function costProfileIdentity(profile) {
      return `${String(profile?.product || "").trim().toLowerCase()}::${String(profile?.sku || "").trim().toLowerCase()}`;
    }

    function inlineCostImage(source) {
      const image = String(source || "");
      if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(image)) return "";
      return image.length <= 220000 ? image : "";
    }

    function cloudCostImageReference(source) {
      const image = String(source || "");
      return /^(?:https:\/\/tiktok-ops-workbench\.pages\.dev)?\/api\/cost-image\?id=[a-f0-9]{64}$/i.test(image)
        ? image
        : "";
    }

    function costProfileForTeam(profile, { includeInlineImage = false } = {}) {
      const clean = {
        id: String(profile?.id || crypto.randomUUID()),
        product: String(profile?.product || "").trim(),
        sku: String(profile?.sku || "").trim(),
        effectiveDate: String(profile?.effectiveDate || ""),
        note: String(profile?.note || "").trim(),
        channel: String(profile?.channel || "affiliate"),
        image: cloudCostImageReference(profile?.image)
          || (includeInlineImage ? inlineCostImage(profile?.image) : ""),
        updatedAt: String(profile?.updatedAt || new Date().toISOString())
      };
      costProfileNumericKeys.forEach((key) => { clean[key] = costNumber(profile?.[key]); });
      return clean;
    }

    function uniqueCostProfiles(records) {
      const byIdentity = new Map();
      (records || []).forEach((profile) => {
        const identity = costProfileIdentity(profile);
        if (identity === "::") return;
        const previous = byIdentity.get(identity);
        if (!previous || new Date(profile?.updatedAt || 0) >= new Date(previous?.updatedAt || 0)) {
          byIdentity.set(identity, profile);
        }
      });
      return [...byIdentity.values()];
    }

    function upsertCostProfileToState(profile) {
      const teamProfile = costProfileForTeam(profile);
      const identity = costProfileIdentity(teamProfile);
      const existingIndex = (state.costProfiles || []).findIndex((item) =>
        item.id === teamProfile.id || costProfileIdentity(item) === identity
      );
      if (existingIndex >= 0) {
        const previousImage = state.costProfiles[existingIndex]?.image || "";
        teamProfile.id = state.costProfiles[existingIndex].id || teamProfile.id;
        teamProfile.image = cloudCostImageReference(teamProfile.image)
          || cloudCostImageReference(previousImage)
          || "";
        state.costProfiles[existingIndex] = teamProfile;
      } else {
        state.costProfiles.unshift(teamProfile);
      }
      saveState();
    }

    function hydrateCostProfilesFromTeam() {
      const teamProfiles = Array.isArray(state?.costProfiles)
        ? state.costProfiles.filter((profile) => !legacyCostProfileIds.has(String(profile?.id || "")))
        : [];
      if (!teamProfiles.length) return;
      const localProfiles = (costingState.profiles || [])
        .filter((profile) => !legacyCostProfileIds.has(String(profile?.id || "")));
      let pendingImageCount = 0;
      teamProfiles.forEach((teamProfile) => {
        const identity = costProfileIdentity(teamProfile);
        const index = localProfiles.findIndex((item) =>
          item.id === teamProfile.id || costProfileIdentity(item) === identity
        );
        if (index >= 0) {
          const local = localProfiles[index];
          const teamIsNewer = new Date(teamProfile.updatedAt || 0) >= new Date(local.updatedAt || 0);
          const image = teamProfile.image || local.image || "";
          localProfiles[index] = teamIsNewer
            ? { ...local, ...teamProfile, image }
            : { ...local, image };
          if (!cloudCostImageReference(teamProfile.image) && inlineCostImage(local.image)) {
            pendingImageCount += 1;
          }
        } else {
          localProfiles.push({ ...teamProfile, image: teamProfile.image || "" });
        }
      });
      costingState.profiles = uniqueCostProfiles(localProfiles);
      saveCostingState();
      renderCostProfiles();
      activateLatestCostProfileIfNeeded();
      const cloudImageCount = teamProfiles.filter((profile) => cloudCostImageReference(profile?.image)).length;
      setCostCloudSyncStatus(
        pendingImageCount
          ? `本地有 ${pendingImageCount} 个 SKU 图片待同步`
          : `云端 ${teamProfiles.length} 个 SKU · ${cloudImageCount} 张图片`,
        pendingImageCount ? "saving" : "success"
      );
    }

    function costTeamEndpoint() {
      return ["localhost", "127.0.0.1", "::1"].includes(location.hostname)
        ? "https://tiktok-ops-workbench.pages.dev/api/state"
        : cloudEndpoint;
    }

    function costImageEndpoint() {
      return costTeamEndpoint().replace(/\/state$/, "/cost-image");
    }

    async function costImageHash(source) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
      return [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    }

    async function uploadCostImage(source) {
      const id = await costImageHash(source);
      const response = await fetch(costImageEndpoint(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, image: source })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || `图片上传失败（${response.status}）`);
      return payload.url;
    }

    function setCostCloudSyncStatus(text, mode = "") {
      const status = document.getElementById("costCloudSyncStatus");
      if (!status) return;
      status.textContent = text;
      status.className = `cost-cloud-sync-status ${mode}`.trim();
    }

    async function syncLocalCostProfilesToCloud() {
      const button = document.getElementById("syncCostProfilesCloud");
      const localProfiles = uniqueCostProfiles(costingState.profiles)
        .filter((profile) => !legacyCostProfileIds.has(String(profile?.id || "")))
        .map((profile) => costProfileForTeam(profile, { includeInlineImage: true }));
      if (!localProfiles.length) {
        showToast("当前没有可同步的 SKU 成本档案");
        return;
      }
      button.disabled = true;
      setCostCloudSyncStatus(`正在同步 ${localProfiles.length} 个 SKU…`, "saving");
      try {
        const endpoint = costTeamEndpoint();
        const inlineImages = [...new Set(
          localProfiles.map((profile) => inlineCostImage(profile.image)).filter(Boolean)
        )];
        const uploadedImages = new Map();
        for (let index = 0; index < inlineImages.length; index += 1) {
          setCostCloudSyncStatus(`正在上传图片 ${index + 1}/${inlineImages.length}…`, "saving");
          uploadedImages.set(inlineImages[index], await uploadCostImage(inlineImages[index]));
        }
        localProfiles.forEach((profile) => {
          const inlineImage = inlineCostImage(profile.image);
          if (inlineImage) profile.image = uploadedImages.get(inlineImage) || "";
        });
        setCostCloudSyncStatus(`正在同步 ${localProfiles.length} 个 SKU 成本…`, "saving");
        const currentResponse = await fetch(endpoint, { headers: { "accept": "application/json" } });
        if (!currentResponse.ok) throw new Error(`云端读取失败（${currentResponse.status}）`);
        const currentPayload = await currentResponse.json();
        const remoteProfiles = Array.isArray(currentPayload?.data?.costProfiles) ? currentPayload.data.costProfiles : [];
        const remoteById = new Map(remoteProfiles.map((item) => [String(item.id), item]));
        const remoteByIdentity = new Map(remoteProfiles.map((item) => [costProfileIdentity(item), item]));
        const upserts = localProfiles.map((profile) => {
          const existing = remoteById.get(String(profile.id)) || remoteByIdentity.get(costProfileIdentity(profile));
          return existing
            ? { ...existing, ...profile, id: existing.id, image: profile.image || existing.image || "" }
            : profile;
        });
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            version: "v2",
            patch: { collections: { costProfiles: { upserts, deletes: [] } } }
          })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || `云端保存失败（${response.status}）`);
        const remoteState = normalizeState(payload.data);
        const expectedImageIds = new Set(
          upserts.filter((profile) => profile.image).map((profile) => String(profile.id))
        );
        const confirmedImageCount = remoteState.costProfiles.filter((profile) =>
          expectedImageIds.has(String(profile.id)) && cloudCostImageReference(profile.image)
        ).length;
        if (confirmedImageCount !== expectedImageIds.size) {
          throw new Error("云端未完整收到 SKU 图片，请重新同步");
        }
        state.costProfiles = remoteState.costProfiles;
        cloudBaseline.costProfiles = structuredClone(remoteState.costProfiles);
        cloudRevision = Number(payload.revision || cloudRevision);
        localStorage.setItem(storeKey, JSON.stringify(state));
        hydrateCostProfilesFromTeam();
        const imageCount = upserts.filter((profile) => profile.image).length;
        const uniqueImageCount = new Set(upserts.map((profile) => profile.image).filter(Boolean)).size;
        setCostCloudSyncStatus(`已同步 ${upserts.length} 个 SKU${uniqueImageCount ? ` · ${uniqueImageCount} 张图片` : ""}`, "success");
        showToast(`已同步 ${upserts.length} 个 SKU${uniqueImageCount ? ` · ${uniqueImageCount} 张图片覆盖 ${imageCount} 个规格` : ""}`);
      } catch (error) {
        console.warn("Cost profile cloud sync failed", error);
        setCostCloudSyncStatus("同步失败，请重试", "error");
        showToast(error?.message || "成本档案同步失败，请重试");
      } finally {
        button.disabled = false;
      }
    }

    function renderCostHistory() {
      document.getElementById("costHistoryCount").textContent = `${costingState.history.length} 个版本`;
      const target = document.getElementById("costHistoryContent");
      if (!costingState.history.length) {
        target.innerHTML = '<div class="cost-empty">还没有保存的测算方案。<br>在「快速测算」确认参数后保存，第一条版本会出现在这里。</div>';
      } else {
        target.innerHTML = `<div class="table-wrap"><table class="cost-table"><thead><tr><th>版本</th><th>店铺 / SKU</th><th>场景</th><th>售价</th><th>单件利润</th><th>利润率</th><th>保存时间</th><th>操作</th></tr></thead><tbody>${costingState.history.map((item, index) => `<tr><td>V${costingState.history.length - index}</td><td>${escapeHtml(item.values.store)}<br><small>${escapeHtml(item.values.sku)}</small></td><td>${item.values.channel === "affiliate" ? "达人自然出单" : item.values.channel === "ads" ? "达人投流出单" : "自然 / 商品卡"}</td><td>${money(item.values.price)}</td><td>${money(item.result.unitProfit)}</td><td>${(item.result.margin * 100).toFixed(1)}%</td><td>${new Date(item.savedAt).toLocaleString("zh-CN")}</td><td class="cost-history-actions"><button data-cost-copy="${item.id}" type="button">复制测算</button></td></tr>`).join("")}</tbody></table></div>`;
      }
      renderCostProfiles();
    }

    function profileDisplayName(profile) {
      return `${profile.product ? `${profile.product} / ` : ""}${profile.sku}`;
    }

    function renderCostProfiles() {
      const profiles = (costingState.profiles || [])
        .filter((profile) => !legacyCostProfileIds.has(String(profile?.id || "")));
      document.getElementById("costProfileCount").textContent = `${profiles.length} 个 SKU`;
      document.getElementById("costProfileList").innerHTML = profiles.length
        ? `<div class="table-wrap"><table class="cost-table"><thead><tr><th>SKU</th><th>售价</th><th>基础成本</th><th>平台固定费率</th><th>操作</th></tr></thead><tbody>${profiles.map((item) => {
            const baseCost = costNumber(item.purchase) + costNumber(item.packaging) + costNumber(item.firstMile) + costNumber(item.warehouse) + costNumber(item.lastMile) + costNumber(item.fulfillmentOther);
            const image = item.image ? `<img src="${escapeHtml(item.image)}" alt="" />` : "暂无图";
            const fixedPlatformRate = costNumber(item.platformRate) + costNumber(item.smartPromotionRate) + costNumber(item.campaignPeriodRate);
            return `<tr><td><div class="cost-sku-cell"><div class="cost-sku-thumb">${image}</div><div><b>${escapeHtml(item.product || "未命名产品")}</b><br><small>${escapeHtml(item.sku)}</small></div></div></td><td>${money(costNumber(item.price))}</td><td>${money(baseCost)}</td><td>${fixedPlatformRate.toFixed(1)}%</td><td class="cost-history-actions"><button data-cost-profile-edit="${escapeHtml(item.id || "")}" type="button">编辑</button> <button data-cost-profile-use="${escapeHtml(item.id || "")}" type="button">去测算</button></td></tr>`;
          }).join("")}</tbody></table></div>`
        : '<div class="cost-empty">还没有 SKU 基础档案。<br>先在左侧录入一个 SKU，之后快速测算即可自动带出成本。</div>';
      const select = document.getElementById("costProfileSelect");
      const selected = select.value;
      select.innerHTML = `<option value="">请选择云端 SKU</option>${profiles.map((item) => `<option value="${escapeHtml(item.id || "")}">${escapeHtml(profileDisplayName(item))}</option>`).join("")}`;
      if (profiles.some((item) => item.id === selected)) select.value = selected;
    }

    function activateLatestCostProfileIfNeeded() {
      const select = document.getElementById("costProfileSelect");
      if (select?.value) return;
      const latest = (costingState.profiles || [])
        .filter((profile) => !legacyCostProfileIds.has(String(profile?.id || "")))
        .sort((a, b) => new Date(b?.updatedAt || 0) - new Date(a?.updatedAt || 0))[0];
      if (latest?.id) applyCostProfile(latest.id);
    }

    function profileFormValues() {
      const form = document.getElementById("costProfileForm");
      const raw = Object.fromEntries(new FormData(form).entries());
      const textKeys = new Set(["profileId", "product", "sku", "effectiveDate", "note", "image", "channel"]);
      return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, textKeys.has(key) ? String(value).trim() : costNumber(value)]));
    }

    function clearCostProfileError() {
      const form = document.getElementById("costProfileForm");
      const error = document.getElementById("costProfileError");
      error.textContent = "";
      error.classList.remove("show");
      form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
    }

    function validateCostProfileForm() {
      const form = document.getElementById("costProfileForm");
      const requiredFields = [
        { name: "product", label: "产品名称", type: "text" },
        { name: "sku", label: "SKU / 规格", type: "text" },
        { name: "price", label: "当前售价", type: "number" },
        { name: "purchase", label: "采购成本", type: "number" }
      ];
      clearCostProfileError();
      const invalid = requiredFields.find(({ name, type }) => {
        const field = form.elements[name];
        const value = String(field.value || "").trim();
        return !value || (type === "number" && (!Number.isFinite(Number(value)) || Number(value) < 0));
      });
      if (!invalid) return true;
      const field = form.elements[invalid.name];
      field.setAttribute("aria-invalid", "true");
      const error = document.getElementById("costProfileError");
      error.textContent = `还差「${invalid.label}」，填写后即可保存。`;
      error.classList.add("show");
      field.focus({ preventScroll: true });
      field.scrollIntoView({ behavior: "smooth", block: "center" });
      showToast(error.textContent);
      return false;
    }

    function resetCostProfileForm() {
      const form = document.getElementById("costProfileForm");
      form.reset();
      form.elements.profileId.value = "";
      form.elements.targetMargin.value = 20;
      form.elements.platformRate.value = 6;
      form.elements.smartPromotionRate.value = 3.5;
      form.elements.campaignPeriodRate.value = 0;
      form.elements.refundRate.value = 5;
      form.elements.returnLoss.value = 4;
      form.elements.channel.value = "affiliate";
      form.elements.discount.value = 0;
      form.elements.creatorRate.value = 15;
      form.elements.adCommissionRate.value = 5;
      form.elements.adCost.value = 0;
      form.elements.effectiveDate.value = today;
      document.getElementById("costProfileMode").textContent = "新建档案";
      clearCostProfileError();
      renderCostProfileImage("");
    }

    function renderCostProfileImage(source) {
      const preview = document.getElementById("costProfileImagePreview");
      preview.innerHTML = source ? `<img src="${escapeHtml(source)}" alt="SKU 图片预览" />` : "暂无<br>SKU 图片";
    }

    function editCostProfile(id) {
      const profile = costingState.profiles.find((item) => item.id === id);
      if (!profile) return;
      resetCostProfileForm();
      const form = document.getElementById("costProfileForm");
      Object.entries(profile).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
      form.elements.profileId.value = profile.id;
      document.getElementById("costProfileMode").textContent = "编辑基础档案";
      renderCostProfileImage(profile.image || "");
      setCostPane("profiles");
    }

    function applyCostProfile(id) {
      const profile = costingState.profiles.find((item) => item.id === id);
      if (!profile) return;
      const currentStore = document.querySelector("#costCalculatorForm [name='store']")?.value || costDefaultValues.store;
      const values = {
        ...costDefaultValues,
        store: currentStore,
        sku: `${profile.product ? `${profile.product} / ` : ""}${profile.sku}`,
        price: profile.price,
        purchase: profile.purchase,
        packaging: profile.packaging,
        firstMile: profile.firstMile,
        warehouse: profile.warehouse,
        lastMile: profile.lastMile,
        fulfillmentOther: profile.fulfillmentOther,
        platformRate: profile.platformRate,
        smartPromotionRate: profile.smartPromotionRate ?? costDefaultValues.smartPromotionRate,
        campaignPeriodRate: profile.campaignPeriodRate ?? 0,
        refundRate: profile.refundRate,
        returnLoss: profile.returnLoss,
        targetMargin: profile.targetMargin,
        channel: profile.channel || costDefaultValues.channel,
        discount: profile.discount ?? costDefaultValues.discount,
        creatorRate: profile.creatorRate ?? costDefaultValues.creatorRate,
        adCommissionRate: profile.adCommissionRate ?? costDefaultValues.adCommissionRate,
        adCost: profile.adCost ?? 0
      };
      loadCostValues(values);
      document.getElementById("costProfileSelect").value = id;
      document.getElementById("costSelectedSkuImage").innerHTML = profile.image ? `<img src="${escapeHtml(profile.image)}" alt="" />` : "暂无图";
      document.getElementById("costProfileStatus").textContent = `已带出：${profileDisplayName(profile)}`;
      document.getElementById("costOverrideHint").textContent = "修改字段仅用于当前测算场景";
      setCostPane("calculator");
    }

    function loadCostValues(values) {
      const form = document.getElementById("costCalculatorForm");
      Object.entries(values).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
      renderCostCalculator();
    }

    function clearCostCalculatorSelection() {
      loadCostValues(costDefaultValues);
      document.getElementById("costProfileSelect").value = "";
      document.getElementById("costSelectedSkuImage").textContent = "暂无图";
      document.getElementById("costProfileStatus").textContent = "请选择云端 SKU";
      document.getElementById("costOverrideHint").textContent = "选择后自动带出真实成本";
    }

    function setCostPane(name) {
      document.querySelectorAll(".cost-subtab").forEach((button) => button.classList.toggle("active", button.dataset.costPane === name));
      document.querySelectorAll("[data-cost-pane-content]").forEach((pane) => pane.classList.toggle("active", pane.dataset.costPaneContent === name));
      renderCostHistory();
    }

    document.getElementById("costCalculatorForm").addEventListener("input", renderCostCalculator);
    document.getElementById("costCalculatorForm").addEventListener("change", renderCostCalculator);
    document.getElementById("costCalculatorForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const values = costFormValues();
      const result = calculateCost(values);
      const savedAt = new Date().toISOString();
      const record = { id: crypto.randomUUID(), savedAt, values, result };
      costingState.history.unshift(record);
      if (!saveCostingState()) {
        costingState.history = costingState.history.filter((item) => item.id !== record.id);
        return;
      }
      renderCostHistory();
      showToast("测算方案已保存到本地");
    });
    document.getElementById("resetCostCalculator").addEventListener("click", clearCostCalculatorSelection);
    document.getElementById("costProfileForm").addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateCostProfileForm()) return;
      const values = profileFormValues();
      const existingId = values.profileId;
      const previous = costingState.profiles.find((item) => item.id === existingId) || {};
      const profile = { ...previous, ...values, id: existingId || crypto.randomUUID(), updatedAt: new Date().toISOString() };
      delete profile.profileId;
      const profilesBeforeSave = [...costingState.profiles];
      const index = costingState.profiles.findIndex((item) => item.id === profile.id);
      if (index >= 0) costingState.profiles[index] = profile;
      else costingState.profiles.unshift(profile);
      if (!saveCostingState()) {
        costingState.profiles = profilesBeforeSave;
        return;
      }
      upsertCostProfileToState(profile);
      if (profile.image) setCostCloudSyncStatus("正在上传 SKU 图片…", "saving");
      renderCostProfiles();
      resetCostProfileForm();
      showToast(existingId ? "SKU 基础成本已更新" : "SKU 基础成本已保存");
    });
    document.getElementById("syncCostProfilesCloud").addEventListener("click", syncLocalCostProfilesToCloud);
    document.getElementById("costProfileForm").addEventListener("input", (event) => {
      if (event.target.matches('[aria-invalid="true"]')) clearCostProfileError();
    });
    document.getElementById("resetCostProfile").addEventListener("click", resetCostProfileForm);
    function readCostImage(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("图片读取失败"));
        reader.readAsDataURL(file);
      });
    }

    function loadCostImage(source) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("图片格式无法识别"));
        image.src = source;
      });
    }

    async function compressCostImage(file) {
      const original = await readCostImage(file);
      const image = await loadCostImage(original);
      let maxSide = 560;
      let smallest = original;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        for (const quality of [.78, .64, .5]) {
          const candidate = canvas.toDataURL("image/webp", quality);
          if (candidate.length < smallest.length) smallest = candidate;
          if (candidate.length <= 120000) return candidate;
        }
        maxSide = Math.round(maxSide * .78);
      }
      if (smallest.length > 220000) throw new Error("图片压缩后仍然过大");
      return smallest;
    }

    document.getElementById("costProfileImageFile").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 10000000) {
        event.target.value = "";
        showToast("原图请控制在 10MB 以内");
        return;
      }
      try {
        const source = await compressCostImage(file);
        document.querySelector("#costProfileForm [name='image']").value = source;
        renderCostProfileImage(source);
        showToast(`图片已优化，可正常保存（约 ${Math.max(1, Math.round(source.length * .75 / 1024))}KB）`);
      } catch (error) {
        event.target.value = "";
        document.querySelector("#costProfileForm [name='image']").value = "";
        renderCostProfileImage("");
        showToast(error?.message || "图片处理失败，请重新选择");
      };
    });
    document.querySelectorAll("#costProfileForm input[type='number'], #costCalculatorForm input[type='number']").forEach((input) => {
      input.addEventListener("focus", () => {
        if (input.value === "0") window.setTimeout(() => input.select(), 0);
      });
      input.addEventListener("input", () => {
        const raw = String(input.value);
        if (/^0\d+/.test(raw)) {
          input.value = raw.replace(/^0+(?=\d)/, "");
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
      });
    });
    document.getElementById("costProfileSelect").addEventListener("change", (event) => {
      if (event.target.value) applyCostProfile(event.target.value);
      else clearCostCalculatorSelection();
    });
    document.querySelectorAll(".cost-subtab").forEach((button) => button.addEventListener("click", () => setCostPane(button.dataset.costPane)));
    window.addEventListener("storage", (event) => {
      if (event.key !== costingStoreKey || !event.newValue) return;
      try {
        const latest = JSON.parse(event.newValue);
        costingState = {
          history: Array.isArray(latest?.history) ? latest.history : [],
          profiles: Array.isArray(latest?.profiles) ? latest.profiles : []
        };
        renderCostHistory();
      } catch {
        // Ignore malformed storage events and keep the current in-memory state.
      }
    });
    document.addEventListener("click", (event) => {
      const copy = event.target.closest("[data-cost-copy]");
      const editProfile = event.target.closest("[data-cost-profile-edit]");
      const useProfile = event.target.closest("[data-cost-profile-use]");
      if (copy) {
        const record = costingState.history.find((item) => item.id === copy.dataset.costCopy);
        if (!record) return;
        loadCostValues(record.values);
        setCostPane("calculator");
        showToast("已复制历史方案，可继续调整");
        return;
      }
      if (editProfile) {
        editCostProfile(editProfile.dataset.costProfileEdit);
        return;
      }
      if (useProfile) applyCostProfile(useProfile.dataset.costProfileUse);
    });
    document.querySelectorAll('#costCalculatorForm input[type="number"], #costProfileForm input[type="number"]').forEach((input) => {
      input.min = "0";
    });
    resetCostProfileForm();
    loadCostValues(costDefaultValues);
    renderCostHistory();

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => setView(tab.dataset.view));
    });
