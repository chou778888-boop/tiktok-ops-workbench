import { pathToFileURL } from "node:url";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateValue(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? date : null;
}

export function profitSyncDateRange(dateFrom, dateTo, maxDays = 31) {
  const start = dateValue(dateFrom);
  const end = dateValue(dateTo);
  if (!start || !end || start > end) throw new Error("回填日期范围无效");
  const count = Math.floor((end - start) / DAY_MS) + 1;
  if (count > maxDays) throw new Error(`单次最多回填 ${maxDays} 个经营日`);
  return Array.from({ length: count }, (_, index) => (
    new Date(start.getTime() + index * DAY_MS).toISOString().slice(0, 10)
  ));
}

export async function runProfitSyncBackfill({
  workbenchUrl,
  syncSecret,
  dateFrom,
  dateTo,
  fetchImpl = fetch
} = {}) {
  const baseUrl = String(workbenchUrl || "").trim().replace(/\/+$/, "");
  const secret = String(syncSecret || "");
  if (!baseUrl || !secret) throw new Error("后台回填缺少 WORKBENCH_URL 或 TK_SYNC_SECRET");
  const url = new URL("/api/profit-sync", baseUrl);
  if (url.protocol !== "https:") throw new Error("后台回填只允许 HTTPS 工作台地址");
  const results = [];
  for (const dateKey of profitSyncDateRange(dateFrom, dateTo)) {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ dateKey })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`${dateKey} 回填失败：${payload.error || `HTTP ${response.status}`}`);
      error.code = payload.code || "PROFIT_SYNC_BACKFILL_FAILED";
      error.dateKey = dateKey;
      throw error;
    }
    results.push({ dateKey, status: payload.status, revision: payload.revision });
  }
  return results;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const results = await runProfitSyncBackfill({
    workbenchUrl: process.env.WORKBENCH_URL || "https://tiktok-ops-workbench.pages.dev",
    syncSecret: process.env.TK_SYNC_SECRET,
    dateFrom: process.env.TK_BACKFILL_FROM,
    dateTo: process.env.TK_BACKFILL_TO
  });
  console.log(JSON.stringify({ status: "completed", dates: results }, null, 2));
}
