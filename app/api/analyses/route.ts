import { prisma } from "@/lib/db/prisma";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "20", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20;
  }

  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const hasSegments = url.searchParams.get("hasSegments");
  const hasFusions = url.searchParams.get("hasFusions");
  const sort = url.searchParams.get("sort") ?? "latest";
  const limit = parseLimit(url.searchParams.get("limit"));
  const where = {
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { styleSummary: { contains: q } },
            { visualSubject: { contains: q } },
            { reversePrompt: { contains: q } },
          ],
        }
      : {}),
    ...(hasSegments === "true" ? { segments: { some: {} } } : {}),
    ...(hasSegments === "false" ? { segments: { none: {} } } : {}),
    ...(hasFusions === "true" ? { fusions: { some: {} } } : {}),
    ...(hasFusions === "false" ? { fusions: { none: {} } } : {}),
  };

  const analyses = await prisma.promptAnalysis.findMany({
    where,
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: sort === "mostFusions" ? Math.max(limit, 50) : limit,
    select: {
      id: true,
      imageId: true,
      title: true,
      styleSummary: true,
      visualSubject: true,
      composition: true,
      colorPalette: true,
      lighting: true,
      reversePrompt: true,
      createdAt: true,
      image: {
        select: {
          id: true,
          originalName: true,
          publicPath: true,
        },
      },
      _count: {
        select: {
          segments: true,
          fusions: true,
        },
      },
    },
  });

  const sortedAnalyses =
    sort === "mostFusions"
      ? [...analyses].sort((a, b) => b._count.fusions - a._count.fusions || b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit)
      : analyses;
  const generatedCounts = await Promise.all(
    sortedAnalyses.map(async (analysis) => {
      const fusionIds = await prisma.promptFusion.findMany({
        where: { analysisId: analysis.id },
        select: { id: true },
      });
      const count = await prisma.generatedImage.count({
        where: {
          OR: [
            { sourceType: "analysis_reverse_prompt", sourceId: analysis.id },
            {
              sourceType: "fusion_prompt",
              sourceId: {
                in: fusionIds.map((fusion) => fusion.id),
              },
            },
          ],
        },
      });

      return [analysis.id, count] as const;
    }),
  );
  const generatedCountByAnalysisId = new Map(generatedCounts);

  return Response.json({
    ok: true,
    analyses: sortedAnalyses.map((analysis) => ({
      id: analysis.id,
      imageId: analysis.imageId,
      title: analysis.title,
      styleSummary: analysis.styleSummary,
      visualSubject: analysis.visualSubject,
      composition: analysis.composition,
      colorPalette: analysis.colorPalette,
      lighting: analysis.lighting,
      reversePromptExists: Boolean(analysis.reversePrompt),
      segmentsCount: analysis._count.segments,
      fusionsCount: analysis._count.fusions,
      createdAt: analysis.createdAt.toISOString(),
      imageOriginalName: analysis.image?.originalName ?? null,
      imagePreviewUrl: analysis.image ? (analysis.image.publicPath ?? `/api/images/${analysis.image.id}/file`) : null,
      generatedCount: generatedCountByAnalysisId.get(analysis.id) ?? 0,
    })),
  });
}
