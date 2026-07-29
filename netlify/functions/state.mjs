import { getStore } from "@netlify/blobs";

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

const arrayKeys = {
  entries: "id",
  products: "id",
  tasks: "id",
  reports: "id",
  reportAnalyses: "key",
  customCreators: "id",
  creatorHistory: "id"
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers });
}

function normalizeData(data) {
  return {
    entries: Array.isArray(data?.entries) ? data.entries : [],
    products: Array.isArray(data?.products) ? data.products : [],
    tasks: Array.isArray(data?.tasks) ? data.tasks : [],
    reports: Array.isArray(data?.reports) ? data.reports : [],
    reportAnalyses: Array.isArray(data?.reportAnalyses) ? data.reportAnalyses : [],
    customCreators: Array.isArray(data?.customCreators) ? data.customCreators : [],
    creatorEdits: data?.creatorEdits && typeof data.creatorEdits === "object" ? data.creatorEdits : {},
    creatorHistory: Array.isArray(data?.creatorHistory) ? data.creatorHistory : []
  };
}

function normalizePayload(payload) {
  return {
    version: "v2",
    updatedAt: new Date().toISOString(),
    data: normalizeData(payload?.data || payload)
  };
}

function legacyPatch(payload) {
  const data = normalizeData(payload?.data || payload);
  const collections = {};
  Object.keys(arrayKeys).forEach((name) => {
    collections[name] = { upserts: data[name], deletes: [] };
  });
  return {
    collections,
    creatorEdits: { upserts: data.creatorEdits, deletes: [] }
  };
}

function normalizePatch(payload) {
  const source = payload?.patch || legacyPatch(payload);
  const collections = {};
  Object.keys(arrayKeys).forEach((name) => {
    const operations = source?.collections?.[name] || {};
    collections[name] = {
      upserts: Array.isArray(operations.upserts) ? operations.upserts : [],
      deletes: Array.isArray(operations.deletes) ? operations.deletes.map(String) : []
    };
  });
  return {
    collections,
    creatorEdits: {
      upserts: source?.creatorEdits?.upserts && typeof source.creatorEdits.upserts === "object"
        ? source.creatorEdits.upserts
        : {},
      deletes: Array.isArray(source?.creatorEdits?.deletes)
        ? source.creatorEdits.deletes.map(String)
        : []
    }
  };
}

function mergeCollection(current, operations, keyField) {
  const deleted = new Set(operations.deletes);
  const records = new Map();

  current.forEach((record, index) => {
    const key = String(record?.[keyField] || `legacy:${index}:${JSON.stringify(record)}`);
    if (!deleted.has(key)) records.set(key, record);
  });

  operations.upserts.forEach((record, index) => {
    const key = String(record?.[keyField] || `incoming:${index}:${JSON.stringify(record)}`);
    if (!deleted.has(key)) records.set(key, record);
  });

  return [...records.values()];
}

function applyPatch(currentData, patch) {
  const current = normalizeData(currentData);
  const next = { ...current };

  Object.entries(arrayKeys).forEach(([name, keyField]) => {
    next[name] = mergeCollection(current[name], patch.collections[name], keyField);
  });

  next.creatorEdits = { ...current.creatorEdits, ...patch.creatorEdits.upserts };
  patch.creatorEdits.deletes.forEach((key) => delete next.creatorEdits[key]);
  return next;
}

export default async (request) => {
  const store = getStore({ name: "tiktok-ops-workbench", consistency: "strong" });

  if (request.method === "GET") {
    const entry = await store.getWithMetadata("state", { type: "json", consistency: "strong" });
    if (!entry) return json(200, { version: "v2", updatedAt: null, data: null });
    return json(200, { ...entry.data, etag: entry.etag });
  }

  if (request.method === "POST") {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "Invalid JSON payload" });
    }

    const patch = normalizePatch(payload);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const entry = await store.getWithMetadata("state", { type: "json", consistency: "strong" });
      const current = entry?.data?.data || null;
      const normalized = normalizePayload({ data: applyPatch(current, patch) });
      const result = await store.setJSON(
        "state",
        normalized,
        entry ? { onlyIfMatch: entry.etag } : { onlyIfNew: true }
      );

      if (result.modified) {
        return json(200, { ...normalized, etag: result.etag });
      }
    }

    return json(409, { error: "Concurrent update conflict. Please retry." });
  }

  return json(405, { error: "Method not allowed" });
};
