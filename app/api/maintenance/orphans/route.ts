import { getOrphanReport } from "@/lib/maintenance/maintenance-service";

export async function GET() {
  try {
    return Response.json(await getOrphanReport());
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "孤儿文件检查失败" }, { status: 500 });
  }
}
