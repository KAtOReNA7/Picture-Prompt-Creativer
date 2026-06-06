import { deletePromptAnalyses } from "@/lib/analysis/prompt-analysis-delete-service";

type BatchDeleteRequestBody = {
  ids?: unknown;
};

export async function POST(request: Request) {
  let body: BatchDeleteRequestBody;

  try {
    body = (await request.json()) as BatchDeleteRequestBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  if (!Array.isArray(body.ids)) {
    return Response.json({ ok: false, error: "ids 必须是非空数组" }, { status: 400 });
  }

  const ids = [...new Set(body.ids.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean))];

  if (ids.length === 0) {
    return Response.json({ ok: false, error: "ids 必须是非空数组" }, { status: 400 });
  }

  if (ids.length > 100) {
    return Response.json({ ok: false, error: "单次最多删除 100 条记录，请分批操作。" }, { status: 400 });
  }

  try {
    const result = await deletePromptAnalyses(ids);

    return Response.json({
      ok: true,
      deletedCount: result.deletedCount,
      deletedIds: result.deletedIds,
      notFoundIds: result.notFoundIds,
      skippedGeneratedImagesCount: result.skippedGeneratedImagesCount,
      message: `已删除 ${result.deletedCount} 条 Prompt 记录，原始图片和生成图已保留。`,
    });
  } catch {
    return Response.json({ ok: false, error: "批量删除失败，请稍后重试" }, { status: 500 });
  }
}
