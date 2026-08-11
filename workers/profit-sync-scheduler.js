function schedulerError(message, code) {
  return Object.assign(new Error(message), { code });
}

export async function triggerProfitSync({ workbenchUrl, syncSecret, fetchImpl = fetch } = {}) {
  const baseUrl = String(workbenchUrl || "").trim().replace(/\/+$/, "");
  const secret = String(syncSecret || "");
  if (!baseUrl || !secret) {
    throw schedulerError("利润同步定时任务尚未配置", "PROFIT_SYNC_SCHEDULER_UNCONFIGURED");
  }
  const response = await fetchImpl(`${baseUrl}/api/profit-sync`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json"
    },
    body: "{}"
  });
  if (!response.ok) {
    throw schedulerError(`利润同步触发失败（HTTP ${response.status}）`, "PROFIT_SYNC_TRIGGER_FAILED");
  }
  return response.json();
}

export default {
  async scheduled(_event, env, context) {
    context.waitUntil(triggerProfitSync({
      workbenchUrl: env.WORKBENCH_URL,
      syncSecret: env.TK_SYNC_SECRET
    }));
  }
};
