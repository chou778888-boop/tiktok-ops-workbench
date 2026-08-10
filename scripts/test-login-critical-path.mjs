import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const bootSource = await readFile("src/app/boot.js", "utf8");
const fetchCalls = [];
const scriptListeners = {};
let submitLogin;
let resolveCredentialStore;
const performanceMarks = [0, 10, 20, 100, 300, 350, 450, 550];

const credentialStore = new Promise((resolve) => {
  resolveCredentialStore = resolve;
});

function response(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => "" },
    json: async () => body
  };
}

const form = {
  elements: {
    account: { value: "KK" },
    password: { value: "secret" },
    rememberCredentials: { checked: true }
  },
  addEventListener(type, handler) {
    if (type === "submit") submitLogin = handler;
  }
};
const button = { disabled: false, innerHTML: "" };
const loginError = { hidden: true, textContent: "" };
const mainScript = {
  dataset: { src: "workbench.js" },
  addEventListener(type, handler) {
    scriptListeners[type] = handler;
  },
  set src(value) {
    this._src = value;
    queueMicrotask(() => scriptListeners.load?.());
  }
};
const elements = {
  entryLoginForm: form,
  enterWorkbench: button,
  entryLoginError: loginError,
  workbenchMain: mainScript,
  workbenchApp: { removeAttribute() {} },
  syncStatus: { textContent: "", className: "", title: "" },
  entryCoverDate: { innerHTML: "" }
};

class PasswordCredential {
  constructor(data) {
    Object.assign(this, data);
  }
}

const context = {
  console: { info() {}, warn() {} },
  document: {
    body: { classList: { add() {}, remove() {} } },
    getElementById(id) {
      return elements[id] || null;
    }
  },
  fetch: async (url) => {
    fetchCalls.push(String(url));
    if (String(url) === "/api/auth/login") return response(200, {
      user: { id: "user-kk", name: "KK" },
      revision: 384,
      data: { tasks: [{ id: "task-1" }] }
    });
    if (String(url) === "/api/bootstrap?fresh=1") {
      return response(200, { user: { id: "user-kk", name: "KK" }, data: {} });
    }
    return response(401, { error: "请先登录" });
  },
  localStorage: { getItem: () => "[]", setItem() {} },
  navigator: {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    credentials: { store: () => credentialStore }
  },
  PasswordCredential,
  performance: { now: () => performanceMarks.shift() ?? 550 },
  CustomEvent: class {
    constructor(type, options) {
      this.type = type;
      this.detail = options?.detail;
    }
  },
  queueMicrotask,
  window: null
};
context.window = {
  PasswordCredential,
  dispatchEvent() {},
  __workbenchMainReady: false
};

vm.runInNewContext(bootSource, context, { filename: "src/app/boot.js" });
await new Promise((resolve) => setImmediate(resolve));
assert.equal(typeof submitLogin, "function", "登录提交行为必须完成绑定");
fetchCalls.length = 0;

const loginCompletion = submitLogin({ preventDefault() {} });
await new Promise((resolve) => setImmediate(resolve));
await loginCompletion;
const loginFinishedBeforeCredentialStore = fetchCalls.length > 0;
resolveCredentialStore();
context.window.__workbenchMarkReady();

assert.equal(
  loginFinishedBeforeCredentialStore,
  true,
  "Windows 密码管理器即使仍未返回，也必须完成登录和团队数据载入"
);
assert.deepEqual(
  fetchCalls,
  ["/api/auth/login"],
  "登录响应已经包含团队数据时，不得再串行请求一次完整 bootstrap"
);
assert.equal(
  elements.syncStatus.title,
  "本次载入 0.5 秒；接口等待 0.2 秒",
  "登录链路的耗时诊断必须从点击登录开始计算，不能混入此前未登录 bootstrap 的时间"
);

console.log(JSON.stringify({ passed: 3, phase: "single-response-windows-login" }));
