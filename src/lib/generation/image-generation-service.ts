import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { requireAiConfig } from "@/lib/ai/models";
import { getOpenAIClient } from "@/lib/ai/openai-client";

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
  } catch {
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
