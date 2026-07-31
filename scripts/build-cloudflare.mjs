import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { transform } from "esbuild";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const sourceHtml = await readFile("index.html", "utf8");
const release = createHash("sha256").update(sourceHtml).digest("hex").slice(0, 12);
const styleMatch = sourceHtml.match(/  <style>([\s\S]*?)  <\/style>/);
const scriptMatch = sourceHtml.match(/  <script id="workbenchMain">([\s\S]*?)  <\/script>\s*<\/body>/);
if (!styleMatch || !scriptMatch) throw new Error("Unable to find inline workbench assets");

const assetDir = "dist/assets/build";
const cssName = `workbench-${release}.css`;
const jsName = `workbench-${release}.js`;
const [{ code: builtCss }, { code: builtJs }] = await Promise.all([
  transform(styleMatch[1], { loader: "css", minify: true, target: "chrome100" }),
  transform(scriptMatch[1].replaceAll("__WORKBENCH_RELEASE__", release), {
    loader: "js",
    minify: true,
    target: "es2020"
  })
]);
const builtHtml = sourceHtml
  .replace(
    styleMatch[0],
    `  <link rel="stylesheet" href="assets/build/${cssName}" />\n  <script src="assets/build/${jsName}" defer></script>\n`
  )
  .replace(scriptMatch[0], "</body>")
  .replaceAll("__WORKBENCH_RELEASE__", release);

await mkdir(assetDir, { recursive: true });
await writeFile("dist/index.html", builtHtml);
await writeFile(`${assetDir}/${cssName}`, builtCss);
await writeFile(`${assetDir}/${jsName}`, builtJs);
await writeFile("dist/release.json", JSON.stringify({ release }));
await cp("assets", "dist/assets", { recursive: true });
await cp("_headers", "dist/_headers");
console.log(`Cloudflare static bundle ready: dist/ (${release})`);
