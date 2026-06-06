import { cleanupMaintenance } from "@/lib/maintenance/maintenance-service";

type CleanupBody = {
  deleteOrphanUploadFiles?: unknown;
  deleteOrphanGeneratedFiles?: unknown;
  deleteOldExports?: unknown;
  deleteOldBackups?: unknown;
  olderThanDays?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CleanupBody;
    const result = await cleanupMaintenance({
      deleteOrphanUploadFiles: body.deleteOrphanUploadFiles === true,
      deleteOrphanGeneratedFiles: body.deleteOrphanGeneratedFiles === true,
      deleteOldExports: body.deleteOldExports === true,
      deleteOldBackups: body.deleteOldBackups === true,
      olderThanDays: typeof body.olderThanDays === "number" ? body.olderThanDays : 30,
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "清理失败" }, { status: 400 });
  }
}
