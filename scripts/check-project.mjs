import { readFile } from "node:fs/promises";
import { transform } from "esbuild";
import { loadAppSources } from "./app-sources.mjs";
import { loadStyleSources } from "./style-sources.mjs";

const [html, tokens, styleBundle, boot, appBundle, headers] = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("src/styles/tokens.css", "utf8"),
  loadStyleSources(),
  readFile("src/app/boot.js", "utf8"),
  loadAppSources(),
  readFile("_headers", "utf8")
]);
const css = styleBundle.combined;
const app = appBundle.combined;

const requiredViews = ["overview", "reports", "tasks", "costing", "creators", "sop"];
const requiredControls = ["entryLoginForm", "reportForm", "taskBoard", "costProfileForm"];
const missing = [...requiredViews, ...requiredControls].filter((id) => !html.includes(`id="${id}"`));

if (missing.length) throw new Error(`Missing required workbench elements: ${missing.join(", ")}`);
if (/<style[\s>]/i.test(html)) throw new Error("Inline <style> blocks are not allowed in index.html");
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) throw new Error("Inline <script> blocks are not allowed in index.html");
if (tokens.length < 1_000 || css.length < 50_000 || app.length < 100_000 || boot.length < 500) {
  throw new Error("A source module is unexpectedly small; stop before publishing.");
}
if (!headers.includes("Content-Security-Policy:")) throw new Error("Security headers are missing CSP");
if (styleBundle.files.length < 8) throw new Error("Workbench CSS is no longer fully modularized");
if (appBundle.files.length < 8) throw new Error("Workbench JavaScript is no longer fully modularized");

await Promise.all(styleBundle.sources.map((source) => transform(source, {
  loader: "css",
  target: "chrome100"
})));

console.log(JSON.stringify({
  htmlBytes: html.length,
  tokenBytes: tokens.length,
  cssBytes: tokens.length + css.length,
  cssModules: styleBundle.files.length,
  appModules: appBundle.files.length,
  bootBytes: boot.length,
  appBytes: app.length,
  requiredViews: requiredViews.length,
  requiredControls: requiredControls.length
}));
