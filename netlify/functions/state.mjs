import { getStore } from "@netlify/blobs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizePayload(payload) {
  const data = payload?.data || payload;
  return {
    version: "v1",
    updatedAt: new Date().toISOString(),
    data: {
      entries: Array.isArray(data?.entries) ? data.entries : [],
      products: Array.isArray(data?.products) ? data.products : [],
      tasks: Array.isArray(data?.tasks) ? data.tasks : [],
      customCreators: Array.isArray(data?.customCreators) ? data.customCreators : [],
      creatorEdits: data?.creatorEdits && typeof data.creatorEdits === "object" ? data.creatorEdits : {},
      creatorHistory: Array.isArray(data?.creatorHistory) ? data.creatorHistory : []
    }
  };
}

export default async (request) => {
  const store = getStore("tiktok-ops-workbench");

  if (request.method === "GET") {
    const saved = await store.get("state", { type: "json" });
    return json(200, saved || { version: "v1", updatedAt: null, data: null });
  }

  if (request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "Invalid JSON payload" });
    }
    const normalized = normalizePayload(payload);
    await store.setJSON("state", normalized);
    return json(200, normalized);
  }

  return json(405, { error: "Method not allowed" });
};
