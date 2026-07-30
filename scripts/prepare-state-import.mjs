import { readFile, writeFile } from "node:fs/promises";

const [sourcePath, outputPath = ".migration-backups/cloudflare-state-import.sql"] = process.argv.slice(2);
if (!sourcePath) {
  console.error("Usage: node scripts/prepare-state-import.mjs <netlify-state.json> [output.sql]");
  process.exit(1);
}

const payload = JSON.parse(await readFile(sourcePath, "utf8"));
if (!payload?.data || payload.version !== "v2") {
  throw new Error("Expected a Netlify v2 state payload with data");
}

const normalized = {
  entries: Array.isArray(payload.data.entries) ? payload.data.entries : [],
  products: Array.isArray(payload.data.products) ? payload.data.products : [],
  tasks: Array.isArray(payload.data.tasks) ? payload.data.tasks : [],
  reports: Array.isArray(payload.data.reports) ? payload.data.reports : [],
  reportAnalyses: Array.isArray(payload.data.reportAnalyses) ? payload.data.reportAnalyses : [],
  customCreators: Array.isArray(payload.data.customCreators) ? payload.data.customCreators : [],
  creatorEdits: payload.data.creatorEdits && typeof payload.data.creatorEdits === "object"
    ? payload.data.creatorEdits
    : {},
  creatorHistory: Array.isArray(payload.data.creatorHistory) ? payload.data.creatorHistory : []
};

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const updatedAt = payload.updatedAt || new Date().toISOString();
const sql = [
  `INSERT INTO workbench_state (id, version, updated_at, revision, data)
VALUES ('main', 'v2', ${quote(updatedAt)}, 1, ${quote(JSON.stringify(normalized))})
ON CONFLICT(id) DO UPDATE SET
  version = excluded.version,
  updated_at = excluded.updated_at,
  revision = excluded.revision,
  data = excluded.data;`,
  ""
].join("\n");

await writeFile(outputPath, sql, { mode: 0o600 });
console.log(JSON.stringify({
  outputPath,
  updatedAt,
  counts: {
    entries: normalized.entries.length,
    products: normalized.products.length,
    tasks: normalized.tasks.length,
    reports: normalized.reports.length,
    reportAnalyses: normalized.reportAnalyses.length,
    customCreators: normalized.customCreators.length,
    creatorEdits: Object.keys(normalized.creatorEdits).length,
    creatorHistory: normalized.creatorHistory.length
  }
}, null, 2));
