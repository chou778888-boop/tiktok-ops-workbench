(() => {
  window.__workbenchBootBound = true;
  window.__workbenchEnterRequested = false;
  window.__workbenchUser = null;
  const performanceStoreKey = "tiktok_ops_boot_performance_v1";
  const bootStartedAt = performance.now();
  window.__workbenchPerformance = {
    release: "__WORKBENCH_RELEASE__",
    platform: /Windows/i.test(navigator.userAgent) ? "Windows" : /Mac/i.test(navigator.userAgent) ? "macOS" : "Other",
    bootStartedAt,
    bootstrapStartedAt: null,
    bootstrapResponseAt: null,
    bootstrapParsedAt: null,
    scriptReadyAt: null,
    firstViewReadyAt: null
  };

  const form = document.getElementById("entryLoginForm");
  const button = document.getElementById("enterWorkbench");
  const error = document.getElementById("entryLoginError");
  const mainScript = document.getElementById("workbenchMain");
  let mainLoadPromise = null;

  function setLoginBusy(busy, text = "正在验证…") {
    if (!button) return;
    button.disabled = busy;
    button.innerHTML = busy ? text : '进入经营中枢 <span>↗</span>';
  }

  function showLoginError(message) {
    if (!error) return;
    error.textContent = message || "登录失败，请稍后重试";
    error.hidden = false;
  }

  async function saveBrowserCredential(username, password, rememberCredentials) {
    if (!rememberCredentials || !window.PasswordCredential || !navigator.credentials?.store) return;
    try {
      await navigator.credentials.store(new PasswordCredential({ id: username, password, name: username }));
    } catch {
      // 浏览器可能禁用密码管理器；30天登录会话仍然有效。
    }
  }

  function loadWorkbenchMain() {
    if (window.__workbenchMainReady) return Promise.resolve();
    if (mainLoadPromise) return mainLoadPromise;
    mainLoadPromise = new Promise((resolve, reject) => {
      if (!mainScript?.dataset.src) return reject(new Error("工作台资源配置缺失"));
      mainScript.addEventListener("load", () => {
        window.__workbenchPerformance.scriptReadyAt = performance.now();
        resolve();
      }, { once: true });
      mainScript.addEventListener("error", () => reject(new Error("工作台资源载入失败，请刷新重试")), { once: true });
      mainScript.src = mainScript.dataset.src;
    });
    return mainLoadPromise;
  }

  function revealWorkbenchShell() {
    window.__workbenchEnterRequested = true;
    document.body.classList.remove("cover-active");
    document.body.classList.add("workbench-entered");
    document.getElementById("workbenchApp")?.removeAttribute("inert");
    const syncStatus = document.getElementById("syncStatus");
    if (syncStatus && !window.__workbenchMainReady) {
      syncStatus.textContent = "正在载入团队数据";
      syncStatus.className = "sync-pill saving";
    }
    if (button) {
      button.disabled = false;
      button.innerHTML = '已进入经营中枢 <span>↗</span>';
    }
  }

  async function activateWorkbench(payload) {
    if (!payload?.user || !payload?.data) throw new Error("团队数据载入失败，请重试");
    window.__workbenchUser = payload.user;
    window.__workbenchInitialStatePromise = Promise.resolve(payload);
    revealWorkbenchShell();
    window.dispatchEvent(new CustomEvent("workbench-authenticated", { detail: payload.user }));
    await loadWorkbenchMain();
  }

  async function fetchBootstrap(fresh = false) {
    window.__workbenchPerformance.bootstrapStartedAt = performance.now();
    const response = await fetch(fresh ? "/api/bootstrap?fresh=1" : "/api/bootstrap", {
      cache: "no-store",
      headers: { accept: "application/json" }
    });
    window.__workbenchPerformance.bootstrapResponseAt = performance.now();
    window.__workbenchPerformance.serverTiming = response.headers.get("server-timing") || "";
    if (response.status === 401) return null;
    const payload = await response.json().catch(() => ({}));
    window.__workbenchPerformance.bootstrapParsedAt = performance.now();
    if (!response.ok) throw new Error(payload.error || "团队数据载入失败，请重试");
    return payload;
  }

  window.__workbenchMarkReady = () => {
    const metrics = window.__workbenchPerformance;
    if (!metrics || metrics.firstViewReadyAt) return;
    metrics.firstViewReadyAt = performance.now();
    const rounded = (end, start) => Math.max(0, Math.round((end || 0) - (start || 0)));
    const record = {
      at: new Date().toISOString(),
      release: metrics.release,
      platform: metrics.platform,
      totalMs: rounded(metrics.firstViewReadyAt, metrics.bootStartedAt),
      bootstrapMs: rounded(metrics.bootstrapResponseAt, metrics.bootstrapStartedAt),
      parseMs: rounded(metrics.bootstrapParsedAt, metrics.bootstrapResponseAt),
      scriptMs: rounded(metrics.scriptReadyAt, metrics.bootstrapParsedAt),
      firstViewMs: rounded(metrics.firstViewReadyAt, metrics.scriptReadyAt),
      serverTiming: metrics.serverTiming
    };
    try {
      const history = JSON.parse(localStorage.getItem(performanceStoreKey) || "[]");
      localStorage.setItem(performanceStoreKey, JSON.stringify([record, ...(Array.isArray(history) ? history : [])].slice(0, 10)));
    } catch {
      // 隐私模式可能禁用本地存储；不影响工作台进入。
    }
    const syncStatus = document.getElementById("syncStatus");
    if (syncStatus) syncStatus.title = `本次载入 ${Math.max(0.1, record.totalMs / 1000).toFixed(1)} 秒；接口等待 ${Math.max(0.1, record.bootstrapMs / 1000).toFixed(1)} 秒`;
    console.info("Workbench startup performance", record);
  };

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = String(form.elements.account?.value || "").trim();
    const password = String(form.elements.password?.value || "");
    const rememberCredentials = Boolean(form.elements.rememberCredentials?.checked);
    if (!username || !password) return showLoginError("请输入账号和密码");
    if (error) error.hidden = true;
    setLoginBusy(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ username, password, remember: rememberCredentials })
      });
      const loginPayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(loginPayload.error || "登录失败，请稍后重试");
      await saveBrowserCredential(username, password, rememberCredentials);
      setLoginBusy(true, "正在载入团队数据…");
      await activateWorkbench(await fetchBootstrap(true));
    } catch (loginError) {
      showLoginError(loginError.message);
      setLoginBusy(false);
    }
  });

  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const dateMetric = document.getElementById("entryCoverDate");
  if (dateMetric) dateMetric.innerHTML = `${date}<br />安全连接已准备`;

  fetchBootstrap().then((payload) => {
    if (payload) return activateWorkbench(payload);
  }).catch((bootstrapError) => {
    console.warn("Workbench bootstrap unavailable", bootstrapError);
  });
})();
