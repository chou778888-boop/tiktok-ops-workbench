    async function requestProfitAutomaticSync({ dateKey, fetchImpl = fetch } = {}) {
      const response = await fetchImpl("/api/profit-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dateKey ? { dateKey } : {})
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `利润数据同步失败（HTTP ${response.status}）`);
        error.code = payload.code || "PROFIT_SYNC_FAILED";
        error.retryable = Boolean(payload.retryable);
        throw error;
      }
      return payload;
    }
