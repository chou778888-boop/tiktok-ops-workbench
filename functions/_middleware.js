import { publicUser, requestSessionToken, sha256Hex } from "./_shared/auth.js";
import { automationAuthorized } from "./_shared/automation-auth.js";

function unauthorized() {
  return new Response(JSON.stringify({ error: "请先登录" }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith("/api/")) return context.next();
  if (context.request.method === "OPTIONS") return context.next();
  if (url.pathname === "/api/auth/login") return context.next();
  if (url.pathname === "/api/bootstrap") return context.next();
  if (url.pathname === "/api/state" && url.searchParams.get("summary") === "1") return context.next();
  if (url.pathname === "/api/profit-sync" && automationAuthorized(context.request, context.env)) {
    context.data.automation = true;
    return context.next();
  }

  const token = requestSessionToken(context.request);
  if (!token) return unauthorized();
  const tokenHash = await sha256Hex(token);
  const row = await context.env.DB.prepare(`
    SELECT users.id, users.username, users.display_name, users.role
    FROM auth_sessions
    JOIN users ON users.id = auth_sessions.user_id
    WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ? AND users.active = 1
  `).bind(tokenHash, new Date().toISOString()).first();
  if (!row) return unauthorized();
  context.data.user = publicUser(row);
  return context.next();
}
