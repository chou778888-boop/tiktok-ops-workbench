import assert from "node:assert/strict";
import { profitSyncDateRange, runProfitSyncBackfill } from "./backfill-profit-sync.mjs";

assert.deepEqual(
  profitSyncDateRange("2026-08-05", "2026-08-11"),
  ["2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10", "2026-08-11"]
);
assert.throws(() => profitSyncDateRange("2026-08-11", "2026-08-05"), /日期范围无效/);
assert.throws(() => profitSyncDateRange("2026-01-01", "2026-03-01"), /最多回填/);

const calls = [];
const results = await runProfitSyncBackfill({
  workbenchUrl: "https://tiktok-ops-workbench.pages.dev/",
  syncSecret: "scheduler-secret",
  dateFrom: "2026-08-05",
  dateTo: "2026-08-06",
  fetchImpl: async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ status: "synced", revision: calls.length + 10 }), {
      headers: { "content-type": "application/json" }
    });
  }
});
assert.deepEqual(results.map((item) => item.dateKey), ["2026-08-05", "2026-08-06"]);
assert.equal(calls[0].url, "https://tiktok-ops-workbench.pages.dev/api/profit-sync");
assert.equal(calls[0].init.headers.authorization, "Bearer scheduler-secret");
assert.deepEqual(JSON.parse(calls[1].init.body), { dateKey: "2026-08-06" });
assert.equal(JSON.stringify(results).includes("scheduler-secret"), false, "回填结果不得泄漏同步密钥");

await assert.rejects(
  runProfitSyncBackfill({
    workbenchUrl: "http://example.com",
    syncSecret: "secret",
    dateFrom: "2026-08-05",
    dateTo: "2026-08-05"
  }),
  /HTTPS/
);

console.log(JSON.stringify({ passed: 10, phase: "profit-sync-backfill" }));
