    function profitTemplateNumber(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    }

    function profitTemplateVisibleDates(anchorDate, count = 7) {
      const [year, month, day] = String(anchorDate || "").split("-").map(Number);
      const anchor = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isFinite(anchor.getTime())) return [];
      return Array.from({ length: count }, (_, index) => {
        const date = new Date(anchor);
        date.setUTCDate(anchor.getUTCDate() - (count - index - 1));
        return date.toISOString().slice(0, 10);
      });
    }

    function calculateProfitTemplateSkuDay(sku, dateKey) {
      const record = sku?.daily?.[dateKey] || {};
      const units = profitTemplateNumber(record.units);
      const price = profitTemplateNumber(record.price);
      const unitProfit = price * (1 - profitTemplateNumber(sku?.commissionRate) / 100)
        - profitTemplateNumber(sku?.cost);
      return { units, price, gmv: units * price, unitProfit, grossProfit: units * unitProfit };
    }

    function calculateProfitTemplateListingDay(listing, dateKey) {
      const daily = listing?.daily?.[dateKey] || {};
      const summary = { units: 0, gmv: 0, grossProfit: 0 };
      (listing?.skus || []).filter((sku) => sku.active).forEach((sku) => {
        const result = calculateProfitTemplateSkuDay(sku, dateKey);
        summary.units += result.units;
        summary.gmv += result.gmv;
        summary.grossProfit += result.grossProfit;
      });
      const sampleCost = (listing?.sampleTypes || []).reduce((sum, sample) => (
        sum + profitTemplateNumber(daily.sampleQuantities?.[sample.id]) * profitTemplateNumber(sample.unitCost)
      ), 0);
      const marketingSpend = profitTemplateNumber(daily.marketingSpend);
      const adjustments = profitTemplateNumber(daily.adjustments);
      const netProfit = summary.grossProfit - sampleCost - marketingSpend - adjustments;
      return {
        ...summary,
        sampleCost,
        marketingSpend,
        adjustments,
        netProfit,
        margin: summary.gmv ? netProfit / summary.gmv : 0
      };
    }

    function createProfitTemplateData(anchorDate = "2026-08-04") {
      const dates = profitTemplateVisibleDates(anchorDate, 30);
      const definitions = [
        {
          store: "DreamWeave",
          product: "JZZ",
          skus: [
            ["白", 12, 16.99, 72], ["灰", 12, 17.49, 164], ["灰绿", 12, 21.49, 18],
            ["紫", 12, 18.99, 36], ["蓝", 12, 18.99, 12], ["黄", 12, 18.49, 8],
            ["粉", 12, 18.99, 9], ["绿-4PCS", 20, 35.99, 3], ["灰-4PCS", 20, 39.99, 2]
          ],
          sampleTypes: [["标准寄样", 12]],
          commissionRate: 20.5,
          marketingBase: 238
        },
        {
          store: "Dreamdaily",
          product: "JDZ",
          skus: [
            ["JDZ", 12, 9.95, 286], ["BK-Q", 15, 11.99, 32], ["BK-K", 15, 18.62, 24],
            ["JDZ 4PCS", 20, 23.85, 8], ["BK 4PCS", 26, 30.99, 5]
          ],
          sampleTypes: [["JDZ 寄样", 12], ["BK 寄样", 15]],
          commissionRate: 20.5,
          marketingBase: 112
        },
        {
          store: "Dreamland",
          product: "NHZ",
          skus: [["Grey", 12, 19.99, 26], ["White", 12, 17.99, 23], ["Grey-4PCS", 22, 35.99, 4], ["White-4PCS", 22, 32.99, 3]],
          sampleTypes: [["标准寄样", 12]],
          commissionRate: 20.5,
          marketingBase: 46
        },
        {
          store: "MoonDream",
          product: "YG",
          skus: [["银管-1", 5.6, 8.49, 8], ["银管-2", 6.5, 13.99, 4], ["银管-tz", 7.4, 15.11, 9]],
          sampleTypes: [["银管寄样", 6.5]],
          commissionRate: 25,
          marketingBase: 34
        },
        {
          store: "sweet dream",
          product: "ZG",
          skus: [["紫管-1", 5.5, 6.89, 4], ["紫管-2", 6.2, 11.99, 2], ["紫管-tz", 7.1, 14.77, 3]],
          sampleTypes: [["紫管寄样", 6.2]],
          commissionRate: 25,
          marketingBase: 29
        },
        {
          store: "Himood Smile",
          product: "YT",
          skus: [["牙贴-1", 6.3, 7.22, 9], ["牙贴-2", 7.6, 11.99, 3], ["牙贴-3", 8.9, 14.99, 2]],
          sampleTypes: [["牙贴寄样", 6.3]],
          commissionRate: 25,
          marketingBase: 38
        }
      ];

      return definitions.map((definition, listingIndex) => {
        const sampleTypes = definition.sampleTypes.map(([name, unitCost]) => ({
          id: crypto.randomUUID(), name, unitCost
        }));
        const skus = definition.skus.map(([name, cost, basePrice, baseUnits], skuIndex) => {
          const daily = {};
          dates.forEach((dateKey, dayIndex) => {
            const weekdayFactor = [0.82, 0.9, 0.96, 1.02, 1.08, 1.18, 1.12][dayIndex % 7];
            const pulse = ((dayIndex + skuIndex * 3 + listingIndex) % 5 - 2) * 0.04;
            daily[dateKey] = {
              units: Math.max(0, Math.round(baseUnits * (weekdayFactor + pulse))),
              price: Number(Math.max(cost, basePrice + ((dayIndex + skuIndex) % 7 - 3) * 0.17).toFixed(2))
            };
          });
          return {
            id: crypto.randomUUID(),
            name,
            cost,
            commissionRate: definition.commissionRate,
            active: true,
            daily
          };
        });
        const daily = {};
        dates.forEach((dateKey, dayIndex) => {
          const sampleQuantities = {};
          sampleTypes.forEach((sampleType, sampleIndex) => {
            sampleQuantities[sampleType.id] = (dayIndex + listingIndex + sampleIndex * 2) % 6 === 0
              ? 1 + ((dayIndex + sampleIndex) % 4)
              : 0;
          });
          daily[dateKey] = {
            sampleQuantities,
            marketingSpend: Number((definition.marketingBase * (0.84 + (dayIndex % 5) * 0.08)).toFixed(2)),
            adjustments: dayIndex % 11 === 0 ? 8 : 0
          };
        });
        return {
          id: crypto.randomUUID(),
          store: definition.store,
          product: definition.product,
          url: `https://www.tiktok.com/shop/pdp/${definition.product.toLowerCase()}`,
          active: true,
          sampleTypes,
          skus,
          daily
        };
      });
    }

    function calculateProfitTemplateSku(sku) {
      const units = profitTemplateNumber(sku?.units);
      const price = profitTemplateNumber(sku?.price);
      const cost = profitTemplateNumber(sku?.cost);
      const commissionRate = profitTemplateNumber(sku?.commissionRate);
      const sampleCost = profitTemplateNumber(sku?.sampleCost);
      const adSpend = profitTemplateNumber(sku?.adSpend);
      const gmv = units * price;
      const unitProfit = price * (1 - commissionRate / 100) - cost;
      const actualProfit = unitProfit * units - sampleCost - adSpend;
      return { gmv, unitProfit, actualProfit, margin: gmv ? actualProfit / gmv : 0 };
    }

    function profitTemplateSummary(listings) {
      const summary = { units: 0, gmv: 0, sampleCost: 0, adSpend: 0, actualProfit: 0, margin: 0 };
      (listings || []).forEach((listing) => {
        (listing?.skus || []).filter((sku) => sku.active).forEach((sku) => {
          const result = calculateProfitTemplateSku(sku);
          summary.units += profitTemplateNumber(sku.units);
          summary.gmv += result.gmv;
          summary.sampleCost += profitTemplateNumber(sku.sampleCost);
          summary.adSpend += profitTemplateNumber(sku.adSpend);
          summary.actualProfit += result.actualProfit;
        });
      });
      summary.margin = summary.gmv ? summary.actualProfit / summary.gmv : 0;
      return summary;
    }

    function validateProfitTemplateLink(values) {
      if (!String(values?.store || "").trim()) return "请选择所属店铺";
      if (!String(values?.product || "").trim()) return "请输入产品名称";
      try {
        const url = new URL(String(values?.url || "").trim());
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
      } catch {
        return "请输入以 http:// 或 https:// 开头的商品链接";
      }
      return "";
    }

    function validateProfitTemplateSku(values) {
      if (!String(values?.name || "").trim()) return "请输入 SKU 名称";
      const price = Number(values?.price);
      const cost = Number(values?.cost);
      const commissionRate = Number(values?.commissionRate);
      if (!Number.isFinite(price) || price < 0) return "售价不能小于 0";
      if (!Number.isFinite(cost) || cost < 0) return "单件成本不能小于 0";
      if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100) return "佣金率必须在 0–100% 之间";
      return "";
    }

    function toggleProfitTemplateSku(listings, skuId) {
      for (const listing of listings || []) {
        const sku = (listing.skus || []).find((item) => item.id === skuId);
        if (!sku) continue;
        sku.active = !sku.active;
        return sku.active;
      }
      return null;
    }

    function profitTemplateMoney(value) {
      const number = profitTemplateNumber(value);
      return `${number < 0 ? "-" : ""}$${Math.abs(number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function profitTemplatePercent(value) {
      return `${(profitTemplateNumber(value) * 100).toFixed(1)}%`;
    }

    function profitTemplateRows(listings) {
      return (listings || []).flatMap((listing) => (listing.skus || []).map((sku) => ({ listing, sku, result: calculateProfitTemplateSku(sku) })));
    }

    let profitTemplateListings = createProfitTemplateData();

    function renderProfitTemplate() {
      const root = document.getElementById("profitTemplateRoot");
      if (!root) return;
      const summary = profitTemplateSummary(profitTemplateListings);
      const rows = profitTemplateRows(profitTemplateListings);
      const kpis = [
        ["销量", `${summary.units.toLocaleString("en-US")} 件`, "当前启用 SKU"],
        ["GMV", profitTemplateMoney(summary.gmv), "售价 × 销量"],
        ["样品费", profitTemplateMoney(summary.sampleCost), "演示分摊"],
        ["广告费", profitTemplateMoney(summary.adSpend), "演示分摊"],
        ["实际利润", profitTemplateMoney(summary.actualProfit), "扣除样品与广告", summary.actualProfit < 0 ? "negative" : "positive"],
        ["利润率", profitTemplatePercent(summary.margin), "实际利润 ÷ GMV", summary.margin < 0 ? "negative" : "positive"]
      ];

      root.innerHTML = `
        <div class="profit-template-shell">
          <header class="profit-template-head">
            <div>
              <div class="profit-template-eyebrow">Profit center preview</div>
              <div class="profit-template-title-row"><h2>链接与 SKU 利润中心</h2><span>示例数据 · 不会保存</span></div>
              <p>先看操作和排版。新增链接、增加或停用 SKU 都只影响当前页面，刷新即可恢复。</p>
            </div>
            <button class="primary profit-add-link" id="profitAddLink" type="button"><span>＋</span> 新增商品链接</button>
          </header>

          <section class="profit-template-kpis" aria-label="利润中心示例指标">
            ${kpis.map(([label, value, hint, tone = ""]) => `<article class="profit-template-kpi ${tone}"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join("")}
          </section>

          <section class="profit-template-section">
            <div class="profit-template-section-head">
              <div><span>商品结构</span><h3>店铺与商品链接</h3></div>
              <small>${profitTemplateListings.length} 个链接 · ${rows.filter((row) => row.sku.active).length} 个启用 SKU</small>
            </div>
            <div class="profit-listing-grid">
              ${profitTemplateListings.map((listing) => {
                const activeSkus = listing.skus.filter((sku) => sku.active);
                const listingSummary = profitTemplateSummary([listing]);
                return `<article class="profit-listing-card">
                  <div class="profit-listing-top">
                    <div class="profit-listing-identity"><span>${escapeHtml(listing.store)}</span><h4>${escapeHtml(listing.product)}</h4></div>
                    <span class="profit-status active">使用中</span>
                  </div>
                  <a class="profit-listing-link" href="${escapeHtml(listing.url)}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(listing.url)}</span><b>↗</b></a>
                  <div class="profit-listing-stats">
                    <div><span>启用 SKU</span><b>${activeSkus.length}</b></div>
                    <div><span>销量</span><b>${activeSkus.reduce((sum, sku) => sum + profitTemplateNumber(sku.units), 0).toLocaleString("en-US")}</b></div>
                    <div><span>实际利润</span><b class="${listingSummary.actualProfit < 0 ? "negative" : "positive"}">${profitTemplateMoney(listingSummary.actualProfit)}</b></div>
                  </div>
                  <div class="profit-sku-chips">${listing.skus.length ? listing.skus.map((sku) => `<span class="${sku.active ? "" : "inactive"}">${escapeHtml(sku.name)}${sku.active ? "" : " · 已停用"}</span>`).join("") : '<span class="empty">还没有 SKU</span>'}</div>
                  <button class="profit-add-sku" data-profit-add-sku="${listing.id}" type="button">＋ 增加 SKU</button>
                </article>`;
              }).join("")}
            </div>
          </section>

          <section class="profit-template-section profit-table-section">
            <div class="profit-template-section-head">
              <div><span>利润明细</span><h3>SKU 实际利润</h3></div>
              <small>停用保留历史，不参与上方汇总</small>
            </div>
            <div class="profit-table-wrap">
              <table class="profit-template-table">
                <thead><tr><th>店铺 / 商品</th><th>SKU</th><th>状态</th><th>销量</th><th>售价</th><th>成本</th><th>佣金</th><th>单件利润</th><th>实际利润</th><th>操作</th></tr></thead>
                <tbody>${rows.map(({ listing, sku, result }) => `<tr class="${sku.active ? "" : "inactive"}">
                  <td><b>${escapeHtml(listing.store)}</b><span>${escapeHtml(listing.product)}</span></td>
                  <td><b>${escapeHtml(sku.name)}</b></td>
                  <td><span class="profit-status ${sku.active ? "active" : "inactive"}">${sku.active ? "启用" : "已停用"}</span></td>
                  <td class="numeric">${profitTemplateNumber(sku.units).toLocaleString("en-US")}</td>
                  <td class="numeric">${profitTemplateMoney(sku.price)}</td>
                  <td class="numeric">${profitTemplateMoney(sku.cost)}</td>
                  <td class="numeric">${profitTemplateNumber(sku.commissionRate).toFixed(1)}%</td>
                  <td class="numeric ${result.unitProfit < 0 ? "negative" : "positive"}">${profitTemplateMoney(result.unitProfit)}</td>
                  <td class="numeric ${result.actualProfit < 0 ? "negative" : "positive"}">${profitTemplateMoney(result.actualProfit)}</td>
                  <td><button class="profit-row-action ${sku.active ? "stop" : "restore"}" data-profit-toggle-sku="${sku.id}" type="button">${sku.active ? "停用" : "恢复"}</button></td>
                </tr>`).join("")}</tbody>
              </table>
            </div>
          </section>
        </div>`;
    }

    function openProfitTemplateDialog(dialogId) {
      const dialog = document.getElementById(dialogId);
      if (!dialog || dialog.open) return;
      dialog.showModal();
    }

    function closeProfitTemplateDialog(dialogId) {
      const dialog = document.getElementById(dialogId);
      if (dialog?.open) dialog.close();
    }

    function showProfitTemplateError(id, message) {
      const target = document.getElementById(id);
      if (!target) return;
      target.textContent = message;
      target.classList.toggle("show", Boolean(message));
    }

    if (typeof document !== "undefined") {
      const profitRoot = document.getElementById("profitTemplateRoot");
      const profitLinkForm = document.getElementById("profitLinkForm");
      const profitSkuForm = document.getElementById("profitSkuForm");

      profitRoot?.addEventListener("click", (event) => {
        const addLink = event.target.closest("#profitAddLink");
        const addSku = event.target.closest("[data-profit-add-sku]");
        const toggleSku = event.target.closest("[data-profit-toggle-sku]");
        if (addLink) {
          showProfitTemplateError("profitLinkError", "");
          openProfitTemplateDialog("profitLinkDialog");
          return;
        }
        if (addSku) {
          const listing = profitTemplateListings.find((item) => item.id === addSku.dataset.profitAddSku);
          if (!listing || !profitSkuForm) return;
          profitSkuForm.reset();
          profitSkuForm.elements.listingId.value = listing.id;
          document.getElementById("profitSkuDialogCopy").textContent = `${listing.store} · ${listing.product}`;
          showProfitTemplateError("profitSkuError", "");
          openProfitTemplateDialog("profitSkuDialog");
          return;
        }
        if (toggleSku) {
          const active = toggleProfitTemplateSku(profitTemplateListings, toggleSku.dataset.profitToggleSku);
          if (active === null) return;
          renderProfitTemplate();
          showToast(active ? "SKU 已恢复，仅在模板中生效" : "SKU 已停用，历史行仍保留");
        }
      });

      profitLinkForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(profitLinkForm).entries());
        const error = validateProfitTemplateLink(values);
        showProfitTemplateError("profitLinkError", error);
        if (error) return;
        profitTemplateListings.unshift({
          id: crypto.randomUUID(),
          store: values.store.trim(),
          product: values.product.trim(),
          url: values.url.trim(),
          active: true,
          skus: []
        });
        profitLinkForm.reset();
        closeProfitTemplateDialog("profitLinkDialog");
        renderProfitTemplate();
        showToast("商品链接已加入模板");
      });

      profitSkuForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(profitSkuForm).entries());
        const error = validateProfitTemplateSku(values);
        showProfitTemplateError("profitSkuError", error);
        if (error) return;
        const listing = profitTemplateListings.find((item) => item.id === values.listingId);
        if (!listing) {
          showProfitTemplateError("profitSkuError", "未找到对应商品链接，请重新打开表单");
          return;
        }
        listing.skus.push({
          id: crypto.randomUUID(),
          name: values.name.trim(),
          units: 0,
          price: Number(values.price),
          cost: Number(values.cost),
          commissionRate: Number(values.commissionRate),
          sampleCost: 0,
          adSpend: 0,
          active: true
        });
        profitSkuForm.reset();
        closeProfitTemplateDialog("profitSkuDialog");
        renderProfitTemplate();
        showToast("SKU 已加入模板");
      });

      document.querySelectorAll("[data-profit-dialog-close]").forEach((button) => {
        button.addEventListener("click", () => closeProfitTemplateDialog(button.dataset.profitDialogClose));
      });
      document.querySelectorAll(".profit-dialog").forEach((dialog) => {
        dialog.addEventListener("click", (event) => {
          if (event.target === dialog) dialog.close();
        });
      });
      renderProfitTemplate();
    }
