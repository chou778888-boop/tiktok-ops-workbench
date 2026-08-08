import { requestSessionToken, sessionCookie, sha256Hex } from "../../_shared/auth.js";

export async function onRequestPost({ request, env }) {
  const token = requestSessionToken(request);
  if (token) await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "set-cookie": sessionCookie("", request, 0)
    }
  });
}
