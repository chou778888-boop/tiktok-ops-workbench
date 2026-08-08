import { apiSecurityHeaders } from "../_shared/http.js";
import { publicUser, requestSessionToken, sha256Hex } from "../_shared/auth.js";
import { normalizeData } from "./state.js";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  ...apiSecurityHeaders()
};

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, ...extraHeaders } });
}

export async function onRequestGet({ request, env }) {
  const startedAt = Date.now();
  const token = requestSessionToken(request);
  if (!token) return json(401, { error: "请先登录" });
  const tokenHash = await sha256Hex(token);
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const session = env.DB.withSession(fresh ? "first-primary" : "first-unconstrained");
  const [userResult, stateResult] = await session.batch([
    session.prepare(`
      SELECT users.id, users.username, users.display_name, users.role
      FROM auth_sessions
      JOIN users ON users.id = auth_sessions.user_id
      WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ? AND users.active = 1
    `).bind(tokenHash, new Date().toISOString()),
    session.prepare("SELECT version, updated_at, revision, data FROM workbench_state WHERE id = ?").bind("main")
  ]);
  const user = userResult.results?.[0] || null;
  if (!user) return json(401, { error: "请先登录" });
  const state = stateResult.results?.[0] || null;
  return json(200, {
    user: publicUser(user),
    version: state?.version || "v2",
    updatedAt: state?.updated_at || null,
    revision: Number(state?.revision || 0),
    data: state?.data ? normalizeData(JSON.parse(state.data)) : normalizeData(null)
  }, { "server-timing": `app;dur=${Date.now() - startedAt}` });
}

export async function onRequest({ request, env }) {
  if (request.method === "GET") return onRequestGet({ request, env });
  return json(405, { error: "Method not allowed" });
}
