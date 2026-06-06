import { createExportFile } from "@/lib/export/export-service";
import { appLog } from "@/lib/logging/app-logger";

type ExportBody = {
  type?: unknown;
  ids?: unknown;
  collectionId?: unknown;
  format?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportBody;
    const type = typeof body.type === "string" ? body.type : "";
    const format = typeof body.format === "string" ? body.format : "json";
    const collectionId = typeof body.collectionId === "string" ? body.collectionId : undefined;
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : undefined;

    if (type !== "analyses" && type !== "collection") {
      throw new Error("导出类型不支持");
    }

    const result = await createExportFile({ type, ids, collectionId, format });
    return Response.json({ ok: true, export: result });
  } catch (error) {
    await appLog({ level: "error", scope: "export.create", message: "导出失败", safeDetail: error });
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "导出失败" }, { status: 400 });
  }
}
