import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_PREVIEW_URL = "http://127.0.0.1:52098/";

export function shouldRestartLocalPreview({ stopping }) {
  return !stopping;
}

export function localPreviewRestartDelay(attempt) {
  const retry = Math.max(0, Number(attempt) || 0);
  return Math.min(8000, 800 * (2 ** retry));
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function wranglerExecutable() {
  return path.resolve("node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
}

function startWrangler() {
  const command = wranglerExecutable();
  const args = [
    "pages", "dev", "dist",
    "--ip", "127.0.0.1",
    "--port", "52098",
    "--persist-to", ".wrangler/state"
  ];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  });
  return child;
}

export async function superviseLocalPreview() {
  let stopping = false;
  let child = null;
  let retryAttempt = 0;

  const stop = (signal) => {
    if (stopping) return;
    stopping = true;
    if (child && !child.killed) child.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  while (!stopping) {
    const startedAt = Date.now();
    console.log(`[local-preview] 正在启动 ${LOCAL_PREVIEW_URL}`);
    child = startWrangler();

    const result = await new Promise((resolve) => {
      let resolved = false;
      const finish = (payload) => {
        if (resolved) return;
        resolved = true;
        resolve(payload);
      };
      child.once("error", (error) => finish({ exitCode: null, signal: null, error }));
      child.once("exit", (exitCode, signal) => finish({ exitCode, signal, error: null }));
    });

    if (!shouldRestartLocalPreview({ stopping, ...result })) break;

    const livedFor = Date.now() - startedAt;
    retryAttempt = livedFor >= 60_000 ? 0 : retryAttempt + 1;
    const delay = localPreviewRestartDelay(retryAttempt);
    const reason = result.error?.message || `退出码 ${result.exitCode ?? "无"}${result.signal ? ` / ${result.signal}` : ""}`;
    console.error(`[local-preview] Wrangler 异常停止（${reason}），${delay}ms 后自动恢复。`);
    await wait(delay);
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  superviseLocalPreview().catch((error) => {
    console.error("[local-preview] 守护进程异常：", error);
    process.exitCode = 1;
  });
}
