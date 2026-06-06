import { retryBatchItem } from "@/lib/batch/batch-analysis-service";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id, itemId } = await context.params;
  try {
    const item = await retryBatchItem(id, itemId);
    return Response.json({ ok: true, item });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "重试失败项失败" }, { status: 400 });
  }
}
