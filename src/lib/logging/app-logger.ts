import "server-only";
import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

export type AppLogLevel = "info" | "warn" | "error";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "app.log");

function sanitizeDetail(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;

  let text = typeof value === "string" ? value : JSON.stringify(value);

  text = text.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-****");
  text = text.replace(/data:image\/[a-zA-Z+.-]+;base64,[A-Za-z0-9+/=]+/g, "[base64 image omitted]");

  if (text.length > 500) {
    text = `${text.slice(0, 500)}...`;
  }

  return text;
}

export async function appLog(input: {
  level: AppLogLevel;
  scope: string;
  message: string;
  safeDetail?: unknown;
}) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const entry = {
      time: new Date().toISOString(),
      level: input.level,
      scope: input.scope,
      message: input.message,
      safeDetail: sanitizeDetail(input.safeDetail),
    };
    await appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch {
    // Logging must never break user-facing workflows.
  }
}

export async function readRecentLogs(limit = 100) {
  try {
    const content = await readFile(LOG_FILE, "utf8");
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line) as {
            time: string;
            level: AppLogLevel;
            scope: string;
            message: string;
            safeDetail?: string;
          };
        } catch {
          return {
            time: new Date(0).toISOString(),
            level: "warn" as const,
            scope: "logger",
            message: "日志行解析失败",
            safeDetail: line.slice(0, 500),
          };
        }
      })
      .reverse();
  } catch {
    return [];
  }
}
