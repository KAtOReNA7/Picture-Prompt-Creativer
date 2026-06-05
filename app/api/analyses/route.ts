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
  const limit = parseLimit(url.searchParams.get("limit"));
  const analyses = await prisma.promptAnalysis.findMany({
    where: q
      ? {
          OR: [
            { title: { contains: q } },
            { styleSummary: { contains: q } },
            { visualSubject: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
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

  return Response.json({
    ok: true,
    analyses: analyses.map((analysis) => ({
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
      imagePreviewUrl: analysis.image.publicPath ?? `/api/images/${analysis.imageId}/file`,
    })),
  });
}
