import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { superviseLocalPreview } from "./dev-local-supervisor.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function buildLocalPreview() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, "scripts", "build-cloudflare.mjs")], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (exitCode, signal) => {
      if (exitCode === 0) resolve();
      else reject(new Error(`本地构建失败：退出码 ${exitCode ?? "无"}${signal ? ` / ${signal}` : ""}`));
    });
  });
}

await buildLocalPreview();
await superviseLocalPreview();
