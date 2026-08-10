import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const defaultProductionOrigin = "https://tiktok-ops-workbench.pages.dev";

function bindingId(config, environment) {
  const bindings = config?.env?.[environment]?.d1_databases;
  const binding = Array.isArray(bindings)
    ? bindings.find((item) => item?.binding === "DB")
    : null;
  return String(binding?.database_id || "");
}

export function productionDataSnapshot(remoteState) {
  if (!remoteState || typeof remoteState !== "object") return null;
  const summary = remoteState.summary;
  if (!summary || typeof summary !== "object") return null;
  return {
    version: String(remoteState.version || ""),
    updatedAt: remoteState.updatedAt || null,
    revision: Number(remoteState.revision || 0),
    date: String(summary.date || ""),
    reports: Number(summary.reports || 0),
    roles: `${Number(summary.roles || 0)}/${Number(summary.roleTarget || 0)}`,
    stores: `${Number(summary.stores || 0)}/${Number(summary.storeTarget || 0)}`,
    openTasks: Number(summary.openTasks || 0)
  };
}

export function latestOperationalSnapshot(states) {
  return (Array.isArray(states) ? states : [])
    .map(productionDataSnapshot)
    .filter((snapshot) => {
      if (!snapshot) return false;
      const storeCount = Number(String(snapshot.stores).split("/")[0] || 0);
      return snapshot.reports > 0 || storeCount > 0;
    })
    .sort((left, right) => right.date.localeCompare(left.date))[0] || null;
}

export function evaluateDeploymentReadiness({
  config,
  localRelease,
  remoteRelease,
  remoteState,
  recentStates = [],
  workingTreeDirty,
  passwordRotationConfirmed,
  initialPasswordRiskAccepted = false
}) {
  const blockers = [];
  const warnings = [];
  const previewDatabaseId = bindingId(config, "preview");
  const productionDatabaseId = bindingId(config, "production");
  const snapshot = productionDataSnapshot(remoteState);
  const recentSnapshot = latestOperationalSnapshot(recentStates);

  if (!productionDatabaseId) {
    blockers.push({ code: "missing-production-db", message: "production 环境缺少 DB 绑定" });
  }
  if (!previewDatabaseId) {
    blockers.push({ code: "missing-preview-db", message: "preview 环境缺少独立 DB 绑定" });
  }
  if (previewDatabaseId && productionDatabaseId && previewDatabaseId === productionDatabaseId) {
    blockers.push({
      code: "shared-preview-production-db",
      message: "preview 与 production 正在共用同一个 D1，禁止远程预览写入"
    });
  }
  if (workingTreeDirty) {
    blockers.push({ code: "working-tree-dirty", message: "发布内容尚未形成可追溯的干净 Git 版本" });
  }
  if (!passwordRotationConfirmed && !initialPasswordRiskAccepted) {
    blockers.push({
      code: "initial-passwords-unconfirmed",
      message: "尚未确认生产账号已完成初始密码轮换"
    });
  } else if (!passwordRotationConfirmed && initialPasswordRiskAccepted) {
    warnings.push({
      code: "initial-password-risk-accepted",
      message: "生产账号仍使用初始密码；已按本次发布授权接受风险，部署后仍建议尽快轮换"
    });
  }
  if (!String(localRelease || "")) {
    blockers.push({ code: "missing-local-release", message: "dist/release.json 缺失" });
  }
  if (!String(remoteRelease || "") || !snapshot || snapshot.revision <= 0 || !snapshot.updatedAt) {
    blockers.push({
      code: "cloud-snapshot-unavailable",
      message: "无法取得有效的生产 release 与只读数据快照"
    });
  }
  if (localRelease && remoteRelease && localRelease === remoteRelease) {
    warnings.push({ code: "release-already-live", message: "本地发布号与云端一致，没有新的静态资源差异" });
  }
  if (snapshot?.roles === "0/4" || snapshot?.stores === "0/6") {
    warnings.push({
      code: "current-day-data-incomplete",
      message: "当前自然日数据尚未覆盖全部岗位或店铺，部署验证应同时检查最近完整日"
    });
  }
  if (recentSnapshot) {
    const [storeCount, storeTarget] = recentSnapshot.stores.split("/").map(Number);
    if (storeCount > storeTarget) {
      warnings.push({
        code: "store-coverage-overflow",
        message: `${recentSnapshot.date} 店铺覆盖为 ${recentSnapshot.stores}，汇总行可能被误计；新版接口必须按标准店铺口径修正`
      });
    }
  }

  return {
    ready: blockers.length === 0,
    localRelease: String(localRelease || ""),
    remoteRelease: String(remoteRelease || ""),
    snapshot,
    recentSnapshot,
    blockers,
    warnings
  };
}

export async function retryRequest(operation, {
  attempts = 3,
  delayMs = 350,
  label = "云端请求"
} = {}) {
  const limit = Math.max(1, Number(attempts) || 1);
  let lastError;
  for (let attempt = 1; attempt <= limit; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < limit && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw new Error(`${label}连续 ${limit} 次失败：${lastError?.message || "未知错误"}`);
}

async function fetchJson(url) {
  return retryRequest(async () => {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) throw new Error(`返回 HTTP ${response.status}`);
    return response.json();
  }, { label: url });
}

function shanghaiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function recentShanghaiDates(days = 8) {
  const [year, month, day] = shanghaiDate().split("-").map(Number);
  const anchor = Date.UTC(year, month - 1, day);
  return Array.from({ length: days }, (_, index) =>
    new Date(anchor - index * 86400000).toISOString().slice(0, 10)
  );
}

async function runCli() {
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const origin = String(process.env.TK_PRODUCTION_ORIGIN || defaultProductionOrigin).replace(/\/$/, "");
  const [configText, releaseText, gitStatus] = await Promise.all([
    readFile(path.join(projectRoot, "wrangler.jsonc"), "utf8"),
    readFile(path.join(projectRoot, "dist", "release.json"), "utf8"),
    execFileAsync("git", ["status", "--porcelain"], { cwd: projectRoot })
  ]);
  const dates = recentShanghaiDates();
  const [remoteReleasePayload, ...recentStates] = await Promise.all([
    fetchJson(`${origin}/release.json`),
    ...dates.map((date) =>
      fetchJson(`${origin}/api/state?summary=1&date=${encodeURIComponent(date)}`)
    )
  ]);
  const remoteState = recentStates[0];
  const result = evaluateDeploymentReadiness({
    config: JSON.parse(configText),
    localRelease: JSON.parse(releaseText).release,
    remoteRelease: remoteReleasePayload.release,
    remoteState,
    recentStates,
    workingTreeDirty: Boolean(gitStatus.stdout.trim()),
    passwordRotationConfirmed: process.env.TK_PRODUCTION_PASSWORDS_ROTATED === "1",
    initialPasswordRiskAccepted: process.env.TK_ACCEPT_INITIAL_PASSWORD_RISK === "1"
  });

  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  runCli().catch((error) => {
    console.error(JSON.stringify({
      ready: false,
      blockers: [{ code: "predeploy-check-failed", message: error.message }]
    }, null, 2));
    process.exitCode = 1;
  });
}
