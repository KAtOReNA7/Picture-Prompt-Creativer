import { fusePromptByAnalysisId } from "@/lib/analysis/prompt-fusion-service";

function jsonError(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("请求体必须是 JSON。");
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("analysisId" in body) ||
    typeof body.analysisId !== "string" ||
    !("userRequirement" in body) ||
    typeof body.userRequirement !== "string"
  ) {
    return jsonError("analysisId 和 userRequirement 不能为空。");
  }

  try {
    const { fusion, result } = await fusePromptByAnalysisId(body.analysisId, body.userRequirement);

    return Response.json({
      ok: true,
      fusion: {
        ...fusion,
        createdAt: fusion.createdAt.toISOString(),
      },
      result,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "风格迁移 Prompt 生成失败。", 500);
  }
}
