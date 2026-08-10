import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const bootSource = await readFile("src/app/boot.js", "utf8");
const fetchCalls = [];
const scriptListeners = {};
let submitLogin;
let resolveCredentialStore;

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
    if (String(url) === "/api/auth/login") return response(200, { user: { id: "user-kk", name: "KK" } });
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
  performance: { now: () => 100 },
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

const loginCompletion = submitLogin({ preventDefault() {} });
await new Promise((resolve) => setImmediate(resolve));
const bootstrapStartedBeforeCredentialStoreFinished = fetchCalls.includes("/api/bootstrap?fresh=1");
resolveCredentialStore();
await loginCompletion;

assert.equal(
  bootstrapStartedBeforeCredentialStoreFinished,
  true,
  "Windows 密码管理器即使仍未返回，也必须立即开始载入团队数据"
);

console.log(JSON.stringify({ passed: 1, phase: "non-blocking-windows-login" }));
