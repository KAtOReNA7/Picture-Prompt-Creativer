import { readFile } from "node:fs/promises";
import path from "node:path";
import { resolveExportFile } from "@/lib/export/export-service";

type RouteContext = {
  params: Promise<{ filename: string }>;
};

function contentType(filename: string): string {
  if (filename.endsWith(".json")) return "application/json; charset=utf-8";
  if (filename.endsWith(".md")) return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { filename } = await context.params;
    const filePath = resolveExportFile(filename);
    const content = await readFile(filePath);

    return new Response(content, {
      headers: {
        "Content-Type": contentType(filename),
        "Content-Disposition": `attachment; filename="${path.basename(filename)}"`,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "导出文件不存在" }, { status: 404 });
  }
}
