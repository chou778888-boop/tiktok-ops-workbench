import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { passwordHash } from "../functions/_shared/auth.js";
import { loadAppSources } from "./app-sources.mjs";

const boot = await readFile("src/app/boot.js", "utf8");
const app = (await loadAppSources()).combined;
const login = await readFile("functions/api/auth/login.js", "utf8");
const auth = await readFile("functions/_shared/auth.js", "utf8");
const middleware = await readFile("functions/_middleware.js", "utf8");
const migration = await readFile("migrations/0003_auth.sql", "utf8");

assert.match(migration, /CREATE TABLE IF NOT EXISTS users/, "必须创建用户表");
assert.match(migration, /CREATE TABLE IF NOT EXISTS auth_sessions/, "必须创建登录会话表");
assert.equal((migration.match(/INSERT OR IGNORE INTO users/g) || []).length, 10, "必须配置8名成员和2名管理员");
assert.doesNotMatch(migration, /INSERT OR REPLACE INTO users/, "重复执行认证迁移不能覆盖团队已经轮换的密码");
const configuredIterations = [...migration.matchAll(/,\s*(\d+),\s*1,\s*'2026-08-03/g)].map((match) => Number(match[1]));
assert.equal(configuredIterations.length, 10, "每个账号都必须配置密码迭代次数");
assert.ok(configuredIterations.every((iterations) => iterations <= 100000), "Cloudflare生产环境不支持超过100000次PBKDF2迭代");
assert.doesNotMatch(migration, /210000/, "认证迁移不能保留Cloudflare不支持的默认迭代次数");
assert.doesNotMatch(migration, /Jinhanbing|金寒冰/, "必须去除金寒冰");
assert.match(migration, /Zhoukaihan[\s\S]*周恺涵[\s\S]*admin/, "周恺涵必须为管理员");
assert.match(migration, /'user-kk', 'KK', 'KK', 'admin'/, "KK的账号、显示名称和角色必须正确");
assert.doesNotMatch(migration, /\|Hejingjing\||\|Yeweining\|/, "迁移中不能保存明文密码");
assert.equal(
  await passwordHash("Hejingjing", "ceb6a5ecf97d2767cf95f1a31ee129ac", 100000),
  "7c0e4de1327058286ebfd3670922fb10743143e94a81e9d38f6ecb436f1d3fc9",
  "初始化密码哈希必须与运行时验证算法一致"
);
assert.equal(
  await passwordHash("KK", "1edec02c6b008dd234b5cbeca46d9080", 100000),
  "6b05caa540339e7bf837e65df2f8ab6c90a35549f6771115d144168adf76e184",
  "KK初始化密码哈希必须与运行时验证算法一致"
);

assert.match(auth, /PBKDF2/, "登录必须使用PBKDF2验证密码");
assert.match(auth, /HttpOnly/, "会话 Cookie 必须为 HttpOnly");
assert.match(auth, /SameSite=Strict/, "会话 Cookie 必须限制跨站发送");
assert.match(middleware, /auth_sessions/, "API 中间件必须校验登录会话");
assert.match(middleware, /status:\s*401/, "未登录 API 请求必须返回401");

assert.match(boot, /\/api\/auth\/login/, "登录页必须调用后端登录接口");
assert.match(boot, /rememberCredentials/, "登录页必须提供记住账号密码选项");
assert.match(boot, /PasswordCredential/, "勾选后必须交给浏览器密码管理器安全保存凭据");
assert.match(boot, /remember:\s*rememberCredentials/, "登录请求必须将30天保持登录选项交给后端");
assert.match(boot, /\/api\/bootstrap/, "页面启动必须一次恢复有效登录会话和团队状态");
assert.match(boot, /window\.__workbenchUser/, "登录身份必须提供给工作台");
assert.match(boot, /workbench-authenticated/, "恢复登录后必须通知已初始化的工作台");
assert.match(app, /function signedInWorkbenchUser\(\)/, "工作台必须统一读取登录身份");
assert.match(app, /addEventListener\("workbench-authenticated"/, "工作台必须响应登录身份恢复通知");
assert.match(app, /currentTaskCenterAuthor\(\)[\s\S]*signedInWorkbenchUser/, "我的任务必须按登录姓名匹配");
assert.match(app, /currentReportAuthor\(\)[\s\S]*signedInWorkbenchUser/, "日报填写人必须按登录姓名匹配");
assert.match(login, /body\?\.remember[\s\S]*30\s*\*\s*24\s*\*\s*60\s*\*\s*60/, "勾选后登录会话必须保持30天");
assert.match(login, /sessionCookie\(token, request, sessionMaxAge\)/, "会话Cookie必须采用用户选择的有效期");

console.log(JSON.stringify({ passed: 30, phase: "authenticated-team-login" }));
