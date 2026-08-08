    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      }[char]));
    }

    function readImageAsDataUrl(file, maxSize = 320) {
      if (!file || !file.size) return Promise.resolve("");
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => resolve(String(reader.result || ""));
          img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const width = Math.max(1, Math.round(img.width * scale));
            const height = Math.max(1, Math.round(img.height * scale));
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          };
          img.src = String(reader.result || "");
        };
        reader.readAsDataURL(file);
      });
    }

    function avatarPreviewHtml(src, name = "") {
      return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(name || "达人头像")}">` : escapeHtml(creatorInitials(name || "头像"));
    }

    function setAvatarPreview(id, src, name = "") {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = avatarPreviewHtml(src, name);
    }

    function creatorHistoryFor(id) {
      return (state.creatorHistory || [])
        .filter((item) => item.creatorId === id)
        .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    }

    function formatDateTime(value) {
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return escapeHtml(value);
      return date.toLocaleString("zh-CN", { hour12: false });
    }

    function appendCreatorHistory(record, data, action = "编辑") {
      state.creatorHistory ||= [];
      state.creatorHistory.push({
        id: crypto.randomUUID(),
        creatorId: record.id,
        savedAt: new Date().toISOString(),
        action,
        name: data.name || record.name || "",
        product: data.product || record.product || "",
        shop: data.shop || record.shop || "",
        gmvK: Number(data.gmvK || record.gmvK || 0),
        followStatus: data.followStatus || "待跟进",
        owner: data.owner || "",
        relationship: data.relationship || "",
        followNote: data.followNote || ""
      });
      if (state.creatorHistory.length > 600) {
        state.creatorHistory = state.creatorHistory.slice(-600);
      }
    }

    const BLANKET_PROJECT_CREATORS = [
      {
        id: "blanket-luna-home",
        source: "毛毯项目",
        tier: "头达",
        avatar: "",
        name: "Luna Home",
        contact: "@lunahome · WhatsApp",
        levelTag: "头达",
        categoryTag: "家居",
        period: "2026-07-30",
        videoStatus: "直播",
        liveStatus: "直播",
        product: "灰色毛毯 × 2",
        shop: "DreamWeave",
        samples: [
          { sku: "BL-GY-L", color: "灰色", size: "L", qty: 1, status: "已寄出" },
          { sku: "BL-GY-XL", color: "灰色", size: "XL", qty: 1, status: "已寄出" },
          { sku: "BL-WH-XL", color: "白色", size: "XL", qty: 2, status: "已寄出" },
          { sku: "BL-BR-L", color: "棕色", size: "L", qty: 1, status: "待寄出" },
          { sku: "BL-BR-XL", color: "棕色", size: "XL", qty: 2, status: "待寄出" }
        ],
        commission: 0.15,
        adCommission: 0.05,
        relationship: "已确认合作并寄样",
        followStatus: "已寄样",
        owner: "Amy",
      },
      {
        id: "blanket-mika-living",
        source: "毛毯项目",
        tier: "优先达人",
        avatar: "",
        name: "Mika Living",
        contact: "@mikaliving · Email",
        levelTag: "腰部",
        categoryTag: "家居",
        period: "2026-07-27",
        videoStatus: "视频",
        liveStatus: "",
        product: "白色毛毯 × 1",
        shop: "sweet dream",
        samples: [
          { sku: "BL-WH-M", color: "白色", size: "M", qty: 1, status: "已寄出" },
          { sku: "BL-WH-L", color: "白色", size: "L", qty: 1, status: "已寄出" }
        ],
        commission: 0.12,
        adCommission: 0.03,
        relationship: "寄样后暂未回复",
        followStatus: "待跟进",
        owner: "Leo",
      },
      {
        id: "blanket-sunday-nest",
        source: "毛毯项目",
        tier: "普通达人",
        avatar: "",
        name: "Sunday Nest",
        contact: "@sundaynest · TikTok DM",
        levelTag: "长尾",
        categoryTag: "个护",
        period: "2026-07-30",
        videoStatus: "视频",
        liveStatus: "",
        product: "棕色毛毯 × 1",
        shop: "Dreamland",
        samples: [
          { sku: "BL-BR-XL", color: "棕色", size: "XL", qty: 1, status: "待寄出" }
        ],
        commission: 0.10,
        adCommission: 0.02,
        relationship: "等待确认收件地址",
        followStatus: "待确认寄样",
        owner: "Mia",
      }
    ];

    function blanketProjectCreators() {
      const removedIds = new Set((state.blanketRemovedCreators || []).map((item) => item.id));
      return [
        ...BLANKET_PROJECT_CREATORS,
        ...(state.customCreators || []).filter((item) => item.source === "毛毯项目")
      ].filter((item) => !removedIds.has(item.id)).map(creatorDisplayRecord);
    }

    function creatorRecords() {
      const records = [
        ...BLANKET_PROJECT_CREATORS,
        ...(window.IMPORTED_CREATOR_DATA?.records || []),
        ...(state.customCreators || [])
      ];
      return [...new Map(records.map((item) => [item.id, item])).values()];
    }

    function creatorEditFor(id) {
      const existing = state.creatorEdits?.[id] || {};
      return {
        name: existing.name || "",
        avatar: existing.avatar || "",
        contact: existing.contact || "",
        source: existing.source || "",
        tier: existing.tier || "",
        period: existing.period || "",
        product: existing.product || "",
        shop: existing.shop || "",
        levelTag: existing.levelTag || "",
        categoryTag: existing.categoryTag || "",
        videoStatus: existing.videoStatus || "",
        liveStatus: existing.liveStatus || "",
        gmvK: existing.gmvK ?? "",
        commission: existing.commission ?? "",
        adCommission: existing.adCommission ?? "",
        relationship: existing.relationship || "",
        followStatus: existing.followStatus || "待跟进",
        owner: existing.owner || "",
        followNote: existing.followNote || ""
      };
    }

    function creatorDisplayRecord(record) {
      const edit = creatorEditFor(record.id);
      const merged = { ...record };
      ["name", "avatar", "contact", "source", "tier", "period", "product", "shop", "videoStatus", "liveStatus", "relationship"].forEach((key) => {
        if (edit[key] !== "") merged[key] = edit[key];
      });
      if (edit.levelTag !== "") merged.levelTag = edit.levelTag;
      if (edit.categoryTag !== "") merged.categoryTag = edit.categoryTag;
      if (Array.isArray(edit.samples)) merged.samples = edit.samples;
      ["gmvK", "commission", "adCommission"].forEach((key) => {
        if (edit[key] !== "" && edit[key] !== undefined) merged[key] = Number(edit[key] || 0);
      });
      merged.products = merged.product ? String(merged.product).split(/[\/,，、]+/).map((item) => item.trim()).filter(Boolean) : [];
      return merged;
    }

    function creatorInitials(name) {
      const text = String(name || "?").trim();
      return text.slice(0, 2).toUpperCase();
    }

    function creatorAvatar(record, clickable = false) {
      const attrs = clickable ? ` data-creator-history="${escapeHtml(record.id)}" title="查看达人最新记录和历史记录"` : "";
      const cls = clickable ? "creator-avatar clickable" : "creator-avatar";
      if (record.avatar) {
        return `<span class="${cls}"${attrs}><img src="${escapeHtml(record.avatar)}" alt="${escapeHtml(record.name || "达人头像")}" loading="lazy"></span>`;
      }
      return `<span class="${cls}"${attrs}>${escapeHtml(creatorInitials(record.name))}</span>`;
    }

    function creatorProfile(record, clickableAvatar = false) {
      return `
        <div class="creator-profile">
          ${creatorAvatar(record, clickableAvatar)}
          <span><b>${escapeHtml(record.name || "-")}</b><small>${escapeHtml(record.source || "-")} · ${escapeHtml(record.tier || "-")}</small>${creatorTagSummary(record)}</span>
        </div>
      `;
    }

    function creatorTagsFor(record) {
      return [record.levelTag, record.categoryTag].map((tag) => String(tag || "").trim()).filter(Boolean);
    }

    function creatorTagSummary(record) {
      if (!record.levelTag && !record.categoryTag) return "";
      return `<span class="creator-tags">${record.levelTag ? `<em class="creator-tag level">${escapeHtml(record.levelTag)}</em>` : ""}${record.categoryTag ? `<em class="creator-tag category">${escapeHtml(record.categoryTag)}</em>` : ""}</span>`;
    }

    function creatorActionButton(record, context = "all") {
      const removeButton = context === "all" ? "" : `<button class="row-action danger" type="button" data-remove-creator="${escapeHtml(record.id)}" data-remove-context="${context}">移出</button>`;
      return `<span class="creator-row-actions"><button class="row-action" type="button" data-edit-creator="${escapeHtml(record.id)}">编辑</button>${removeButton}</span>`;
    }

    function hasVideo(record) {
      const text = `${record.videoStatus || ""} ${record.liveStatus || ""}`;
      return text.includes("是") || text.toLowerCase().includes("video") || text.includes("视频") || text.includes("直播");
    }

    function hasLive(record) {
      const text = `${record.videoStatus || ""} ${record.liveStatus || ""}`;
      return text.includes("直播") || text.includes("AM") || text.includes("PM") || text.includes("是/");
    }

    function statusBadge(value, type = "") {
      const text = value || "-";
      const hasVideoText = String(text).includes("视频");
      const hasLiveText = String(text).includes("直播");
      const contentClass = hasVideoText && hasLiveText ? "video-live" : hasLiveText ? "live" : hasVideoText ? "video" : "";
      const cls = type || contentClass || (String(text).includes("是") ? "good" : String(text).includes("否") ? "warn" : "");
      return `<span class="creator-status ${cls}">${escapeHtml(text)}</span>`;
    }

    function sampleItemsFor(record) {
      return Array.isArray(record.samples) && record.samples.length
        ? record.samples
        : [{ sku: "-", color: record.product || "未填写", size: "-", qty: 1, status: "-" }];
    }

    function serializeSampleItems(record) {
      if (!Array.isArray(record.samples) || !record.samples.length) return "";
      return record.samples.map((item) => [
        item.sku || "-",
        item.color || "-",
        item.size || "-",
        Number(item.qty || 0),
        item.status || "-"
      ].join(" | ")).join("\n");
    }

    function parseSampleItems(value) {
      return String(value || "").split(/\n+/).map((line) => {
        const [sku, color, size, qty, status] = line.split("|").map((part) => part.trim());
        if (!line.trim()) return null;
        return { sku: sku || "-", color: color || "-", size: size || "-", qty: Math.max(0, Number(qty || 0)), status: status || "-" };
      }).filter(Boolean);
    }

    const creatorImportHeaderMap = new Map([
      ["达人昵称", "name"],
      ["tiktok达人id", "creatorHandle"],
      ["达人id", "creatorHandle"],
      ["联系方式", "contact"],
      ["来源项目", "source"],
      ["来源", "source"],
      ["达人类型", "tier"],
      ["层级标签", "levelTag"],
      ["类目标签", "categoryTag"],
      ["内容类型", "videoStatus"],
      ["视频直播", "videoStatus"],
      ["达人产品", "product"],
      ["寄样产品", "product"],
      ["产品", "product"],
      ["sku", "product"],
      ["产品sku", "product"],
      ["寄样规格明细", "sampleDetails"],
      ["店铺", "shop"],
      ["合作佣金", "commission"],
      ["广告佣金", "adCommission"],
      ["合作情况", "relationship"],
      ["跟进状态", "followStatus"],
      ["负责人", "owner"],
      ["更新日期", "period"],
      ["近7日gmvk", "gmvK"]
    ]);

    function normalizedCreatorImportHeader(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/必填/g, "")
        .replace(/[（）()\s/·_*]/g, "");
    }

    function parseCreatorCsv(text) {
      const rows = [];
      let row = [];
      let cell = "";
      let quoted = false;
      const source = String(text || "").replace(/^\uFEFF/, "");
      for (let index = 0; index < source.length; index += 1) {
        const char = source[index];
        if (quoted) {
          if (char === '"' && source[index + 1] === '"') {
            cell += '"';
            index += 1;
          } else if (char === '"') quoted = false;
          else cell += char;
          continue;
        }
        if (char === '"') quoted = true;
        else if (char === ",") {
          row.push(cell);
          cell = "";
        } else if (char === "\n") {
          row.push(cell.replace(/\r$/, ""));
          rows.push(row);
          row = [];
          cell = "";
        } else cell += char;
      }
      if (cell || row.length) {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
      }
      return rows;
    }

    function creatorXlsxText(xmlBytes) {
      return new TextDecoder("utf-8").decode(xmlBytes);
    }

    let fflateLoadPromise = null;

    function ensureFflateLoaded() {
      if (window.fflate?.unzipSync) return Promise.resolve(window.fflate);
      if (fflateLoadPromise) return fflateLoadPromise;
      fflateLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "assets/vendor/fflate.js";
        script.async = true;
        script.onload = () => window.fflate?.unzipSync
          ? resolve(window.fflate)
          : reject(new Error("Excel解析组件初始化失败"));
        script.onerror = () => reject(new Error("Excel解析组件载入失败，请检查网络后重试"));
        document.head.appendChild(script);
      });
      return fflateLoadPromise;
    }

    function creatorXlsxMatrix(bytes) {
      if (!window.fflate?.unzipSync) throw new Error("Excel解析组件未载入，请刷新后重试");
      const files = window.fflate.unzipSync(new Uint8Array(bytes));
      const sheetBytes = files["xl/worksheets/sheet1.xml"];
      if (!sheetBytes) throw new Error("模板中未找到第一个工作表");
      const parser = new DOMParser();
      const shared = [];
      if (files["xl/sharedStrings.xml"]) {
        const sharedDoc = parser.parseFromString(creatorXlsxText(files["xl/sharedStrings.xml"]), "application/xml");
        [...sharedDoc.getElementsByTagNameNS("*", "si")].forEach((item) => {
          shared.push([...item.getElementsByTagNameNS("*", "t")].map((node) => node.textContent || "").join(""));
        });
      }
      const sheetDoc = parser.parseFromString(creatorXlsxText(sheetBytes), "application/xml");
      const rows = [];
      [...sheetDoc.getElementsByTagNameNS("*", "row")].forEach((rowNode) => {
        const values = [];
        [...rowNode.getElementsByTagNameNS("*", "c")].forEach((cellNode) => {
          const reference = cellNode.getAttribute("r") || "A1";
          const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() || "A";
          let column = 0;
          for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
          column -= 1;
          const type = cellNode.getAttribute("t") || "";
          const valueNode = cellNode.getElementsByTagNameNS("*", "v")[0];
          const inlineNode = cellNode.getElementsByTagNameNS("*", "is")[0];
          const raw = type === "inlineStr"
            ? [...(inlineNode?.getElementsByTagNameNS("*", "t") || [])].map((node) => node.textContent || "").join("")
            : valueNode?.textContent || "";
          values[column] = type === "s" ? shared[Number(raw)] || "" : raw;
        });
        rows.push(values);
      });
      return rows;
    }

    async function readCreatorImportMatrix(file) {
      if (!file) return [];
      if (/\.csv$/i.test(file.name)) return parseCreatorCsv(await file.text());
      if (!/\.xlsx$/i.test(file.name)) throw new Error("仅支持 .xlsx 或 .csv 文件");
      await ensureFflateLoaded();
      return creatorXlsxMatrix(await file.arrayBuffer());
    }

    function normalizedCreatorImportDate(value) {
      const text = String(value || "").trim();
      if (!text) return today;
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(text)) {
        const [year, month, day] = text.split(/[-/]/).map(Number);
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
      if (/^\d+(?:\.\d+)?$/.test(text)) {
        const excelEpoch = Date.UTC(1899, 11, 30);
        return localDateValue(new Date(excelEpoch + Number(text) * 86400000));
      }
      const parsed = new Date(text);
      return Number.isFinite(parsed.getTime()) ? localDateValue(parsed) : today;
    }

    function normalizedCreatorImportRate(value) {
      const text = String(value || "").trim();
      if (!text) return 0;
      const numeric = Number(text.replace("%", ""));
      if (!Number.isFinite(numeric)) return 0;
      return text.includes("%") || numeric > 1 ? numeric / 100 : numeric;
    }

    function creatorImportSamples(value) {
      return String(value || "")
        .split(/[;；\n]+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [sku, color, size, qty, status] = line.split("|").map((part) => part.trim());
          return { sku: sku || "-", color: color || "-", size: size || "-", qty: Math.max(0, Number(qty || 0)), status: status || "-" };
        });
    }

    function creatorImportIdentityKeys(record) {
      const handle = String(record.creatorHandle || "").trim().toLowerCase().replace(/^@/, "");
      const contact = String(record.contact || "").trim().toLowerCase();
      const name = String(record.name || "").trim().toLowerCase();
      const keys = [];
      if (handle) keys.push(`id:${handle}`);
      if (contact) keys.push(`contact:${contact}`);
      if (!handle && !contact && name) keys.push(`name:${name}`);
      return keys;
    }

    function normalizeCreatorImportRows(matrix) {
      const headerIndex = matrix.findIndex((row) => row.some((value) => normalizedCreatorImportHeader(value) === "达人昵称"));
      if (headerIndex < 0) throw new Error("未找到“达人昵称”表头，请使用工作台模板");
      const headers = matrix[headerIndex].map((value) => creatorImportHeaderMap.get(normalizedCreatorImportHeader(value)) || "");
      if (!headers.includes("name")) throw new Error("模板缺少达人昵称字段");
      const knownStores = new Set(["DreamWeave", "sweet dream", "Dreamland", "Dreamdaily", "MoonDream", "Himood Smile"]);
      const importPage = document.getElementById("creators")?.dataset.creatorPage || "blanket";
      const defaultSource = importPage === "blanket" ? "毛毯项目" : "达人库";
      const existingKeys = new Set(creatorRecords().flatMap(creatorImportIdentityKeys));
      const batchKeys = new Set();
      return matrix.slice(headerIndex + 1).map((row, rowOffset) => {
        const source = {};
        headers.forEach((key, index) => {
          if (key) source[key] = row[index] ?? "";
        });
        const hasContent = Object.values(source).some((value) => String(value || "").trim());
        if (!hasContent) return null;
        const creatorHandle = String(source.creatorHandle || "").trim();
        const name = String(source.name || "").trim();
        const projectSource = String(source.source || defaultSource).trim();
        const record = {
          id: crypto.randomUUID(),
          source: projectSource === "毛毯项目" ? "毛毯项目" : projectSource === "历史达人" ? "历史达人" : "平台新增",
          tier: String(source.tier || "普通达人").trim(),
          avatar: "",
          name,
          creatorHandle,
          contact: String(source.contact || creatorHandle || "").trim(),
          email: "",
          period: normalizedCreatorImportDate(source.period),
          videoStatus: String(source.videoStatus || "待确认").trim(),
          liveStatus: String(source.videoStatus || "").includes("直播") ? "直播" : "",
          product: String(source.product || "").trim(),
          shop: String(source.shop || "").trim(),
          levelTag: String(source.levelTag || "").trim(),
          categoryTag: String(source.categoryTag || "").trim(),
          products: String(source.product || "").split(/[\/,，、]+/).map((item) => item.trim()).filter(Boolean),
          samples: creatorImportSamples(source.sampleDetails),
          gmvK: Math.max(0, Number(source.gmvK || 0)),
          commission: normalizedCreatorImportRate(source.commission),
          adCommission: normalizedCreatorImportRate(source.adCommission),
          relationship: String(source.relationship || "").trim(),
          note: ""
        };
        const reasons = [];
        if (!name) reasons.push("缺少达人昵称");
        if (record.shop && !knownStores.has(record.shop)) reasons.push("店铺名称不在六店范围");
        if (record.commission < 0 || record.commission > 1) reasons.push("合作佣金需在0%至100%之间");
        if (record.adCommission < 0 || record.adCommission > 1) reasons.push("广告佣金需在0%至100%之间");
        const keys = creatorImportIdentityKeys(record);
        if (keys.some((key) => existingKeys.has(key))) reasons.push("达人库已存在");
        else if (keys.some((key) => batchKeys.has(key))) reasons.push("文件内重复");
        if (!reasons.length) keys.forEach((key) => batchKeys.add(key));
        return {
          rowNumber: headerIndex + rowOffset + 2,
          record,
          followStatus: String(source.followStatus || "待跟进").trim(),
          owner: String(source.owner || "").trim(),
          valid: !reasons.length,
          reason: reasons.join("、") || "可导入"
        };
      }).filter(Boolean);
    }

    function renderCreatorImportPreview(rows, fileName = "") {
      const valid = rows.filter((item) => item.valid);
      const skipped = rows.length - valid.length;
      document.getElementById("creatorImportTitle").textContent = fileName ? `导入预览 · ${fileName}` : "Excel 导入预览";
      document.getElementById("creatorImportSummary").innerHTML = [
        [rows.length, "读取记录"],
        [valid.length, "可安全导入"],
        [skipped, "重复或需修正"]
      ].map(([value, label]) => `<div class="creator-import-stat"><b>${num(value)}</b><span>${label}</span></div>`).join("");
      document.getElementById("creatorImportPreview").innerHTML = rows.length ? `
        <table>
          <thead><tr><th>Excel行</th><th>达人</th><th>达人产品 / SKU</th><th>来源 / 标签</th><th>店铺</th><th>负责人</th><th>校验结果</th></tr></thead>
          <tbody>${rows.map(({ rowNumber, record, owner, valid: isValid, reason }) => `
            <tr>
              <td>${rowNumber}</td>
              <td><b>${escapeHtml(record.name || "未填写")}</b><br><small>${escapeHtml(record.creatorHandle || record.contact || "-")}</small></td>
              <td><b>${escapeHtml(record.product || "未填写")}</b><br><small>${escapeHtml((record.samples || []).map((item) => item.sku).filter((sku) => sku && sku !== "-").join("、") || "无规格明细")}</small></td>
              <td>${escapeHtml(record.source)}<br><small>${escapeHtml([record.tier, record.levelTag, record.categoryTag].filter(Boolean).join(" · ") || "-")}</small></td>
              <td>${escapeHtml(record.shop || "-")}</td>
              <td>${escapeHtml(owner || "-")}</td>
              <td><span class="creator-import-result ${isValid ? "" : "skip"}">${escapeHtml(reason)}</span></td>
            </tr>
          `).join("")}</tbody>
        </table>
      ` : `<div class="empty">模板内没有可读取的达人记录。</div>`;
      document.getElementById("confirmCreatorImport").disabled = !valid.length;
    }

    function closeCreatorImportPreview() {
      document.getElementById("creatorImportModal").hidden = true;
      document.getElementById("creatorExcelFile").value = "";
      pendingCreatorImportRows = [];
    }

    async function previewCreatorImport(file) {
      try {
        const matrix = await readCreatorImportMatrix(file);
        pendingCreatorImportRows = normalizeCreatorImportRows(matrix);
        renderCreatorImportPreview(pendingCreatorImportRows, file.name);
        document.getElementById("creatorImportModal").hidden = false;
      } catch (error) {
        console.warn("Creator Excel import failed", error);
        showToast(error.message || "Excel读取失败，请使用工作台模板");
        document.getElementById("creatorExcelFile").value = "";
      }
    }

    function confirmCreatorImport() {
      const rows = pendingCreatorImportRows.filter((item) => item.valid);
      if (!rows.length) return;
      const returnPage = document.getElementById("creators")?.dataset.creatorPage || "blanket";
      state.customCreators ||= [];
      state.creatorEdits ||= {};
      rows.forEach(({ record, followStatus, owner }) => {
        state.customCreators.push(record);
        state.creatorEdits[record.id] = {
          tier: record.tier,
          product: record.product,
          shop: record.shop,
          levelTag: record.levelTag,
          categoryTag: record.categoryTag,
          samples: record.samples,
          videoStatus: record.videoStatus,
          liveStatus: record.liveStatus,
          gmvK: record.gmvK,
          commission: record.commission,
          adCommission: record.adCommission,
          relationship: record.relationship,
          followStatus: followStatus || "待跟进",
          owner,
          followNote: "Excel批量导入"
        };
        appendCreatorHistory(record, { ...record, followStatus, owner }, "Excel批量导入");
      });
      saveState();
      closeCreatorImportPreview();
      setCreatorPage(returnPage);
      renderCreatorCenter();
      const blanketCount = rows.filter(({ record }) => record.source === "毛毯项目").length;
      const headCount = rows.filter(({ record }) => record.tier === "头达" || record.levelTag === "头达").length;
      showToast(`已导入 ${rows.length} 位达人（毛毯 ${blanketCount}、头达 ${headCount}），重复记录未覆盖`);
    }

    function sampleSummary(record) {
      const items = sampleItemsFor(record);
      const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const preview = items.slice(0, 3)
        .map((item) => `${item.color || "-"} ${item.size || "-"}×${Number(item.qty || 0)}`)
        .join("、");
      return `
        <button class="sample-summary-btn" type="button" data-sample-detail="${escapeHtml(record.id)}" title="查看完整寄样明细">
          <span class="sample-summary-main">${escapeHtml(preview)}</span>
          ${items.length > 3 ? `<span class="sample-summary-meta">共 ${items.length} 个规格 / ${totalQty} 件 · 点击查看</span>` : ""}
        </button>
      `;
    }

    function renderCreatorCenter() {
      const records = creatorRecords().map(creatorDisplayRecord);
      const blanketRecords = blanketProjectCreators();
      const meta = window.IMPORTED_CREATOR_DATA || {};
      const importedCount = window.IMPORTED_CREATOR_DATA?.records?.length || 0;
      const customCount = state.customCreators?.length || 0;
      const query = (document.getElementById("creatorSearch")?.value || "").trim().toLowerCase();
      const uniqueNames = new Set(records.map((item) => item.name).filter(Boolean));
      const selectedHeadLevel = document.getElementById("headLevelFilter")?.value || "";
      const selectedHeadCategory = document.getElementById("headCategoryFilter")?.value || "";
      const headRemovedIds = new Set((state.headRemovedCreators || []).map((item) => item.id));
      const headCreators = records.filter((item) => (item.tier === "头达" || item.levelTag === "头达")
        && !headRemovedIds.has(item.id)
        && (!selectedHeadLevel || item.levelTag === selectedHeadLevel)
        && (!selectedHeadCategory || item.categoryTag === selectedHeadCategory));
      const posted = records.filter(hasVideo).length;
      const live = records.filter(hasLive).length;
      const gmvK = headCreators.reduce((sum, item) => sum + Number(item.gmvK || 0), 0);
      const productCounts = records.reduce((acc, item) => {
        (item.products?.length ? item.products : [item.product]).forEach((product) => {
          if (!product) return;
          acc[product] = (acc[product] || 0) + 1;
        });
        return acc;
      }, {});
      const topProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const maxProduct = Math.max(1, ...topProducts.map(([, count]) => count));
      const selectedCreatorLevel = document.getElementById("creatorLevelFilter")?.value || "";
      const selectedCreatorCategory = document.getElementById("creatorCategoryFilter")?.value || "";
      const filtered = records.filter((item) => {
        const edit = creatorEditFor(item.id);
        const text = [item.source, item.tier, item.name, item.product, item.shop, item.videoStatus, item.liveStatus, item.relationship, item.note, edit.followStatus, edit.owner, edit.followNote, ...creatorTagsFor(item)].join(" ").toLowerCase();
        return (!query || text.includes(query))
          && (!selectedCreatorLevel || item.levelTag === selectedCreatorLevel)
          && (!selectedCreatorCategory || item.categoryTag === selectedCreatorCategory);
      });
      const totalCreatorPages = Math.max(1, Math.ceil(filtered.length / creatorPageSize));
      creatorPage = Math.min(Math.max(1, creatorPage), totalCreatorPages);
      const pageStart = (creatorPage - 1) * creatorPageSize;
      const pageRows = filtered.slice(pageStart, pageStart + creatorPageSize);

      const blanketDataStatus = document.getElementById("blanketDataStatus");
      if (blanketDataStatus) {
        blanketDataStatus.textContent = blanketRecords.length
          ? `团队云端 · ${blanketRecords.length} 位项目达人`
          : "暂无项目达人 · 可手工或Excel导入";
      }

      document.getElementById("creatorImportMeta").textContent = `迁移${importedCount}条 · 平台新增${customCount}条`;
      document.getElementById("creatorMetrics").innerHTML = [
        ["登记记录", num(records.length), `${uniqueNames.size} 位去重达人`, "up"],
        ["已发视频/内容", num(posted), `占比 ${records.length ? pct(posted / records.length * 100) : "-"}`, "up"],
        ["直播相关", num(live), "含直播、AM/PM或直播主", "warn"],
        ["头达近7日GMV", `$${gmvK.toFixed(1)}K`, `${headCreators.length} 位头达`, "up"]
      ].map(metricHtml).join("");

      document.getElementById("creatorProductBars").innerHTML = topProducts.length ? topProducts.map(([product, count]) => `
        <div class="bar-row">
          <span>${escapeHtml(product)}</span>
          <div class="bar-track"><i style="--value:${Math.max(6, count / maxProduct * 100)}%"></i></div>
          <b>${count}</b>
        </div>
      `).join("") : `<div class="empty">暂无产品数据。</div>`;

      const topHead = [...headCreators].sort((a, b) => Number(b.gmvK || 0) - Number(a.gmvK || 0))[0];
      const noVideo = records.filter((item) => item.tier !== "头达" && !hasVideo(item)).length;
      const noGmvHead = headCreators.filter((item) => Number(item.gmvK || 0) <= 0).length;
      const actionItems = [
        { level: "green", title: "优先维护高产头达", detail: topHead ? `${topHead.name} 近7日GMV ${topHead.gmvK}K，主带 ${topHead.product || "-"}` : "暂无头达GMV数据。" },
        { level: "amber", title: "补齐内容回传", detail: `${noVideo} 条登记记录未看到明确发视频/直播状态，建议补充内容链接或发布时间。` },
        { level: "red", title: "盘活低产头达", detail: `${noGmvHead} 位头达近7日GMV为0或未记录，建议按关系状态分为维护、重谈、放弃。` },
        { level: "green", title: "产品集中度", detail: topProducts[0] ? `${topProducts[0][0]} 覆盖 ${topProducts[0][1]} 位达人，可作为当前达人素材优先复盘产品。` : "暂无产品覆盖数据。" }
      ];
      document.getElementById("creatorActionList").innerHTML = actionItems.map((item) => `
        <div class="item">
          <span class="dot ${item.level}"></span>
          <div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.detail)}</small></div>
        </div>
      `).join("");

      const blanketStatusClass = (status) => ({
        "待跟进": "status-pending",
        "待确认寄样": "status-pending",
        "维护中": "status-active",
        "已寄样": "status-sampled",
        "已出内容": "status-content",
        "已出单": "status-success",
        "暂停": "status-paused",
        "放弃": "status-abandoned"
      }[status] || "status-pending");

      const blanketView = blanketRecords.map((item) => {
        const edit = state.creatorEdits?.[item.id] || {};
        const followStatus = edit.followStatus || item.followStatus || "待跟进";
        const relationship = `${item.relationship || ""} ${edit.followNote || ""}`;
        const risk = ["暂停", "放弃"].includes(followStatus) || /风险|异常|失联|未回复|延期/.test(relationship);
        return { item, edit, followStatus, risk };
      });
      const blanketCounts = {
        all: blanketView.length,
        pending: blanketView.filter(({ followStatus }) => ["待跟进", "待确认寄样"].includes(followStatus)).length,
        sampled: blanketView.filter(({ followStatus }) => followStatus === "已寄样").length,
        content: blanketView.filter(({ followStatus }) => followStatus === "已出内容").length,
        success: blanketView.filter(({ followStatus }) => followStatus === "已出单").length,
        risk: blanketView.filter(({ risk }) => risk).length
      };
      const blanketMetrics = [
        ["all", "达人总数"],
        ["pending", "待推进"],
        ["sampled", "已寄样"],
        ["content", "已出内容"],
        ["success", "已出单"],
        ["risk", "风险达人"]
      ];
      document.getElementById("blanketOverviewMetrics").innerHTML = blanketMetrics.map(([key, label]) => `
        <button class="blanket-metric ${blanketCreatorFilter === key ? "active" : ""}" type="button" data-blanket-summary-filter="${key}">
          <span>${label}</span><strong>${blanketCounts[key]}</strong>
        </button>
      `).join("");
      const followupItems = blanketView
        .filter(({ followStatus, risk }) => risk || ["待跟进", "待确认寄样"].includes(followStatus))
        .sort((a, b) => Number(b.risk) - Number(a.risk))
        .slice(0, 5);
      document.getElementById("blanketFollowupList").innerHTML = followupItems.length ? followupItems.map(({ item, followStatus, risk }) => `
        <button class="blanket-alert ${risk ? "risk" : ""}" type="button" data-edit-creator="${escapeHtml(item.id)}">
          <span>${escapeHtml(item.name || "未命名达人")} · ${escapeHtml(followStatus)}</span>
          <b>${escapeHtml(item.owner || "未分配")}</b>
        </button>
      `).join("") : `<div class="empty">暂无待推进或风险事项。</div>`;

      document.getElementById("blanketCreatorRows").innerHTML = blanketRecords.map((item) => {
        const edit = state.creatorEdits?.[item.id] || {};
        const followStatus = edit.followStatus || item.followStatus || "待跟进";
        const owner = edit.owner || item.owner || "-";
        const tags = [
          item.name,
          item.tier,
          item.videoStatus,
          item.contact,
          item.product,
          item.shop,
          ...creatorTagsFor(item),
          owner,
          followStatus,
          followStatus.includes("寄样") ? "sampled" : ""
        ].join(" ").toLowerCase();
        const followOptions = ["待跟进", "待确认寄样", "维护中", "已寄样", "已出内容", "已出单", "暂停", "放弃"];
        const relationshipText = `${item.relationship || ""} ${edit.followNote || ""}`;
        const risk = ["暂停", "放弃"].includes(followStatus) || /风险|异常|失联|未回复|延期/.test(relationshipText);
        const filterKey = ["待跟进", "待确认寄样"].includes(followStatus) ? "pending"
          : followStatus === "已寄样" ? "sampled"
          : followStatus === "已出内容" ? "content"
          : followStatus === "已出单" ? "success"
          : "";
        return `
          <tr class="blanket-record" data-row-edit="${escapeHtml(item.id)}" data-blanket-filter-key="${filterKey}" data-blanket-risk="${risk ? "true" : "false"}" data-blanket-tags="${escapeHtml(tags)}">
            <td>
              <div class="creator-profile">
                ${creatorAvatar(item, true)}
                <span>
                  <b>${escapeHtml(item.name || "-")}</b>
                  <small>${escapeHtml(item.source || "-")} · ${escapeHtml(item.tier || "-")}</small>
                  <small class="creator-contact">${escapeHtml(item.contact || "-")}</small>
                  ${creatorTagSummary(item)}
                </span>
              </div>
            </td>
            <td>${statusBadge(item.videoStatus || item.liveStatus)}</td>
            <td>${sampleSummary(item)}</td>
            <td>${escapeHtml(item.shop || "-")}</td>
            <td>${item.commission ? pct(item.commission * 100) : "-"}</td>
            <td>${item.adCommission ? pct(item.adCommission * 100) : "-"}</td>
            <td><span class="creator-row-note">${escapeHtml(item.relationship || "-")}</span></td>
            <td>
              <select class="blanket-status-select ${blanketStatusClass(followStatus)}" data-blanket-status="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name || "达人")}跟进状态">
                ${followOptions.map((option) => `<option ${option === followStatus ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
              </select>
            </td>
            <td>${escapeHtml(owner)}</td>
            <td>${escapeHtml(item.period || "-")}</td>
            <td>${creatorActionButton(item, "blanket")}</td>
          </tr>
        `;
      }).join("");

      document.getElementById("headCreatorCount").textContent = `${headCreators.length} 位头达`;
      const headFollowups = headCreators.map((item) => ({ item, edit: creatorEditFor(item.id) }));
      const activeHeadFollowups = headFollowups.filter(({ edit }) => !["放弃", "暂停"].includes(edit.followStatus));
      const pendingHead = activeHeadFollowups.filter(({ edit }) => ["待跟进", "待确认寄样"].includes(edit.followStatus)).length;
      const sampledHead = activeHeadFollowups.filter(({ edit }) => edit.followStatus === "已寄样").length;
      const maintainingHead = activeHeadFollowups.filter(({ edit }) => ["维护中", "已寄样", "已出内容", "已出单"].includes(edit.followStatus)).length;
      const unassignedHead = activeHeadFollowups.filter(({ edit }) => !edit.owner).length;
      document.getElementById("headFollowupMetrics").innerHTML = [
        ["待推进", num(pendingHead), pendingHead ? "优先确认合作或寄样" : "暂无待推进", pendingHead ? "warn" : "up"],
        ["已寄样", num(sampledHead), "等待内容或反馈", "up"],
        ["维护合作中", num(maintainingHead), "含寄样、内容与出单", "up"],
        ["未分配负责人", num(unassignedHead), unassignedHead ? "需要明确归属" : "均已分配", unassignedHead ? "warn" : "up"]
      ].map(metricHtml).join("");
      const headQueue = [...activeHeadFollowups]
        .sort((a, b) => Number(!a.edit.owner) - Number(!b.edit.owner))
        .slice(0, 6);
      document.getElementById("headFollowupQueue").innerHTML = headQueue.length ? headQueue.map(({ item, edit }) => {
        return `
          <div class="item">
            <span class="dot ${["待跟进", "待确认寄样"].includes(edit.followStatus) ? "amber" : "green"}"></span>
            <div>
              <b>${escapeHtml(item.name || "未命名达人")} · ${escapeHtml(edit.followStatus || "待跟进")}</b>
              <small>${escapeHtml(edit.owner || "未分配负责人")}｜店铺 ${escapeHtml(item.shop || "未设置")}｜近7日GMV ${Number(item.gmvK || 0).toFixed(1)}K</small>
            </div>
            ${creatorActionButton(item)}
          </div>
        `;
      }).join("") : `<div class="empty">暂无需要处理的头达跟进事项。</div>`;
      document.getElementById("headCreatorRows").innerHTML = headCreators.length ? [...headCreators]
        .sort((a, b) => Number(b.gmvK || 0) - Number(a.gmvK || 0))
        .map((item) => {
          const edit = creatorEditFor(item.id);
          return `
          <tr data-row-edit="${escapeHtml(item.id)}">
            <td>${creatorProfile(item, true)}<small>${escapeHtml(item.contact || "-")}</small></td>
            <td>${statusBadge(item.videoStatus || item.liveStatus, Number(item.gmvK || 0) > 0 ? "hot" : "")}</td>
            <td>${escapeHtml(item.product || "-")}</td>
            <td>${escapeHtml(item.shop || "-")}</td>
            <td><b>${Number(item.gmvK || 0).toFixed(1)}</b></td>
            <td>${item.commission ? pct(item.commission * 100) : "-"}</td>
            <td>${item.adCommission ? pct(item.adCommission * 100) : "-"}</td>
            <td><span class="creator-row-note">${escapeHtml(item.relationship || item.note || "-")}</span></td>
            <td>${statusBadge(edit.followStatus, edit.followStatus === "放弃" || edit.followStatus === "暂停" ? "warn" : edit.followStatus === "已出单" ? "hot" : "good")}</td>
            <td>${escapeHtml(edit.owner || "-")}</td>
            <td>${escapeHtml(item.period || "-")}</td>
            <td>${creatorActionButton(item, "head")}</td>
          </tr>
        `;
        }).join("") : `<tr><td colspan="12"><div class="empty">暂无头达数据。</div></td></tr>`;

      document.getElementById("creatorRowCount").textContent = `${filtered.length}/${records.length} 条记录`;
      document.getElementById("creatorPageInfo").textContent = `第 ${creatorPage} / ${totalCreatorPages} 页 · 每页10条`;
      document.getElementById("creatorPrevPage").disabled = creatorPage <= 1;
      document.getElementById("creatorNextPage").disabled = creatorPage >= totalCreatorPages;
      document.getElementById("creatorRows").innerHTML = pageRows.length ? pageRows.map((item) => {
        const edit = creatorEditFor(item.id);
        return `
        <tr data-row-edit="${escapeHtml(item.id)}">
          <td>${escapeHtml(item.source || "-")}<br><small>${escapeHtml(item.tier || "-")}</small></td>
          <td>${creatorProfile(item)}</td>
          <td>${escapeHtml(item.contact || item.email || "-")}</td>
          <td>${escapeHtml(item.period || "-")}</td>
          <td>${statusBadge(item.videoStatus)}</td>
          <td>${statusBadge(item.liveStatus)}</td>
          <td>${escapeHtml(item.product || "-")}</td>
          <td>${escapeHtml(item.shop || "-")}</td>
          <td>${statusBadge(edit.followStatus, edit.followStatus === "放弃" || edit.followStatus === "暂停" ? "warn" : edit.followStatus === "已出单" ? "hot" : "good")}</td>
          <td>${escapeHtml(edit.owner || "-")}</td>
          <td>${creatorActionButton(item)}</td>
        </tr>
      `;
      }).join("") : `<tr><td colspan="11"><div class="empty">没有匹配的达人记录。</div></td></tr>`;
    }

    function findCreator(id) {
      const record = creatorRecords().find((item) => item.id === id)
        || blanketProjectCreators().find((item) => item.id === id);
      return record ? creatorDisplayRecord(record) : null;
    }

    function fillCreatorEditForm(record) {
      const edit = creatorEditFor(record.id);
      const savedEdit = state.creatorEdits?.[record.id] || {};
      const form = document.getElementById("creatorEditForm");
      form.elements.id.value = record.id;
      form.elements.avatar.value = record.avatar || "";
      form.elements.name.value = record.name || "";
      form.elements.contact.value = record.contact || record.email || "";
      form.elements.source.value = record.source || "";
      form.elements.tier.value = record.tier || "";
      form.elements.period.value = record.period || "";
      form.elements.product.value = record.product || "";
      form.elements.shop.value = record.shop || "";
      form.elements.levelTag.value = record.levelTag || "";
      form.elements.categoryTag.value = record.categoryTag || "";
      form.elements.sampleDetails.value = serializeSampleItems(record);
      form.elements.videoStatus.value = record.videoStatus || "";
      form.elements.gmvK.value = record.gmvK || 0;
      form.elements.commission.value = record.commission || 0;
      form.elements.adCommission.value = record.adCommission || 0;
      form.elements.followStatus.value = savedEdit.followStatus || record.followStatus || edit.followStatus || "待跟进";
      form.elements.owner.value = savedEdit.owner || record.owner || "";
      form.elements.relationship.value = record.relationship || record.note || "";
      form.elements.followNote.value = edit.followNote || "";
      form.elements.avatarFile.value = "";
      setAvatarPreview("creatorEditAvatarPreview", record.avatar || "", record.name || "");
      document.getElementById("creatorModalTitle").textContent = record.name || "编辑达人";
      document.getElementById("deleteCustomCreator").style.display = document.getElementById("creators")?.dataset.creatorPage === "all" ? "none" : "";
    }

    function openCreatorEditor(id) {
      const record = findCreator(id);
      if (!record) return;
      fillCreatorEditForm(record);
      document.getElementById("creatorModal").hidden = false;
    }

    function closeCreatorEditor() {
      document.getElementById("creatorModal").hidden = true;
    }

    function openCreatorHistory(id) {
      const record = findCreator(id);
      if (!record) return;
      const history = creatorHistoryFor(id);
      const latestEdit = state.creatorEdits?.[id] || {};
      const latestSavedAt = history[0]?.savedAt || record.period || "";
      document.getElementById("creatorHistoryTitle").textContent = `${record.name || "达人"} · 历史记录`;
      document.getElementById("creatorHistoryContent").innerHTML = `
        <div class="history-summary">
          ${creatorAvatar(record)}
          <div>
            <b>${escapeHtml(record.name || "-")}</b>
            <small>寄样产品：${escapeHtml(record.product || "-")}<br>近7日GMV：${Number(record.gmvK || 0).toFixed(1)}K · 合作情况：${escapeHtml(record.relationship || record.note || "-")}</small>
          </div>
        </div>
        <div class="history-list">
          <div class="history-item latest">
            <b>最新记录 · ${latestSavedAt ? formatDateTime(latestSavedAt) : "当前资料"}</b>
            <small>状态：${escapeHtml(latestEdit.followStatus || record.followStatus || "待跟进")} · 负责人：${escapeHtml(latestEdit.owner || record.owner || "-")} · 店铺：${escapeHtml(record.shop || "-")}</small>
            <p>${escapeHtml(record.relationship || record.note || "暂无合作情况")}</p>
            <p>${escapeHtml(latestEdit.followNote || "暂无跟进备注")}</p>
          </div>
          ${history.length ? history.map((item) => `
            <div class="history-item">
              <b>${escapeHtml(item.action || "编辑")} · ${formatDateTime(item.savedAt)}</b>
              <small>状态：${escapeHtml(item.followStatus || "-")} · 负责人：${escapeHtml(item.owner || "-")}</small>
              <p>${escapeHtml(item.relationship || "暂无合作情况")}</p>
              <p>${escapeHtml(item.followNote || "暂无跟进备注")}</p>
            </div>
          `).join("") : `<div class="empty">暂无历史编辑记录。之后每次保存整行都会自动沉淀。</div>`}
        </div>
      `;
      document.getElementById("creatorHistoryModal").hidden = false;
    }

    function closeCreatorHistory() {
      document.getElementById("creatorHistoryModal").hidden = true;
    }

    function openCreatorSampleDetail(id) {
      const record = findCreator(id);
      if (!record) return;
      const items = sampleItemsFor(record);
      const totalQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      document.getElementById("creatorSampleTitle").textContent = `${record.name || "达人"} · 寄样明细`;
      document.getElementById("creatorSampleContent").innerHTML = `
        <div class="sample-detail-summary">
          <div><b>${escapeHtml(record.name || "-")}</b><br><small>${escapeHtml(record.contact || "-")}</small></div>
          <b>共 ${items.length} 个规格 / ${totalQty} 件</b>
        </div>
        <div class="table-wrap">
          <table class="sample-detail-table">
            <thead><tr><th>SKU</th><th>颜色</th><th>尺寸</th><th>数量</th><th>寄样状态</th></tr></thead>
            <tbody>${items.map((item) => `
              <tr>
                <td>${escapeHtml(item.sku || "-")}</td>
                <td>${escapeHtml(item.color || "-")}</td>
                <td>${escapeHtml(item.size || "-")}</td>
                <td>${Number(item.qty || 0)} 件</td>
                <td>${escapeHtml(item.status || "-")}</td>
              </tr>
            `).join("")}</tbody>
          </table>
        </div>
      `;
      document.getElementById("creatorSampleModal").hidden = false;
    }

    function closeCreatorSampleDetail() {
      document.getElementById("creatorSampleModal").hidden = true;
    }

    async function saveCreatorEdit(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const id = data.id;
      const record = findCreator(id);
      if (!record) return;
      const avatarFile = form.elements.avatarFile.files?.[0];
      const avatar = avatarFile ? await readImageAsDataUrl(avatarFile) : data.avatar || record.avatar || "";
      const nextRecord = {
        avatar,
        name: data.name,
        contact: data.contact,
        source: data.source,
        tier: data.tier,
        period: data.period,
        product: data.product,
        shop: data.shop || "",
        levelTag: data.levelTag || "",
        categoryTag: data.categoryTag || "",
        samples: parseSampleItems(data.sampleDetails),
        products: data.product ? data.product.split(/[\/,，、]+/).map((item) => item.trim()).filter(Boolean) : [],
        videoStatus: data.videoStatus,
        liveStatus: data.videoStatus?.includes("直播") ? "直播" : record.liveStatus || "",
        gmvK: Number(data.gmvK || 0),
        commission: Number(data.commission || 0),
        adCommission: Number(data.adCommission || 0),
        relationship: data.relationship
      };
      const customRecord = state.customCreators?.find((item) => item.id === id);
      if (customRecord) {
        Object.assign(customRecord, nextRecord);
      }
      state.creatorEdits ||= {};
      state.creatorEdits[id] = {
        avatar: nextRecord.avatar,
        name: nextRecord.name,
        contact: nextRecord.contact,
        source: nextRecord.source,
        tier: nextRecord.tier,
        period: nextRecord.period,
        product: nextRecord.product,
        shop: nextRecord.shop,
        levelTag: nextRecord.levelTag,
        categoryTag: nextRecord.categoryTag,
        samples: nextRecord.samples,
        videoStatus: nextRecord.videoStatus,
        liveStatus: nextRecord.liveStatus,
        gmvK: nextRecord.gmvK,
        commission: nextRecord.commission,
        adCommission: nextRecord.adCommission,
        relationship: nextRecord.relationship,
        followStatus: data.followStatus || "待跟进",
        owner: data.owner || "",
        followNote: data.followNote || ""
      };
      appendCreatorHistory({ ...record, id }, { ...data, avatar, gmvK: nextRecord.gmvK }, "保存整行");
      saveState();
      closeCreatorEditor();
      showToast("达人整行已保存");
      renderCreatorCenter();
    }

    function removeCreatorFromSection(id, context) {
      const record = findCreator(id);
      const targetName = context === "head" ? "头部达人栏目" : "毛毯项目";
      if (!record || !window.confirm(`确认将达人“${record.name || "未命名达人"}”移出${targetName}？达人主档仍保留在达人库。`)) return;
      const key = context === "head" ? "headRemovedCreators" : "blanketRemovedCreators";
      state[key] ||= [];
      if (!state[key].some((item) => item.id === id)) {
        state[key].push({ id, removedAt: new Date().toISOString(), name: record.name || "" });
      }
      saveState();
      closeCreatorEditor();
      renderCreatorCenter();
      filterBlanketCreatorPreview();
      showToast(`已移出${targetName}，达人库主档保留`);
    }

    function deleteCustomCreator() {
      const context = document.getElementById("creators")?.dataset.creatorPage || "blanket";
      if (context !== "all") removeCreatorFromSection(document.getElementById("creatorEditForm").elements.id.value, context);
    }

    async function saveCreator(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      const id = crypto.randomUUID();
      const avatarFile = form.elements.avatarFile.files?.[0];
      const avatar = avatarFile ? await readImageAsDataUrl(avatarFile) : "";
      const creatorPageName = document.getElementById("creators")?.dataset.creatorPage || "blanket";
      const record = {
        id,
        source: creatorPageName === "blanket" ? "毛毯项目" : "平台新增",
        tier: data.tier || "自建达人",
        avatar,
        name: data.name,
        contact: data.contact,
        email: "",
        period: today,
        videoStatus: data.videoStatus,
        liveStatus: data.videoStatus?.includes("直播") ? "直播" : "",
        product: data.product,
        shop: data.shop || "",
        levelTag: data.levelTag || "",
        categoryTag: data.categoryTag || "",
        products: data.product ? data.product.split(/[\/,，、]+/).map((item) => item.trim()).filter(Boolean) : [],
        gmvK: Number(data.gmvK || 0),
        commission: 0,
        adCommission: 0,
        relationship: data.relationship || "",
        note: data.followNote || ""
      };
      state.customCreators ||= [];
      state.customCreators.push(record);
      state.creatorEdits ||= {};
      state.creatorEdits[id] = {
        avatar,
        tier: record.tier,
        product: record.product,
        shop: record.shop,
        levelTag: record.levelTag,
        categoryTag: record.categoryTag,
        videoStatus: record.videoStatus,
        gmvK: record.gmvK,
        relationship: record.relationship,
        followStatus: data.followStatus || "待跟进",
        owner: data.owner || "",
        followNote: data.followNote || ""
      };
      appendCreatorHistory(record, { ...data, avatar, gmvK: record.gmvK }, "新增达人");
      saveState();
      form.reset();
      setAvatarPreview("creatorAvatarPreview", "", "");
      showToast("达人已新增");
      renderCreatorCenter();
    }
