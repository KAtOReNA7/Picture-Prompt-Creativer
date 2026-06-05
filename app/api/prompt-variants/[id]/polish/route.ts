import { polishPromptVariant } from "@/lib/analysis/prompt-variant-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const result = await polishPromptVariant({ variantId: id });

    return Response.json({
      ok: true,
      variant: {
        id: result.variant.id,
        analysisId: result.variant.analysisId,
        title: result.variant.title,
        composedPrompt: result.variant.composedPrompt,
        negativePrompt: result.variant.negativePrompt,
        source: result.variant.source,
        createdAt: result.variant.createdAt.toISOString(),
      },
      changeSummary: result.changeSummary,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "AI 润色失败",
      },
      { status: 500 },
    );
  }
}
