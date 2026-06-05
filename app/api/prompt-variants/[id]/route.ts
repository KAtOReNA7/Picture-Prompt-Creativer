import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const variant = await prisma.promptVariant.findUnique({
    where: { id },
    include: {
      analysis: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!variant) {
    return Response.json({ ok: false, error: "PromptVariant 不存在" }, { status: 404 });
  }

  const generatedImages = await prisma.generatedImage.findMany({
    where: {
      sourceType: "custom_prompt",
      sourceId: variant.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      model: true,
      size: true,
      quality: true,
      format: true,
      createdAt: true,
    },
  });

  return Response.json({
    ok: true,
    variant: {
      id: variant.id,
      analysisId: variant.analysisId,
      analysisTitle: variant.analysis.title,
      title: variant.title,
      userNote: variant.userNote,
      composedPrompt: variant.composedPrompt,
      negativePrompt: variant.negativePrompt,
      editedSegmentsJson: variant.editedSegmentsJson,
      source: variant.source,
      createdAt: variant.createdAt.toISOString(),
    },
    generatedImages: generatedImages.map((image) => ({
      ...image,
      fileUrl: `/api/generated-images/${image.id}/file`,
      createdAt: image.createdAt.toISOString(),
    })),
  });
}
