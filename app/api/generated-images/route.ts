import { prisma } from "@/lib/db/prisma";
import { generatedImageWhereForAnalysis } from "@/lib/generation/image-generation-service";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "20", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceType = url.searchParams.get("sourceType")?.trim();
  const sourceId = url.searchParams.get("sourceId")?.trim();
  const originAnalysisId = url.searchParams.get("originAnalysisId")?.trim();
  const limit = parseLimit(url.searchParams.get("limit"));
  const originWhere = originAnalysisId ? await generatedImageWhereForAnalysis(originAnalysisId) : null;

  const images = await prisma.generatedImage.findMany({
    where: {
      ...(originWhere ?? {}),
      ...(sourceType ? { sourceType } : {}),
      ...(sourceId ? { sourceId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  return Response.json({
    ok: true,
    images: images.map((image) => ({
      id: image.id,
      prompt: image.prompt,
      negativePrompt: image.negativePrompt,
      sourceType: image.sourceType,
      sourceId: image.sourceId,
      originAnalysisId: image.originAnalysisId,
      model: image.model,
      size: image.size,
      quality: image.quality,
      format: image.format,
      fileUrl: `/api/generated-images/${image.id}/file`,
      createdAt: image.createdAt.toISOString(),
      evaluationCount: image._count.evaluations,
      latestEvaluation: image.evaluations[0]
        ? {
            overallScore: image.evaluations[0].overallScore,
            promptMatchScore: image.evaluations[0].promptMatchScore,
            styleRetentionScore: image.evaluations[0].styleRetentionScore,
            requirementMatchScore: image.evaluations[0].requirementMatchScore,
            commercialPotentialScore: image.evaluations[0].commercialPotentialScore,
            summary: image.evaluations[0].summary,
            hasImprovedPrompt: Boolean(image.evaluations[0].improvedPrompt),
          }
        : null,
    })),
  });
}
