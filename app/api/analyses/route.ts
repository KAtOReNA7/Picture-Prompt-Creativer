import { prisma } from "@/lib/db/prisma";
import { countGeneratedImagesForAnalysis } from "@/lib/generation/image-generation-service";
import type { Prisma } from "@prisma/client";

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(pageSize: string | null, limit: string | null): number {
  if (limit && !pageSize) {
    const parsedLimit = Number.parseInt(limit, 10);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) return Math.min(parsedLimit, 100);
  }

  const parsed = Number.parseInt(pageSize ?? "24", 10);
  if ([24, 48, 96].includes(parsed)) return parsed;
  return 24;
}

function getPreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = parsePage(url.searchParams.get("page"));
  const pageSize = parsePageSize(url.searchParams.get("pageSize"), url.searchParams.get("limit"));
  const q = url.searchParams.get("q")?.trim();
  const hasSegments = url.searchParams.get("hasSegments");
  const hasFusions = url.searchParams.get("hasFusions");
  const tagId = url.searchParams.get("tagId")?.trim();
  const tagName = url.searchParams.get("tagName")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const sort = url.searchParams.get("sort") ?? "latest";
  const includeFusionFields = url.searchParams.get("view") === "fusion";
  const filters: Prisma.PromptAnalysisWhereInput[] = [];
  if (tagId) filters.push({ tags: { some: { tagId } } });
  if (tagName) filters.push({ tags: { some: { tag: { name: tagName } } } });
  if (category) filters.push({ tags: { some: { tag: { category } } } });

  const where: Prisma.PromptAnalysisWhereInput = {
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
    ...(filters.length > 0 ? { AND: filters } : {}),
  };

  const total = await prisma.promptAnalysis.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * pageSize;
  const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : sort === "mostFusions" ? { fusions: { _count: "desc" as const } } : { createdAt: "desc" as const };

  const analyses = await prisma.promptAnalysis.findMany({
    where,
    orderBy,
    skip,
    take: pageSize,
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
      importedPromptLanguage: true,
      importMode: true,
      createdAt: true,
      image: {
        select: {
          id: true,
          publicPath: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          segments: true,
          fusions: true,
          variants: true,
        },
      },
    },
  });

  const generatedCounts = await Promise.all(analyses.map(async (analysis) => [analysis.id, await countGeneratedImagesForAnalysis(analysis.id)] as const));
  const generatedCountByAnalysisId = new Map(generatedCounts);
  const items = analyses.map((analysis) => ({
    id: analysis.id,
    imageId: analysis.imageId,
    title: analysis.title,
    previewUrl: getPreviewUrl(analysis.image),
    ...(includeFusionFields
      ? {
          styleSummary: analysis.styleSummary,
          visualSubject: analysis.visualSubject,
          composition: analysis.composition,
          colorPalette: analysis.colorPalette,
          lighting: analysis.lighting,
          reversePromptExists: Boolean(analysis.reversePrompt),
          imagePreviewUrl: getPreviewUrl(analysis.image),
        }
      : {}),
    segmentsCount: analysis._count.segments,
    fusionsCount: analysis._count.fusions,
    variantsCount: analysis._count.variants,
    generatedCount: generatedCountByAnalysisId.get(analysis.id) ?? 0,
    createdAt: analysis.createdAt.toISOString(),
    importedPromptLanguage: analysis.importedPromptLanguage,
    importMode: analysis.importMode,
    tags: analysis.tags.map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      color: item.tag.color,
      category: item.tag.category,
    })),
  }));

  return Response.json({
    ok: true,
    items,
    analyses: items,
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  });
}
