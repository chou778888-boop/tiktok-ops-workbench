import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const sourceHtml = await readFile("index.html", "utf8");
const release = createHash("sha256").update(sourceHtml).digest("hex").slice(0, 12);
const styleMatch = sourceHtml.match(/  <style>([\s\S]*?)  <\/style>/);
const scriptMatch = sourceHtml.match(/  <script>([\s\S]*?)  <\/script>\s*<\/body>/);
if (!styleMatch || !scriptMatch) throw new Error("Unable to find inline workbench assets");

const assetDir = "dist/assets/build";
const cssName = `workbench-${release}.css`;
const jsName = `workbench-${release}.js`;
const builtHtml = sourceHtml
  .replace(styleMatch[0], `  <link rel="stylesheet" href="assets/build/${cssName}" />\n`)
  .replace(scriptMatch[0], `  <script src="assets/build/${jsName}" defer></script>\n</body>`)
  .replaceAll("__WORKBENCH_RELEASE__", release);

await mkdir(assetDir, { recursive: true });
await writeFile("dist/index.html", builtHtml);
await writeFile(`${assetDir}/${cssName}`, styleMatch[1]);
await writeFile(`${assetDir}/${jsName}`, scriptMatch[1].replaceAll("__WORKBENCH_RELEASE__", release));
await writeFile("dist/release.json", JSON.stringify({ release }));
await cp("assets", "dist/assets", { recursive: true });
await cp("_headers", "dist/_headers");
console.log(`Cloudflare static bundle ready: dist/ (${release})`);
