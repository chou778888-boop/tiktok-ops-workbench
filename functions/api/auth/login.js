import {
  constantTimeEqual,
  passwordHash,
  sessionCookie,
  sessionToken,
  sha256Hex
} from "../../_shared/auth.js";
import { workbenchPayload } from "../../_shared/workbench-payload.js";
import { normalizeData } from "../state.js";

const jsonHeaders = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...jsonHeaders, ...headers } });
}

export async function onRequestPost({ request, env }) {
  const startedAt = Date.now();
  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "请输入账号和密码" });
  }
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "");
  const sessionMaxAge = body?.remember ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
  if (!username || !password || username.length > 80 || password.length > 128) return json(400, { error: "请输入账号和密码" });

  const ip = request.headers.get("cf-connecting-ip") || "local";
  const attemptKey = await sha256Hex(`${ip}|${username.toLowerCase()}`);
  const now = new Date();
  const windowStart = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const [attemptResult, userResult] = await env.DB.batch([
    env.DB.prepare("SELECT attempts, window_started_at FROM auth_login_attempts WHERE attempt_key = ?").bind(attemptKey),
    env.DB.prepare(`
      SELECT id, username, display_name, role, password_salt, password_hash, password_iterations
      FROM users WHERE username = ? COLLATE NOCASE AND active = 1
    `).bind(username)
  ]);
  const attempt = attemptResult.results?.[0] || null;
  if (attempt && attempt.window_started_at > windowStart && Number(attempt.attempts) >= 5) {
    return json(429, { error: "尝试次数过多，请15分钟后再试" });
  }

  const user = userResult.results?.[0] || null;
  const calculated = user ? await passwordHash(password, user.password_salt, user.password_iterations) : "";
  if (!user || !constantTimeEqual(calculated, user.password_hash)) {
    if (!attempt || attempt.window_started_at <= windowStart) {
      await env.DB.prepare("INSERT OR REPLACE INTO auth_login_attempts (attempt_key, attempts, window_started_at) VALUES (?, 1, ?)")
        .bind(attemptKey, now.toISOString()).run();
    } else {
      await env.DB.prepare("UPDATE auth_login_attempts SET attempts = attempts + 1 WHERE attempt_key = ?").bind(attemptKey).run();
    }
    return json(401, { error: "账号或密码不正确" });
  }

  const token = sessionToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(now.getTime() + sessionMaxAge * 1000).toISOString();
  const [, , , stateResult] = await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_login_attempts WHERE attempt_key = ?").bind(attemptKey),
    env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now.toISOString()),
    env.DB.prepare("INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(tokenHash, user.id, expiresAt, now.toISOString()),
    env.DB.prepare("SELECT version, updated_at, revision, data FROM workbench_state WHERE id = ?").bind("main")
  ]);
  const state = stateResult.results?.[0] || null;
  return json(200, workbenchPayload(user, state, normalizeData), {
    "set-cookie": sessionCookie(token, request, sessionMaxAge),
    "server-timing": `app;dur=${Date.now() - startedAt}`
  });
}
