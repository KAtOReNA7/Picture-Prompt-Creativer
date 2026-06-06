import { createBatchTask, listBatchTasks } from "@/lib/batch/batch-analysis-service";

type CreateBatchTaskBody = {
  name?: unknown;
  totalCount?: unknown;
  concurrency?: unknown;
};

function intValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  let body: CreateBatchTaskBody;
  try {
    body = (await request.json()) as CreateBatchTaskBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  const totalCount = intValue(body.totalCount);
  const concurrency = intValue(body.concurrency) ?? 1;

  if (!totalCount || totalCount < 1 || totalCount > 100) {
    return Response.json({ ok: false, error: "totalCount 必须是 1 到 100 之间的数字" }, { status: 400 });
  }
  if (concurrency < 1 || concurrency > 2) {
    return Response.json({ ok: false, error: "concurrency 必须是 1 或 2" }, { status: 400 });
  }

  try {
    const task = await createBatchTask({
      name: typeof body.name === "string" ? body.name : "未命名批量逆向任务",
      totalCount,
      concurrency,
    });
    return Response.json({ ok: true, task });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "创建批量任务失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = intValue(url.searchParams.get("limit")) ?? 20;
  const status = url.searchParams.get("status");

  try {
    const tasks = await listBatchTasks({ status, limit });
    return Response.json({ ok: true, tasks });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "获取批量任务失败" }, { status: 400 });
  }
}
