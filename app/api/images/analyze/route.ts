import { analyzeImageById } from "@/lib/analysis/image-analysis-service";

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

  if (typeof body !== "object" || body === null || !("imageId" in body) || typeof body.imageId !== "string") {
    return jsonError("imageId 不能为空。");
  }

  try {
    const { analysis, result } = await analyzeImageById(body.imageId);

    return Response.json({
      ok: true,
      analysis: {
        ...analysis,
        createdAt: analysis.createdAt.toISOString(),
      },
      result,
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "图片分析失败。", 500);
  }
}
