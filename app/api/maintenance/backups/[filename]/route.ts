import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveBackupFile } from "@/lib/maintenance/maintenance-service";

type RouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { filename } = await context.params;
    const filePath = resolveBackupFile(filename);
    const content = await readFile(filePath);

    return new Response(content, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${path.basename(filename)}"`,
      },
    });
  } catch {
    return Response.json({ ok: false, error: "备份文件不存在" }, { status: 404 });
  }
}
