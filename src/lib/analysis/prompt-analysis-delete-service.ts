import "server-only";
import { prisma } from "@/lib/db/prisma";

export type DeletePromptAnalysesResult = {
  deletedCount: number;
  notFoundIds: string[];
  skippedGeneratedImagesCount: number;
  deletedIds: string[];
};

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

export async function deletePromptAnalyses(ids: string[]): Promise<DeletePromptAnalysesResult> {
  const targetIds = uniqueIds(ids);
  if (targetIds.length === 0) {
    return {
      deletedCount: 0,
      notFoundIds: [],
      skippedGeneratedImagesCount: 0,
      deletedIds: [],
    };
  }

  return prisma.$transaction(async (tx) => {
    const analyses = await tx.promptAnalysis.findMany({
      where: { id: { in: targetIds } },
      select: { id: true },
    });
    const foundIds = analyses.map((analysis) => analysis.id);
    const foundSet = new Set(foundIds);
    const notFoundIds = targetIds.filter((id) => !foundSet.has(id));

    if (foundIds.length === 0) {
      return {
        deletedCount: 0,
        notFoundIds,
        skippedGeneratedImagesCount: 0,
        deletedIds: [],
      };
    }

    const [variants, fusions] = await Promise.all([
      tx.promptVariant.findMany({
        where: { analysisId: { in: foundIds } },
        select: { id: true },
      }),
      tx.promptFusion.findMany({
        where: { analysisId: { in: foundIds } },
        select: { id: true },
      }),
    ]);

    const variantIds = variants.map((variant) => variant.id);
    const fusionIds = fusions.map((fusion) => fusion.id);

    await tx.collectionItem.deleteMany({
      where: {
        OR: [
          { itemType: "analysis", itemId: { in: foundIds } },
          ...(variantIds.length > 0 ? [{ itemType: "prompt_variant", itemId: { in: variantIds } }] : []),
        ],
      },
    });

    const skippedGeneratedImagesCount = await tx.generatedImage.count({
      where: {
        OR: [
          { originAnalysisId: { in: foundIds } },
          { sourceType: "analysis_reverse_prompt", sourceId: { in: foundIds } },
          ...(fusionIds.length > 0 ? [{ sourceType: "fusion_prompt", sourceId: { in: fusionIds } }] : []),
          ...(variantIds.length > 0 ? [{ sourceType: "custom_prompt", sourceId: { in: variantIds } }] : []),
        ],
      },
    });

    const deleteResult = await tx.promptAnalysis.deleteMany({
      where: { id: { in: foundIds } },
    });

    return {
      deletedCount: deleteResult.count,
      notFoundIds,
      skippedGeneratedImagesCount,
      deletedIds: foundIds,
    };
  });
}
