import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [html, boot, middleware, bootstrap, build] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/app/boot.js", "utf8"),
  readFile("functions/_middleware.js", "utf8"),
  readFile("functions/api/bootstrap.js", "utf8"),
  readFile("scripts/build-cloudflare.mjs", "utf8")
]);

assert.match(html, /id="workbenchMain"\s+data-src="src\/app\/workbench\.js"/, "未认证时不能自动下载工作台主脚本");
assert.doesNotMatch(html, /id="workbenchMain"\s+src=/, "工作台主脚本必须延迟到认证成功后加载");
assert.match(boot, /\/api\/bootstrap/, "启动时必须用单一接口同时恢复用户和团队状态");
assert.doesNotMatch(boot, /\/api\/auth\/me/, "启动时不能额外请求用户接口");
assert.doesNotMatch(boot, /summary=1/, "启动时不能额外请求会读取整份状态的摘要接口");
assert.doesNotMatch(boot, /location\.reload\(\)/, "登录成功后不能整页重载并重复启动链路");
assert.match(boot, /dataset\.src/, "认证成功后必须按需加载工作台主脚本");
assert.match(middleware, /url\.pathname === "\/api\/bootstrap"/, "启动接口必须由自身一次性完成认证和状态读取");
assert.match(bootstrap, /session\.batch/, "启动接口必须将会话和状态查询合并为一次D1批处理");
assert.match(bootstrap, /auth_sessions[\s\S]*workbench_state/, "启动接口必须同时读取会话和工作台状态");
assert.match(bootstrap, /env\.DB\.withSession/, "启动读取必须使用D1 Sessions API支持就近读副本");
assert.match(bootstrap, /fresh[\s\S]*first-primary[\s\S]*first-unconstrained/, "刚登录必须读主库，日常启动才允许就近副本");
assert.match(boot, /__workbenchPerformance/, "启动页必须记录分阶段性能数据，便于定位 Windows 慢加载");
assert.match(boot, /bootstrapStartedAt[\s\S]*bootstrapResponseAt[\s\S]*bootstrapParsedAt/, "启动性能必须区分接口等待与 JSON 解析");
assert.match(boot, /tiktok_ops_boot_performance_v1/, "启动性能必须仅保存在当前浏览器，不能写入团队云端");
assert.match(boot, /__workbenchMarkReady/, "完整工作台必须提供首屏完成标记");
assert.match(bootstrap, /server-timing/, "启动接口必须返回服务端耗时，便于区分 D1 与网络等待");
assert.match(boot, /fetchBootstrap\(true\)/, "新登录后的首次启动必须明确请求最新主库数据");
assert.match(build, /data-src="src\/app\/workbench\.js"/, "生产构建必须保留主脚本按需加载能力");

console.log(JSON.stringify({ passed: 19, phase: "single-request-fast-bootstrap-with-diagnostics" }));
