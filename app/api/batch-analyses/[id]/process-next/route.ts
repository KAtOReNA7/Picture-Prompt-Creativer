import { processNextBatchItem } from "@/lib/batch/batch-analysis-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ProcessNextBody = {
  limit?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = (await request.json().catch(() => ({}))) as ProcessNextBody;
    const limit = typeof body.limit === "number" ? body.limit : Number.parseInt(String(body.limit ?? "1"), 10) || 1;
    if (limit !== 1) {
      return Response.json({ ok: false, error: "本阶段每次只处理 1 张图片" }, { status: 400 });
    }

    const result = await processNextBatchItem(id);
    return Response.json({ ...result, ok: true, itemOk: "ok" in result ? result.ok : null });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "处理下一张图片失败" }, { status: 500 });
  }
}
