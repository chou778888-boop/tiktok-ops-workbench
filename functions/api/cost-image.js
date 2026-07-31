const allowedOrigins = new Set([
  "https://tiktok-ops-workbench.pages.dev",
  "http://127.0.0.1:8792",
  "http://localhost:8792"
]);

const imagePattern = /^data:(image\/(?:png|jpe?g|webp));base64,([a-z0-9+/=\s]+)$/i;
const idPattern = /^[a-f0-9]{64}$/i;
const maxImageLength = 220000;

function corsHeaders(request) {
  const headers = {};
  const origin = request?.headers?.get("origin") || "";
  if (allowedOrigins.has(origin)) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["access-control-allow-headers"] = "accept, content-type";
    headers.vary = "Origin";
  }
  return headers;
}

function json(status, body, request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...corsHeaders(request)
    }
  });
}

async function handleGet(request, env) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!idPattern.test(id)) return json(400, { error: "图片标识无效" }, request);
  const row = await env.DB.prepare(
    "SELECT mime_type, data FROM cost_profile_images WHERE id = ?"
  ).bind(id).first();
  if (!row) return json(404, { error: "图片不存在" }, request);

  const binary = atob(String(row.data || ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "content-type": row.mime_type,
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${id}"`,
      ...corsHeaders(request)
    }
  });
}

async function handlePost(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "图片请求格式无效" }, request);
  }

  const id = String(payload?.id || "");
  const image = String(payload?.image || "");
  const match = image.match(imagePattern);
  if (!idPattern.test(id) || !match || image.length > maxImageLength) {
    return json(413, { error: "图片格式无效或压缩后仍然过大" }, request);
  }

  await env.DB.prepare(
    `INSERT INTO cost_profile_images (id, mime_type, data, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       mime_type = excluded.mime_type,
       data = excluded.data,
       updated_at = excluded.updated_at`
  ).bind(id, match[1].toLowerCase(), match[2].replace(/\s+/g, ""), new Date().toISOString()).run();

  return json(200, {
    id,
    url: `https://tiktok-ops-workbench.pages.dev/api/cost-image?id=${id}`
  }, request);
}

export async function onRequest({ request, env }) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method === "GET") return handleGet(request, env);
  if (request.method === "POST") return handlePost(request, env);
  return json(405, { error: "Method not allowed" }, request);
}
