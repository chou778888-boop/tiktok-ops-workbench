import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_PREVIEW_URL = "http://127.0.0.1:52098/";
const LOCAL_PREVIEW_HEALTH_URL = new URL("release.json", LOCAL_PREVIEW_URL).toString();
const LOCAL_PREVIEW_HEALTH_INTERVAL = 4000;
const LOCAL_PREVIEW_HEALTH_FAILURE_LIMIT = 3;

export function shouldRestartLocalPreview({ stopping }) {
  return !stopping;
}

export function localPreviewRestartDelay(attempt) {
  const retry = Math.max(0, Number(attempt) || 0);
  return Math.min(8000, 800 * (2 ** retry));
}

export function shouldRecycleUnhealthyPreview(consecutiveFailures) {
  return Number(consecutiveFailures) >= LOCAL_PREVIEW_HEALTH_FAILURE_LIMIT;
}

export async function localPreviewHealthCheck({ fetchPreview = fetch } = {}) {
  try {
    const response = await fetchPreview(LOCAL_PREVIEW_HEALTH_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(1800)
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function wranglerExecutable() {
  return path.resolve("node_modules", ".bin", process.platform === "win32" ? "wrangler.cmd" : "wrangler");
}

export function localPreviewProcessGroupTarget(child, platform = process.platform) {
  const pid = Number(child?.pid);
  if (platform === "win32" || !Number.isInteger(pid) || pid <= 0) return null;
  return -pid;
}

export function terminateLocalPreviewProcessTree(child, {
  platform = process.platform,
  killProcess = process.kill,
  signal = "SIGTERM"
} = {}) {
  if (!child) return false;
  const processGroup = localPreviewProcessGroupTarget(child, platform);
  try {
    if (processGroup !== null) killProcess(processGroup, signal);
    else if (!child.killed && typeof child.kill === "function") child.kill(signal);
    else return false;
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
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
    detached: process.platform !== "win32",
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
    terminateLocalPreviewProcessTree(child, {
      signal: signal === "SIGINT" ? "SIGINT" : "SIGTERM"
    });
  };

  process.once("SIGINT", () => stop("SIGINT"));
  process.once("SIGTERM", () => stop("SIGTERM"));

  while (!stopping) {
    const startedAt = Date.now();
    console.log(`[local-preview] 正在启动 ${LOCAL_PREVIEW_URL}`);
    child = startWrangler();

    const exitResult = new Promise((resolve) => {
      let resolved = false;
      const finish = (payload) => {
        if (resolved) return;
        resolved = true;
        resolve(payload);
      };
      child.once("error", (error) => finish({ exitCode: null, signal: null, error }));
      child.once("exit", (exitCode, signal) => finish({ exitCode, signal, error: null }));
    });

    let result = null;
    let consecutiveHealthFailures = 0;
    while (!result) {
      const outcome = await Promise.race([
        exitResult,
        wait(LOCAL_PREVIEW_HEALTH_INTERVAL).then(() => ({ healthProbeDue: true }))
      ]);
      if (!outcome.healthProbeDue) {
        result = outcome;
        break;
      }
      const healthy = await localPreviewHealthCheck();
      consecutiveHealthFailures = healthy ? 0 : consecutiveHealthFailures + 1;
      if (!shouldRecycleUnhealthyPreview(consecutiveHealthFailures)) continue;

      const healthError = new Error(`固定地址连续 ${consecutiveHealthFailures} 次无响应`);
      terminateLocalPreviewProcessTree(child);
      const exited = await exitResult;
      result = { ...exited, error: healthError };
    }

    terminateLocalPreviewProcessTree(child);

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
