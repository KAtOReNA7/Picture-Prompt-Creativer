import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { itemTypeLabel } from "@/lib/collections/collection-service";

export type ExportFormat = "json" | "markdown";
export type ExportType = "analyses" | "collection";

const EXPORT_DIR = path.join(process.cwd(), "exports");

function assertExportFormat(value: string): asserts value is ExportFormat {
  if (value !== "json" && value !== "markdown") {
    throw new Error("导出格式不支持");
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
}

async function getAnalysisExportData(ids: string[]) {
  if (ids.length === 0) {
    throw new Error("请选择要导出的 Prompt 记录");
  }

  const analyses = await prisma.promptAnalysis.findMany({
    where: { id: { in: ids } },
    include: {
      image: { select: { id: true, originalName: true, mimeType: true, size: true } },
      tags: { include: { tag: true } },
      segments: { orderBy: { sortOrder: "asc" } },
      fusions: { orderBy: { createdAt: "desc" } },
      variants: { orderBy: { createdAt: "desc" } },
    },
  });

  if (analyses.length === 0) {
    throw new Error("没有找到可导出的 Prompt 记录");
  }

  const generatedImages = await prisma.generatedImage.findMany({
    where: {
      OR: [
        { sourceType: "analysis_reverse_prompt", sourceId: { in: analyses.map((analysis) => analysis.id) } },
        { sourceType: "fusion_prompt", sourceId: { in: analyses.flatMap((analysis) => analysis.fusions.map((fusion) => fusion.id)) } },
        { sourceType: "custom_prompt", sourceId: { in: analyses.flatMap((analysis) => analysis.variants.map((variant) => variant.id)) } },
      ],
    },
    include: {
      evaluations: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return analyses.map((analysis) => ({
    id: analysis.id,
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
          previewUrl: `/api/images/${analysis.image.id}/file`,
        }
      : null,
    tags: analysis.tags.map((item) => ({
      id: item.tag.id,
      name: item.tag.name,
      color: item.tag.color,
    })),
    segments: analysis.segments.map((segment) => ({
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
    variants: analysis.variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      source: variant.source,
      composedPrompt: variant.composedPrompt,
      negativePrompt: variant.negativePrompt,
      userNote: variant.userNote,
      createdAt: variant.createdAt.toISOString(),
    })),
    generatedImages: generatedImages
      .filter((image) => {
        if (image.sourceType === "analysis_reverse_prompt") return image.sourceId === analysis.id;
        if (image.sourceType === "fusion_prompt") return analysis.fusions.some((fusion) => fusion.id === image.sourceId);
        if (image.sourceType === "custom_prompt") return analysis.variants.some((variant) => variant.id === image.sourceId);
        return false;
      })
      .map((image) => ({
        id: image.id,
        sourceType: image.sourceType,
        sourceId: image.sourceId,
        model: image.model,
        size: image.size,
        quality: image.quality,
        format: image.format,
        fileUrl: `/api/generated-images/${image.id}/file`,
        latestEvaluation: image.evaluations[0]
          ? {
              id: image.evaluations[0].id,
              overallScore: image.evaluations[0].overallScore,
              promptMatchScore: image.evaluations[0].promptMatchScore,
              styleRetentionScore: image.evaluations[0].styleRetentionScore,
              commercialPotentialScore: image.evaluations[0].commercialPotentialScore,
              summary: image.evaluations[0].summary,
              improvementAdvice: image.evaluations[0].improvementAdvice,
              improvedPrompt: image.evaluations[0].improvedPrompt,
              improvedNegativePrompt: image.evaluations[0].improvedNegativePrompt,
              createdAt: image.evaluations[0].createdAt.toISOString(),
            }
          : null,
        createdAt: image.createdAt.toISOString(),
      })),
  }));
}

async function getCollectionExportData(collectionId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!collection) {
    throw new Error("合集不存在");
  }

  const analysisIds = collection.items.filter((item) => item.itemType === "analysis").map((item) => item.itemId);
  const analyses = analysisIds.length > 0 ? await getAnalysisExportData(analysisIds) : [];
  const variants = await prisma.promptVariant.findMany({
    where: { id: { in: collection.items.filter((item) => item.itemType === "prompt_variant").map((item) => item.itemId) } },
    include: { analysis: { select: { id: true, title: true } } },
  });
  const generatedImages = await prisma.generatedImage.findMany({
    where: { id: { in: collection.items.filter((item) => item.itemType === "generated_image").map((item) => item.itemId) } },
    include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return {
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      useCase: collection.useCase,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    },
    items: collection.items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      itemTypeLabel: itemTypeLabel(item.itemType),
      itemId: item.itemId,
      note: item.note,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      analysis: item.itemType === "analysis" ? analyses.find((analysis) => analysis.id === item.itemId) ?? null : null,
      promptVariant:
        item.itemType === "prompt_variant"
          ? variants.find((variant) => variant.id === item.itemId)
            ? {
                id: item.itemId,
                title: variants.find((variant) => variant.id === item.itemId)?.title,
                composedPrompt: variants.find((variant) => variant.id === item.itemId)?.composedPrompt,
                negativePrompt: variants.find((variant) => variant.id === item.itemId)?.negativePrompt,
                analysis: variants.find((variant) => variant.id === item.itemId)?.analysis,
              }
            : null
          : null,
      generatedImage:
        item.itemType === "generated_image"
          ? generatedImages.find((image) => image.id === item.itemId)
            ? {
                id: item.itemId,
                sourceType: generatedImages.find((image) => image.id === item.itemId)?.sourceType,
                fileUrl: `/api/generated-images/${item.itemId}/file`,
                latestEvaluation: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]
                  ? {
                      id: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.id,
                      overallScore: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.overallScore,
                      promptMatchScore: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.promptMatchScore,
                      styleRetentionScore: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.styleRetentionScore,
                      summary: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.summary,
                      improvedPrompt: generatedImages.find((image) => image.id === item.itemId)?.evaluations[0]?.improvedPrompt,
                    }
                  : null,
              }
            : null
          : null,
    })),
  };
}

