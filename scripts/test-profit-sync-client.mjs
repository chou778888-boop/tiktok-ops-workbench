import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile("src/app/workbench/65-profit-sync-client.js", "utf8");
const context = vm.createContext({ console, URL });
vm.runInContext(source, context, { filename: "65-profit-sync-client.js" });
const requestProfitAutomaticSync = vm.runInContext("requestProfitAutomaticSync", context);
const requestTikTokShopAuthorization = vm.runInContext("requestTikTokShopAuthorization", context);

let requestUrl = "";
let requestOptions = null;
const result = await requestProfitAutomaticSync({
  dateKey: "2026-08-10",
  fetchImpl: async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: "synced", revision: 9 })
    };
  }
});
assert.equal(requestUrl, "/api/profit-sync");
assert.equal(requestOptions.method, "POST");
assert.equal(requestOptions.headers["content-type"], "application/json");
assert.equal(requestOptions.body, JSON.stringify({ dateKey: "2026-08-10" }));
assert.deepEqual(JSON.parse(JSON.stringify(result)), { status: "synced", revision: 9 });

await assert.rejects(
  requestProfitAutomaticSync({
    dateKey: "2026-08-10",
    fetchImpl: async () => ({
      ok: false,
      status: 409,
      json: async () => ({ error: "尚未配置 TikTok Shop 店铺授权", code: "PROFIT_SYNC_UNCONFIGURED" })
    })
  }),
  (error) => error.code === "PROFIT_SYNC_UNCONFIGURED" && error.message.includes("尚未配置"),
  "页面必须展示后端的可处理错误，而不是伪装成同步成功"
);

let authorizationRequest = null;
const authorizationResult = await requestTikTokShopAuthorization({
  storeId: "store-dreamweave",
  fetchImpl: async (url, options) => {
    authorizationRequest = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ authorizationUrl: "https://services.us.tiktokshop.com/open/authorize?service_id=service-1&state=safe-state" })
    };
  }
});
assert.equal(authorizationRequest.url, "/api/tiktok-shop/authorization/start");
assert.equal(authorizationRequest.options.method, "POST");
assert.equal(authorizationRequest.options.body, JSON.stringify({ storeId: "store-dreamweave" }));
assert.equal(new URL(authorizationResult.authorizationUrl).hostname, "services.us.tiktokshop.com");

await assert.rejects(
  requestTikTokShopAuthorization({
    storeId: "store-dreamweave",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ authorizationUrl: "https://phishing.example/authorize" }) })
  }),
  /授权地址异常/,
  "即使后端被错误配置，前端也不能跳转到非 TikTok 域名"
);

console.log(JSON.stringify({ passed: 14, phase: "profit-sync-client" }));
