import { getBatchTaskDetail, updateBatchTask } from "@/lib/batch/batch-analysis-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateBatchTaskBody = {
  name?: unknown;
  status?: unknown;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const task = await getBatchTaskDetail(id);
    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "批量任务不存在" }, { status: 404 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: UpdateBatchTaskBody;
  try {
    body = (await request.json()) as UpdateBatchTaskBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  try {
    const task = await updateBatchTask(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      status: typeof body.status === "string" ? body.status : undefined,
    });
    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "更新批量任务失败" }, { status: 400 });
  }
}
