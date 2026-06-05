import { segmentPromptByAnalysisId } from "@/lib/analysis/prompt-segmentation-service";

function jsonError(error: string, status = 400): Response {
  return Response.json(
    {
      ok: false,
      error,
    },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  if (typeof body !== "object" || body === null || !("analysisId" in body) || typeof body.analysisId !== "string") {
    return jsonError("analysisId 不能为空。");
  }

  try {
    const result = await segmentPromptByAnalysisId(body.analysisId);
    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Prompt 拆解失败。", 500);
  }
}
