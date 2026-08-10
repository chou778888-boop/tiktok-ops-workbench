import assert from "node:assert/strict";
import { onRequestPost } from "../functions/api/auth/login.js";
import { passwordHash } from "../functions/_shared/auth.js";

const password = "secret";
const salt = "00112233445566778899aabbccddeeff";
const user = {
  id: "user-kk",
  username: "KK",
  display_name: "KK",
  role: "admin",
  password_salt: salt,
  password_hash: await passwordHash(password, salt, 1),
  password_iterations: 1
};
const stateRow = {
  version: "v2",
  updated_at: "2026-08-10T09:00:00.000Z",
  revision: 384,
  data: JSON.stringify({ tasks: [{ id: "task-1", title: "跟进重点链接" }] })
};

function resultFor(sql) {
  if (sql.includes("auth_login_attempts") && sql.includes("SELECT")) return null;
  if (sql.includes("FROM users")) return user;
  if (sql.includes("workbench_state")) return stateRow;
  return null;
}

function statement(sql) {
  return {
    sql,
    args: [],
    bind(...args) {
      this.args = args;
      return this;
    },
    async first() {
      return resultFor(sql);
    },
    async run() {
      return { success: true, results: [] };
    }
  };
}

const DB = {
  prepare(sql) {
    return statement(sql);
  },
  async batch(statements) {
    return statements.map((item) => ({ success: true, results: resultFor(item.sql) ? [resultFor(item.sql)] : [] }));
  }
};

const response = await onRequestPost({
  request: new Request("https://tiktok-ops-workbench.pages.dev/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "127.0.0.1"
    },
    body: JSON.stringify({ username: "KK", password, remember: true })
  }),
  env: { DB }
});
const payload = await response.json();

assert.equal(response.status, 200, "正确账号密码必须登录成功");
assert.equal(payload.user.username, "KK", "登录响应必须保留当前用户身份");
assert.equal(payload.revision, 384, "登录响应必须携带同一主库快照的版本号");
assert.deepEqual(
  payload.data.tasks.map((task) => task.id),
  ["task-1"],
  "登录响应必须直接携带团队数据，避免客户端再次串行请求完整 bootstrap"
);
assert.match(response.headers.get("server-timing") || "", /app;dur=/, "登录响应必须保留服务端耗时诊断");

console.log(JSON.stringify({ passed: 5, phase: "login-with-bootstrap-payload" }));
