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

    async function requestTikTokShopAuthorization({ storeId, fetchImpl = fetch } = {}) {
      const response = await fetchImpl("/api/tiktok-shop/authorization/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storeId })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(payload.error || `TikTok 店铺授权启动失败（HTTP ${response.status}）`);
        error.code = payload.code || "TIKTOK_AUTH_START_FAILED";
        throw error;
      }
      let authorizationUrl;
      try {
        authorizationUrl = new URL(String(payload.authorizationUrl || ""));
      } catch {
        throw new Error("TikTok 授权地址异常，请联系管理员检查应用配置");
      }
      const allowedHosts = new Set([
        "services.us.tiktokshop.com",
        "services.tiktokshops.us",
        "services.tiktokshop.com"
      ]);
      if (authorizationUrl.protocol !== "https:" || !allowedHosts.has(authorizationUrl.hostname)) {
        throw new Error("TikTok 授权地址异常，请联系管理员检查应用配置");
      }
      return { authorizationUrl: authorizationUrl.toString() };
    }
