import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { requireAiConfig } from "@/lib/ai/models";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { appLog } from "@/lib/logging/app-logger";

export const IMAGE_SOURCE_TYPES = ["analysis_reverse_prompt", "fusion_prompt", "custom_prompt"] as const;
export const IMAGE_SIZES = ["1024x1024", "1024x1536", "1536x1024", "auto"] as const;
export const IMAGE_QUALITIES = ["low", "medium", "high", "auto"] as const;
export const IMAGE_FORMATS = ["png", "jpeg", "webp"] as const;

export type ImageSourceType = (typeof IMAGE_SOURCE_TYPES)[number];
export type ImageSize = (typeof IMAGE_SIZES)[number];
export type ImageQuality = (typeof IMAGE_QUALITIES)[number];
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export type GenerateImageInput = {
  prompt: string;
  negativePrompt?: string;
  sourceType: ImageSourceType;
  sourceId?: string;
  originAnalysisId?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  format?: ImageFormat;
};

export type GenerateImageOutput = {
  image: {
    id: string;
    prompt: string;
    negativePrompt: string | null;
    sourceType: string;
    sourceId: string | null;
    model: string;
    size: string;
    quality: string | null;
    format: string | null;
    originAnalysisId: string | null;
    fileUrl: string;
    createdAt: string;
  };
};

function assertOneOf<T extends readonly string[]>(value: string, allowed: T, label: string): asserts value is T[number] {
  if (!allowed.includes(value)) {
    throw new Error(`${label} 不支持，请使用：${allowed.join("、")}`);
  }
}

