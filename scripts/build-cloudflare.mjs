import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("assets", "dist/assets", { recursive: true });
await cp("_headers", "dist/_headers");
console.log("Cloudflare static bundle ready: dist/");
