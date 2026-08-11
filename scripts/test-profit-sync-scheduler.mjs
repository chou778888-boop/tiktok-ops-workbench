import assert from "node:assert/strict";
import { triggerProfitSync } from "../workers/profit-sync-scheduler.js";

let receivedUrl = "";
let receivedOptions = null;
const result = await triggerProfitSync({
  workbenchUrl: "https://tiktok-ops-workbench.pages.dev/",
  syncSecret: "scheduler-secret",
  fetchImpl: async (url, options) => {
    receivedUrl = url;
    receivedOptions = options;
    return new Response(JSON.stringify({ status: "synced", revision: 12 }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }
});

assert.equal(receivedUrl, "https://tiktok-ops-workbench.pages.dev/api/profit-sync");
assert.equal(receivedOptions.method, "POST");
assert.equal(receivedOptions.headers.authorization, "Bearer scheduler-secret");
assert.equal(receivedOptions.headers["content-type"], "application/json");
assert.equal(receivedOptions.body, "{}");
assert.deepEqual(result, { status: "synced", revision: 12 });

await assert.rejects(
  triggerProfitSync({
    workbenchUrl: "https://tiktok-ops-workbench.pages.dev",
    syncSecret: "scheduler-secret",
    fetchImpl: async () => new Response(JSON.stringify({ error: "upstream failed" }), { status: 503 })
  }),
  (error) => error.code === "PROFIT_SYNC_TRIGGER_FAILED"
    && error.message.includes("503")
    && !error.message.includes("scheduler-secret"),
  "定时任务失败必须可重试且不得泄漏密钥"
);

await assert.rejects(
  triggerProfitSync({ workbenchUrl: "", syncSecret: "" }),
  (error) => error.code === "PROFIT_SYNC_SCHEDULER_UNCONFIGURED",
  "缺少云端地址或密钥时必须在发请求前失败"
);

console.log(JSON.stringify({ passed: 9, phase: "profit-sync-scheduler" }));
