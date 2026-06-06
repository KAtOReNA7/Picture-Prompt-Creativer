import { addItemToBatchTask } from "@/lib/batch/batch-analysis-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AddBatchItemBody = {
  imageId?: unknown;
  originalName?: unknown;
  sortOrder?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: AddBatchItemBody;
  try {
    body = (await request.json()) as AddBatchItemBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  if (typeof body.imageId !== "string" || !body.imageId.trim()) {
    return Response.json({ ok: false, error: "imageId 不能为空" }, { status: 400 });
  }

  try {
    const item = await addItemToBatchTask({
      taskId: id,
      imageId: body.imageId,
      originalName: typeof body.originalName === "string" ? body.originalName : "",
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : Number.parseInt(String(body.sortOrder ?? "0"), 10) || 0,
    });
    return Response.json({ ok: true, item });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "添加任务图片失败" }, { status: 400 });
  }
}
