import { execFile } from "node:child_process";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const LOCAL_PREVIEW_LAUNCH_AGENT_LABEL = "com.tk-workbench.local-preview";

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function plistValue(value, indent = "  ") {
  if (value === true) return `${indent}<true/>`;
  if (value === false) return `${indent}<false/>`;
  if (typeof value === "number") return `${indent}<integer>${value}</integer>`;
  if (typeof value === "string") return `${indent}<string>${xmlEscape(value)}</string>`;
  if (Array.isArray(value)) {
    const items = value.map((item) => plistValue(item, `${indent}  `)).join("\n");
    return `${indent}<array>\n${items}\n${indent}</array>`;
  }
  const entries = Object.entries(value)
    .map(([key, item]) => `${indent}  <key>${xmlEscape(key)}</key>\n${plistValue(item, `${indent}  `)}`)
    .join("\n");
  return `${indent}<dict>\n${entries}\n${indent}</dict>`;
}

export function localPreviewLaunchAgentDefinition({ projectRoot, homeDir, nodeExecutable }) {
  const nodeDirectory = path.dirname(nodeExecutable);
  const logDirectory = path.join(projectRoot, ".local-preview");
  return {
    Label: LOCAL_PREVIEW_LAUNCH_AGENT_LABEL,
    ProgramArguments: [
      "/usr/bin/env",
      "node",
      path.join(projectRoot, "scripts", "dev-local-service-entry.mjs")
    ],
    WorkingDirectory: projectRoot,
    RunAtLoad: true,
    KeepAlive: true,
    ProcessType: "Interactive",
    ThrottleInterval: 2,
    StandardOutPath: path.join(logDirectory, "service.log"),
    StandardErrorPath: path.join(logDirectory, "service-error.log"),
    EnvironmentVariables: {
      HOME: homeDir,
      PATH: `${path.join(homeDir, ".local", "bin")}:${nodeDirectory}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`
    }
  };
}

export function localPreviewLaunchAgentPlist(options) {
  const definition = localPreviewLaunchAgentDefinition(options);
  const body = Object.entries(definition)
    .map(([key, value]) => `  <key>${xmlEscape(key)}</key>\n${plistValue(value, "  ")}`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
${body}
</dict>
</plist>
`;
}

export function localPreviewLaunchAgentTargets(uid) {
  const domain = `gui/${uid}`;
  return {
    domain,
    service: `${domain}/${LOCAL_PREVIEW_LAUNCH_AGENT_LABEL}`
  };
}

export function localPreviewLaunchAgentBootstrapDelay(attempt) {
  const retry = Math.max(0, Number(attempt) || 0);
  return Math.min(1600, 200 * (2 ** retry));
}

export function shouldRetryLaunchAgentBootstrap({ error, attempt }) {
  return Number(error?.code) === 5 && Number(attempt) < 5;
}

function launchAgentPaths({ projectRoot, homeDir }) {
  return {
    logDirectory: path.join(projectRoot, ".local-preview"),
    plistDirectory: path.join(homeDir, "Library", "LaunchAgents"),
    plistPath: path.join(homeDir, "Library", "LaunchAgents", `${LOCAL_PREVIEW_LAUNCH_AGENT_LABEL}.plist`)
  };
}

async function runLaunchctl(args, { allowFailure = false, inherit = false } = {}) {
  try {
    return await execFileAsync("launchctl", args, inherit ? { encoding: "utf8" } : undefined);
  } catch (error) {
    if (allowFailure) return null;
    throw error;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function bootstrapLaunchAgent({ domain, plistPath }) {
  let attempt = 0;
  while (true) {
    try {
      await runLaunchctl(["bootstrap", domain, plistPath]);
      return;
    } catch (error) {
      if (!shouldRetryLaunchAgentBootstrap({ error, attempt })) throw error;
      await wait(localPreviewLaunchAgentBootstrapDelay(attempt));
      attempt += 1;
    }
  }
}

export async function installLocalPreviewLaunchAgent({ projectRoot, homeDir, nodeExecutable, uid }) {
  const paths = launchAgentPaths({ projectRoot, homeDir });
  const targets = localPreviewLaunchAgentTargets(uid);
  await mkdir(paths.logDirectory, { recursive: true });
  await mkdir(paths.plistDirectory, { recursive: true });
  await writeFile(
    paths.plistPath,
    localPreviewLaunchAgentPlist({ projectRoot, homeDir, nodeExecutable }),
    "utf8"
  );
  await runLaunchctl(["bootout", targets.service], { allowFailure: true });
  await bootstrapLaunchAgent({ domain: targets.domain, plistPath: paths.plistPath });
  await runLaunchctl(["kickstart", "-k", targets.service]);
  return { ...paths, ...targets };
}

export async function uninstallLocalPreviewLaunchAgent({ projectRoot, homeDir, uid }) {
  const paths = launchAgentPaths({ projectRoot, homeDir });
  const targets = localPreviewLaunchAgentTargets(uid);
  await runLaunchctl(["bootout", targets.service], { allowFailure: true });
  await unlink(paths.plistPath).catch((error) => {
    if (error?.code !== "ENOENT") throw error;
  });
  return { ...paths, ...targets };
}

export async function printLocalPreviewLaunchAgent({ uid }) {
  const { service } = localPreviewLaunchAgentTargets(uid);
  return runLaunchctl(["print", service]);
}

async function main() {
  const command = process.argv[2] || "install";
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const options = {
    projectRoot,
    homeDir: os.homedir(),
    nodeExecutable: process.execPath,
    uid: process.getuid()
  };
  if (command === "install") {
    const result = await installLocalPreviewLaunchAgent(options);
    console.log(`[local-preview] 系统常驻服务已安装：${result.service}`);
    console.log("[local-preview] 固定地址：http://127.0.0.1:52098/");
    return;
  }
  if (command === "status") {
    const result = await printLocalPreviewLaunchAgent(options);
    process.stdout.write(result.stdout);
    return;
  }
  if (command === "uninstall") {
    await uninstallLocalPreviewLaunchAgent(options);
    console.log("[local-preview] 系统常驻服务已卸载。");
    return;
  }
  throw new Error(`未知命令：${command}`);
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error("[local-preview] LaunchAgent 操作失败：", error);
    process.exitCode = 1;
  });
}
