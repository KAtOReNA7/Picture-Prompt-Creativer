import { createBackup } from "@/lib/maintenance/maintenance-service";

export async function POST() {
  try {
    const backup = await createBackup();
    return Response.json({ ok: true, backup });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "创建备份失败" }, { status: 500 });
  }
}
