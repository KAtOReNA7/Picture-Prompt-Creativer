import { prisma } from "@/lib/db/prisma";
import { deletePromptAnalyses } from "@/lib/analysis/prompt-analysis-delete-service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function imagePreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id },
    include: {
      image: true,
      segments: {
        orderBy: { sortOrder: "asc" },
      },
      fusions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!analysis) {
    return Response.json({ ok: false, error: "未找到该 Prompt 分析记录" }, { status: 404 });
  }

  return Response.json({
    ok: true,
    analysis: {
      id: analysis.id,
      imageId: analysis.imageId,
      title: analysis.title,
      styleSummary: analysis.styleSummary,
      visualSubject: analysis.visualSubject,
      composition: analysis.composition,
      colorPalette: analysis.colorPalette,
      lighting: analysis.lighting,
      texture: analysis.texture,
      eraFeeling: analysis.eraFeeling,
      topicPotential: analysis.topicPotential,
      reversePrompt: analysis.reversePrompt,
      negativePrompt: analysis.negativePrompt,
      createdAt: analysis.createdAt.toISOString(),
      image: analysis.image
        ? {
            id: analysis.image.id,
            originalName: analysis.image.originalName,
            mimeType: analysis.image.mimeType,
            size: analysis.image.size,
            previewUrl: imagePreviewUrl(analysis.image),
          }
        : null,
      segments: analysis.segments.map((segment) => ({
        id: segment.id,
        type: segment.type,
        label: segment.label,
        content: segment.content,
        isReplaceable: segment.isReplaceable,
        replaceHint: segment.replaceHint,
        sortOrder: segment.sortOrder,
      })),
      fusions: analysis.fusions.map((fusion) => ({
        id: fusion.id,
        userRequirement: fusion.userRequirement,
        fusedPrompt: fusion.fusedPrompt,
        changeSummary: fusion.changeSummary,
        createdAt: fusion.createdAt.toISOString(),
      })),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!analysis) {
    return Response.json({ ok: false, error: "未找到该 Prompt 分析记录" }, { status: 404 });
  }

  await deletePromptAnalyses([id]);

  return Response.json({
    ok: true,
    message: "已删除 Prompt 记录，原始图片和生成图已保留。",
  });
}
