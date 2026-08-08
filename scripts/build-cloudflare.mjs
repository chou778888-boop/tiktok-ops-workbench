import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { transform } from "esbuild";
import { loadAppSources } from "./app-sources.mjs";
import { loadStyleSources } from "./style-sources.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const [sourceHtml, sourceTokens, styleBundle, sourceBoot, appBundle] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/styles/tokens.css", "utf8"),
  loadStyleSources(),
  readFile("src/app/boot.js", "utf8"),
  loadAppSources()
]);
const sourceCss = styleBundle.combined;
const sourceApp = appBundle.combined;
const release = createHash("sha256")
  .update(sourceHtml)
  .update(sourceTokens)
  .update(sourceCss)
  .update(sourceBoot)
  .update(sourceApp)
  .digest("hex")
  .slice(0, 12);

const assetDir = "dist/assets/build";
const cssName = `workbench-${release}.css`;
const bootName = `boot-${release}.js`;
const jsName = `workbench-${release}.js`;
const [{ code: builtCss }, { code: builtBoot }, { code: builtJs }] = await Promise.all([
  transform(`${sourceTokens}\n${sourceCss}`, { loader: "css", minify: true, target: "chrome100" }),
  transform(sourceBoot.replaceAll("__WORKBENCH_RELEASE__", release), {
    loader: "js",
    minify: true,
    target: "es2020"
  }),
  transform(sourceApp.replaceAll("__WORKBENCH_RELEASE__", release), {
    loader: "js",
    minify: true,
    target: "es2020"
  })
]);
const builtHtml = sourceHtml
  .replace('  <link rel="stylesheet" href="src/styles/tokens.css" data-source-token-style />\n', "")
  .replace(
    '  <link rel="stylesheet" href="src/styles/workbench.css" data-source-style />',
    `  <link rel="stylesheet" href="assets/build/${cssName}" />`
  )
  .replace(
    '  <script src="src/app/boot.js" defer data-source-boot></script>',
    `  <script src="assets/build/${bootName}" defer></script>`
  )
  .replace(
    '  <script id="workbenchMain" data-src="src/app/workbench.js"></script>',
    `  <script id="workbenchMain" data-src="assets/build/${jsName}"></script>`
  )
  .replaceAll("__WORKBENCH_RELEASE__", release);

await mkdir(assetDir, { recursive: true });
await writeFile("dist/index.html", builtHtml);
await writeFile(`${assetDir}/${cssName}`, builtCss);
await writeFile(`${assetDir}/${bootName}`, builtBoot);
await writeFile(`${assetDir}/${jsName}`, builtJs);
await writeFile("dist/release.json", JSON.stringify({ release }));
await cp("assets", "dist/assets", { recursive: true });
await cp("_headers", "dist/_headers");
console.log(`Cloudflare static bundle ready: dist/ (${release})`);