function renderAnalysisMarkdown(analysis: Awaited<ReturnType<typeof getAnalysisExportData>>[number]): string {
  const lines = [
    `## ${analysis.title ?? "未命名 Prompt 模板"}`,
    "",
    `- ID：${analysis.id}`,
    `- 标签：${analysis.tags.map((tag) => tag.name).join("、") || "无"}`,
    `- 风格摘要：${analysis.styleSummary ?? "无"}`,
    `- 主体：${analysis.visualSubject ?? "无"}`,
    "",
    "### Reverse Prompt",
    "",
    analysis.reversePrompt ?? "无",
    "",
    "### Negative Prompt",
    "",
    analysis.negativePrompt ?? "无",
    "",
    "### Prompt 模块",
    "",
    ...analysis.segments.map((segment) => `- ${segment.label} (${segment.type})：${segment.content}`),
    "",
    "### PromptVariant",
    "",
    ...analysis.variants.map((variant) => `- ${variant.title} (${variant.source})：${variant.composedPrompt}`),
    "",
    "### Fusion",
    "",
    ...analysis.fusions.map((fusion) => `- ${fusion.userRequirement}：${fusion.fusedPrompt}`),
    "",
    "### GeneratedImage",
    "",
    ...analysis.generatedImages.map((image) => `- ${image.id}：${image.sourceType}，评分：${image.latestEvaluation?.overallScore ?? "未评估"}，摘要：${image.latestEvaluation?.summary ?? "无"}`),
    "",
  ];

  return lines.join("\n");
}

function renderMarkdown(type: ExportType, data: unknown): string {
  if (type === "analyses") {
    return [`# Prompt 分析导出`, "", ...(data as Awaited<ReturnType<typeof getAnalysisExportData>>).map(renderAnalysisMarkdown)].join("\n");
  }

  const collectionData = data as Awaited<ReturnType<typeof getCollectionExportData>>;
  return [
    `# 合集：${collectionData.collection.name}`,
    "",
    `- 用途：${collectionData.collection.useCase ?? "未填写"}`,
    `- 描述：${collectionData.collection.description ?? "未填写"}`,
    `- 更新时间：${collectionData.collection.updatedAt}`,
    "",
    "## 素材列表",
    "",
    ...collectionData.items.map((item) => {
      if (item.analysis) return `### ${item.itemTypeLabel}：${item.analysis.title ?? item.itemId}\n\n${renderAnalysisMarkdown(item.analysis)}`;
      if (item.promptVariant) return `### ${item.itemTypeLabel}：${item.promptVariant.title ?? item.itemId}\n\n${item.promptVariant.composedPrompt ?? "无"}`;
      if (item.generatedImage) return `### ${item.itemTypeLabel}：${item.generatedImage.id}\n\n- 图片：${item.generatedImage.fileUrl}\n- 最近评分：${item.generatedImage.latestEvaluation?.overallScore ?? "未评估"}\n- 评估摘要：${item.generatedImage.latestEvaluation?.summary ?? "无"}`;
      return `### ${item.itemTypeLabel}：${item.itemId}\n\n素材不存在或已删除。`;
    }),
    "",
  ].join("\n");
}

export async function createExportFile(input: {
  type: ExportType;
  ids?: string[];
  collectionId?: string;
  format: string;
}) {
  assertExportFormat(input.format);

  if (input.type !== "analyses" && input.type !== "collection") {
    throw new Error("导出类型不支持");
  }

  const data = input.type === "analyses" ? await getAnalysisExportData(input.ids ?? []) : await getCollectionExportData(input.collectionId ?? "");
  const ext = input.format === "json" ? "json" : "md";
  const base = input.type === "collection" ? `collection-${sanitizeFilenamePart(input.collectionId ?? "unknown")}` : "analyses";
  const filename = `${timestamp()}-${base}-${randomUUID().slice(0, 8)}.${ext}`;
  const content = input.format === "json" ? JSON.stringify(data, null, 2) : renderMarkdown(input.type, data);

  await mkdir(EXPORT_DIR, { recursive: true });
  await writeFile(path.join(EXPORT_DIR, filename), content, "utf8");

  return {
    filename,
    downloadUrl: `/api/export/${filename}`,
    format: input.format,
  };
}

export function resolveExportFile(filename: string): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) {
    throw new Error("文件名不合法");
  }

  return path.join(EXPORT_DIR, filename);
}
