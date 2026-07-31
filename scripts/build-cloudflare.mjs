import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const sourceHtml = await readFile("index.html", "utf8");
const release = createHash("sha256").update(sourceHtml).digest("hex").slice(0, 12);
await writeFile("dist/index.html", sourceHtml.replaceAll("__WORKBENCH_RELEASE__", release));
await writeFile("dist/release.json", JSON.stringify({ release }));
await cp("assets", "dist/assets", { recursive: true });
await cp("_headers", "dist/_headers");
console.log(`Cloudflare static bundle ready: dist/ (${release})`);
