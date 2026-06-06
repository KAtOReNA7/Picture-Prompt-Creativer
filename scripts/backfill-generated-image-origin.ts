import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??= "file:./dev.db";

const prisma = new PrismaClient();

type BackfillResult = {
  total: number;
  existing: number;
  backfilled: number;
  unresolved: number;
};

async function validateAnalysisId(analysisId: string | null | undefined): Promise<string | null> {
  const id = analysisId?.trim();
  if (!id) return null;

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id },
    select: { id: true },
  });

  return analysis?.id ?? null;
}

async function resolveOriginAnalysisId(input: {
  sourceType: string;
  sourceId?: string | null;
}): Promise<string | null> {
  const sourceId = input.sourceId?.trim();
  if (!sourceId) return null;

  if (input.sourceType === "analysis_reverse_prompt") {
    return validateAnalysisId(sourceId);
  }

  if (input.sourceType === "fusion_prompt") {
    const fusion = await prisma.promptFusion.findUnique({
      where: { id: sourceId },
      select: { analysisId: true },
    });

    return fusion?.analysisId ?? null;
  }

  if (input.sourceType !== "custom_prompt") return null;

  const variant = await prisma.promptVariant.findUnique({
    where: { id: sourceId },
    select: { analysisId: true },
  });

  if (variant?.analysisId) return variant.analysisId;

  const evaluation = await prisma.generatedImageEvaluation.findUnique({
    where: { id: sourceId },
    select: {
      generatedImage: {
        select: {
          originAnalysisId: true,
          sourceType: true,
          sourceId: true,
        },
      },
    },
  });

  const sourceImage = evaluation?.generatedImage;
  if (!sourceImage) return null;
  if (sourceImage.originAnalysisId) return sourceImage.originAnalysisId;

  return resolveOriginAnalysisId({
    sourceType: sourceImage.sourceType,
    sourceId: sourceImage.sourceId,
  });
}

async function main() {
  const images = await prisma.generatedImage.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      sourceType: true,
      sourceId: true,
      originAnalysisId: true,
    },
  });

  const result: BackfillResult = {
    total: images.length,
    existing: images.filter((image) => Boolean(image.originAnalysisId)).length,
    backfilled: 0,
    unresolved: 0,
  };

  for (const image of images) {
    if (image.originAnalysisId) continue;

    const originAnalysisId = await resolveOriginAnalysisId({
      sourceType: image.sourceType,
      sourceId: image.sourceId,
    });

    if (!originAnalysisId) {
      result.unresolved += 1;
      continue;
    }

    await prisma.generatedImage.update({
      where: { id: image.id },
      data: { originAnalysisId },
    });
    result.backfilled += 1;
  }

  console.log("生成图 originAnalysisId 回填报告");
  console.log("================================");
  console.log(`总记录数：${result.total}`);
  console.log(`已有 originAnalysisId 数：${result.existing}`);
  console.log(`成功回填数：${result.backfilled}`);
  console.log(`无法推断数：${result.unresolved}`);
}

main()
  .catch((error) => {
    console.error("回填失败：", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
