import { evaluateGeneratedImage } from "@/lib/generation/generated-image-evaluation-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await evaluateGeneratedImage({ generatedImageId: id });

    return Response.json({
      ok: true,
      evaluation: {
        ...result.evaluation,
        createdAt: result.evaluation.createdAt.toISOString(),
      },
      result: result.result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "生成图评估失败",
      },
      { status: 500 },
    );
  }
}
