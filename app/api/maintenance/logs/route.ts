import { readRecentLogs } from "@/lib/logging/app-logger";

export async function GET() {
  const logs = await readRecentLogs(100);
  return Response.json({ ok: true, logs });
}