function isMostlyEnglish(text: string): boolean {
  const chineseChars = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = (text.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length;
  return latinWords >= 5 && chineseChars <= Math.max(4, text.length * 0.08);
}

function extensionForFormat(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

function buildPrompt(prompt: string, negativePrompt?: string): string {
  const trimmedNegative = negativePrompt?.trim();
  if (!trimmedNegative) return prompt;
  return `${prompt}\n\nAvoid: ${trimmedNegative}`;
}

async function bufferFromImageUrl(url: string): Promise<Buffer> {
  let response: Response;

  try {
    response = await fetch(url);
  } catch {
    throw new Error("图片下载失败，请检查中转站返回的图片地址是否可访问");
  }

  if (!response.ok) {
    throw new Error(`图片下载失败，HTTP ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function parseGenerationError(error: unknown): string {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase();

    if (normalized.includes("moderation") || normalized.includes("safety") || normalized.includes("content policy")) {
      return "内容审核拒绝生成，请调整 Prompt 后重试";
    }

    if (normalized.includes("image") && normalized.includes("not support")) {
      return "当前模型不支持 images.generate，请检查 OPENAI_IMAGE_MODEL";
    }

    if (normalized.includes("unsupported") || normalized.includes("not supported")) {
      return "模型或参数不支持图片生成，请检查 OPENAI_IMAGE_MODEL、size、quality 和 format";
    }
  }

  const parsed = parseAiError(error);
  return parsed.message;
}

async function validateAnalysisId(analysisId: string | undefined): Promise<string | null> {
  const id = analysisId?.trim();
  if (!id) return null;

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id },
    select: { id: true },
  });

  return analysis?.id ?? null;
}

export async function resolveGeneratedImageOriginAnalysisId(input: {
  sourceType: string;
  sourceId?: string | null;
  explicitOriginAnalysisId?: string | null;
}): Promise<string | null> {
  const explicit = await validateAnalysisId(input.explicitOriginAnalysisId ?? undefined);
  if (explicit) return explicit;

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

  return resolveGeneratedImageOriginAnalysisId({
    sourceType: sourceImage.sourceType,
    sourceId: sourceImage.sourceId,
  });
}

export async function legacyGeneratedImageIdsForAnalysis(analysisId: string): Promise<string[]> {
  const [fusions, variants] = await Promise.all([
    prisma.promptFusion.findMany({ where: { analysisId }, select: { id: true } }),
    prisma.promptVariant.findMany({ where: { analysisId }, select: { id: true } }),
  ]);
  const directImages = await prisma.generatedImage.findMany({
    where: {
      OR: [
        { sourceType: "analysis_reverse_prompt", sourceId: analysisId },
        { sourceType: "fusion_prompt", sourceId: { in: fusions.map((fusion) => fusion.id) } },
        { sourceType: "custom_prompt", sourceId: { in: variants.map((variant) => variant.id) } },
      ],
    },
    select: { id: true },
  });
  const directImageIds = directImages.map((image) => image.id);
  const evaluations = directImageIds.length
    ? await prisma.generatedImageEvaluation.findMany({
        where: { generatedImageId: { in: directImageIds } },
        select: { id: true },
      })
    : [];
  const improvedImages = evaluations.length
    ? await prisma.generatedImage.findMany({
        where: {
          sourceType: "custom_prompt",
          sourceId: { in: evaluations.map((evaluation) => evaluation.id) },
        },
        select: { id: true },
      })
    : [];

  return [...new Set([...directImageIds, ...improvedImages.map((image) => image.id)])];
}

export async function generatedImageWhereForAnalysis(analysisId: string) {
  const legacyIds = await legacyGeneratedImageIdsForAnalysis(analysisId);

  return {
    OR: [
      { originAnalysisId: analysisId },
      ...(legacyIds.length > 0 ? [{ id: { in: legacyIds } }] : []),
    ],
  };
}

export async function countGeneratedImagesForAnalysis(analysisId: string): Promise<number> {
  return prisma.generatedImage.count({
    where: await generatedImageWhereForAnalysis(analysisId),
  });
}

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  const prompt = input.prompt.trim();

  if (!prompt) {
    throw new Error("Prompt 不能为空");
  }

  if (!isMostlyEnglish(prompt)) {
    throw new Error("Prompt 必须是英文或主要为英文，请先使用英文 Prompt 生成测试图");
  }

  const sourceType = input.sourceType;
  assertOneOf(sourceType, IMAGE_SOURCE_TYPES, "sourceType");

  const size = input.size ?? "1024x1024";
  const quality = input.quality ?? "medium";
  const format = input.format ?? "png";
  assertOneOf(size, IMAGE_SIZES, "size");
  assertOneOf(quality, IMAGE_QUALITIES, "quality");
  assertOneOf(format, IMAGE_FORMATS, "format");

  const config = requireAiConfig();
  const client = getOpenAIClient();
  const finalPrompt = buildPrompt(prompt, input.negativePrompt);
  const originAnalysisId = await resolveGeneratedImageOriginAnalysisId({
    sourceType,
    sourceId: input.sourceId,
    explicitOriginAnalysisId: input.originAnalysisId,
  });

  let imageData: { b64_json?: string | null; url?: string | null } | undefined;

  try {
    const response = await client.images.generate({
      model: config.imageModel,
      prompt: finalPrompt,
      size,
      quality,
      n: 1,
      response_format: "b64_json",
    });
    imageData = response.data?.[0];
  } catch (error) {
    await appLog({ level: "error", scope: "image.generate", message: "图片生成失败", safeDetail: error });
    throw new Error(parseGenerationError(error));
  }

  if (!imageData?.b64_json && !imageData?.url) {
    throw new Error("中转站返回格式异常，未找到 b64_json 或 url");
  }

  let buffer: Buffer;

  try {
    buffer = imageData.b64_json ? Buffer.from(imageData.b64_json, "base64") : await bufferFromImageUrl(imageData.url as string);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("图片下载失败");
  }

  const uploadsDir = path.join(process.cwd(), "uploads", "generated");
  const filename = `${randomUUID()}.${extensionForFormat(format)}`;
  const localPath = path.join(uploadsDir, filename);

  try {
    await mkdir(uploadsDir, { recursive: true });
    await writeFile(localPath, buffer);
  } catch (error) {
    await appLog({ level: "error", scope: "image.generate.save", message: "生成图保存失败", safeDetail: error });
    throw new Error("图片保存失败");
  }

  const record = await prisma.generatedImage.create({
    data: {
      prompt,
      negativePrompt: input.negativePrompt?.trim() || null,
      sourceType,
      sourceId: input.sourceId?.trim() || null,
      model: config.imageModel,
      size,
      quality,
      format,
      filename,
      localPath,
      publicPath: null,
      originAnalysisId,
    },
  });

  return {
    image: {
      id: record.id,
      prompt: record.prompt,
      negativePrompt: record.negativePrompt,
      sourceType: record.sourceType,
      sourceId: record.sourceId,
      model: record.model,
      size: record.size,
      quality: record.quality,
      format: record.format,
      originAnalysisId: record.originAnalysisId,
      fileUrl: `/api/generated-images/${record.id}/file`,
      createdAt: record.createdAt.toISOString(),
    },
  };
}

export function generatedImageContentType(format: string | null | undefined): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}
