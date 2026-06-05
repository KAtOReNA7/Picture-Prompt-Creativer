import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 8000;

type CheckStatus = "通过" | "失败" | "跳过";

type CheckResult = {
  name: string;
  status: CheckStatus;
  detail: string;
};

function resolveCommand(command: string, args: string[]): { command: string; args: string[] } {
  if (process.platform === "win32" && command === "npm") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", ["npm", ...args].join(" ")],
    };
  }

  return { command, args };
}

async function runCommand(command: string, args: string[] = []): Promise<string> {
  const resolved = resolveCommand(command, args);
  const { stdout, stderr } = await execFileAsync(resolved.command, resolved.args, {
    timeout: TIMEOUT_MS,
    windowsHide: true,
  });

  return `${stdout}${stderr}`.trim();
}

async function commandCheck(name: string, command: string, args: string[]): Promise<CheckResult> {
  try {
    const output = await runCommand(command, args);
    return {
      name,
      status: "通过",
      detail: output || "命令执行成功，但没有输出。",
    };
  } catch (error) {
    return {
      name,
      status: "失败",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchCheck(name: string, url: string, init?: RequestInit): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });

    return {
      name,
      status: response.ok ? "通过" : "失败",
      detail: `HTTP ${response.status} ${response.statusText}`,
    };
  } catch (error) {
    return {
      name,
      status: "失败",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function portCheck(host: string, port: number): Promise<CheckResult> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        name: `本机代理端口 ${host}:${port}`,
        status: "失败",
        detail: "连接超时。",
      });
    }, 1500);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve({
        name: `本机代理端口 ${host}:${port}`,
        status: "通过",
        detail: "端口可连接。",
      });
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      resolve({
        name: `本机代理端口 ${host}:${port}`,
        status: "失败",
        detail: error.message,
      });
    });
  });
}

function parseEnvLocal(): { exists: boolean; values: Record<string, string> } {
  const envPath = path.join(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return { exists: false, values: {} };
  }

  const content = readFileSync(envPath, "utf8");
  const values: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    values[key] = unquoteEnvValue(rawValue);
  }

  return { exists: true, values };
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function maskSecret(value: string | undefined): string {
  if (!value) {
    return "不存在";
  }

  if (value.length <= 8) {
    return "存在，长度不超过 8 位，已隐藏完整内容。";
  }

  return `存在，掩码：${value.slice(0, 4)}...${value.slice(-4)}`;
}

function printResult(result: CheckResult): void {
  const mark = result.status === "通过" ? "[通过]" : result.status === "跳过" ? "[跳过]" : "[失败]";
  console.log(`${mark} ${result.name}`);
  console.log(`  ${result.detail}`);
}

async function main(): Promise<void> {
  const envLocal = parseEnvLocal();
  const openAiBaseUrl = envLocal.values.OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
  const openAiApiKey = envLocal.values.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const checks: CheckResult[] = [];

  checks.push(await commandCheck("node -v", "node", ["-v"]));
  checks.push(await commandCheck("npm -v", "npm", ["-v"]));
  checks.push(await commandCheck("git --version", "git", ["--version"]));
  checks.push(await commandCheck("git remote -v", "git", ["remote", "-v"]));
  checks.push(await commandCheck("git ls-remote origin HEAD", "git", ["ls-remote", "origin", "HEAD"]));
  checks.push(await commandCheck("npm config get registry", "npm", ["config", "get", "registry"]));
  checks.push(await fetchCheck("访问 https://registry.npmjs.org", "https://registry.npmjs.org"));
  checks.push(await fetchCheck("访问 https://registry.npmmirror.com", "https://registry.npmmirror.com"));

  for (const port of [7890, 10808, 10809]) {
    checks.push(await portCheck("127.0.0.1", port));
  }

  checks.push({
    name: "读取 .env.local",
    status: envLocal.exists ? "通过" : "跳过",
    detail: envLocal.exists ? ".env.local 存在，已读取。" : ".env.local 不存在。",
  });
  checks.push({
    name: ".env.local OPENAI_BASE_URL",
    status: openAiBaseUrl ? "通过" : "跳过",
    detail: openAiBaseUrl || "不存在。",
  });
  checks.push({
    name: ".env.local OPENAI_API_KEY",
    status: openAiApiKey ? "通过" : "跳过",
    detail: maskSecret(openAiApiKey),
  });

  if (openAiBaseUrl) {
    const modelsUrl = `${openAiBaseUrl.replace(/\/+$/, "")}/models`;
    checks.push(
      await fetchCheck(`请求 ${modelsUrl}`, modelsUrl, {
        headers: openAiApiKey ? { Authorization: `Bearer ${openAiApiKey}` } : undefined,
      }),
    );
  } else {
    checks.push({
      name: "OPENAI_BASE_URL /models 连通性",
      status: "跳过",
      detail: "OPENAI_BASE_URL 不存在，跳过 /models 请求。",
    });
  }

  console.log("Picture Prompt Creativer 环境诊断报告");
  console.log("=".repeat(48));

  for (const check of checks) {
    printResult(check);
  }

  const passedCount = checks.filter((check) => check.status === "通过").length;
  const failedCount = checks.filter((check) => check.status === "失败").length;
  const skippedCount = checks.filter((check) => check.status === "跳过").length;

  console.log("=".repeat(48));
  console.log(`诊断完成：通过 ${passedCount} 项，失败 ${failedCount} 项，跳过 ${skippedCount} 项。`);
}

main().catch((error) => {
  console.error("环境诊断脚本执行异常：");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
