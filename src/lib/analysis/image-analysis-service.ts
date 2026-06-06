import "server-only";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { IMAGE_ANALYSIS_SYSTEM_PROMPT, buildImageAnalysisUserPrompt } from "@/lib/ai/prompts/image-analysis-prompt";
import { validateImageAnalysisResult, type ImageAnalysisResult } from "@/lib/ai/schemas/image-analysis";
import { appLog } from "@/lib/logging/app-logger";

type AnalyzeImageOutput = {
  analysis: {
    id: string;
    imageId: string | null;
    title: string | null;
    styleSummary: string | null;
    visualSubject: string | null;
    composition: string | null;
    colorPalette: string | null;
    lighting: string | null;
    texture: string | null;
    eraFeeling: string | null;
    topicPotential: string | null;
    reversePrompt: string | null;
    negativePrompt: string | null;
    createdAt: Date;
  };
  result: ImageAnalysisResult;
};

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function normalizeImageAnalysisError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (message.includes("模型返回内容为空")) {
    return "模型未能返回有效分析结果，可能是图片内容过少或尺寸过小。建议更换更清晰或更大尺寸图片。";
  }

  if (message.includes("无法解析为 JSON") || message.includes("没有找到完整 JSON 对象")) {
    return "模型返回内容不是有效 JSON，已记录日志。可能是图片内容过少、模型响应异常或中转站返回被截断。";
  }

  if (message.includes("字段") || message.includes("replaceableFields") || message.includes("tags 必须是数组")) {
    return "模型返回的结构化分析字段不完整，可能是图片缺少可识别视觉内容。请更换更清晰的图片后重试。";
  }

  if (
    normalized.includes("too small") ||
    normalized.includes("blank") ||
    normalized.includes("empty image") ||
    normalized.includes("low resolution")
  ) {
    return "图片可能过小或缺少可识别视觉内容，请更换更清晰或更大尺寸图片。";
  }

  return message;
}

export async function analyzeImageById(imageId: string): Promise<AnalyzeImageOutput> {
  if (!imageId) {
    throw new Error("图片 ID 不能为空。");
  }

  const image = await prisma.imageAsset.findUnique({
    where: { id: imageId },
  });

  if (!image) {
    throw new Error("图片不存在。");
  }

  let file: Buffer;

  try {
    file = await readFile(image.localPath);
  } catch {
    throw new Error("图片文件不存在。");
  }

  const config = requireAiConfig();
  const client = getOpenAIClient();
  const dataUrl = toDataUrl(file, image.mimeType);
  let rawContent = "";

  try {
    const stream = await client.chat.completions.create({
      model: config.visionModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content: IMAGE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildImageAnalysisUserPrompt(),
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    for await (const chunk of stream) {
      rawContent += chunk.choices?.[0]?.delta?.content ?? "";
    }
  } catch (error) {
    const parsed = parseAiError(error);
    await appLog({ level: "error", scope: "image.analysis", message: "图片逆向分析 AI 调用失败", safeDetail: error });
    if (parsed.message === "未知 AI 错误，请检查服务配置后重试。") {
      throw new Error("模型未能识别这张图片，可能是图片过小、内容过少、空白或模型侧无法处理。建议更换更清晰或更大尺寸图片。");
    }
    throw new Error(parsed.message);
  }

  if (!rawContent.trim()) {
    const message = "模型未能返回有效分析结果，可能是图片内容过少或尺寸过小。建议更换更清晰或更大尺寸图片。";
    await appLog({ level: "error", scope: "image.analysis.empty", message: "图片逆向分析模型返回空内容", safeDetail: { imageId, mimeType: image.mimeType, size: image.size } });
    throw new Error(message);
  }

  const parsedJson = parseModelJson(rawContent);

  if (!parsedJson.ok) {
    await appLog({ level: "error", scope: "image.analysis.json", message: "图片逆向分析模型返回非 JSON", safeDetail: parsedJson.detail ?? parsedJson.error });
    throw new Error("模型返回内容不是有效 JSON，已记录日志。可能是图片内容过少、模型响应异常或中转站返回被截断。");
  }

  let result: ImageAnalysisResult;

  try {
    result = validateImageAnalysisResult(parsedJson.value);
  } catch (error) {
    const message = normalizeImageAnalysisError(error);
    await appLog({ level: "error", scope: "image.analysis.schema", message: "图片逆向分析模型返回字段不完整", safeDetail: error });
    throw new Error(message);
  }
  const analysis = await prisma.promptAnalysis.create({
    data: {
      imageId,
      title: result.title,
      styleSummary: result.style,
      visualSubject: result.subject,
      composition: result.composition,
      colorPalette: result.colorPalette,
      lighting: result.lighting,
      texture: result.texture,
      eraFeeling: result.eraFeeling,
      topicPotential: result.topicPotential,
      reversePrompt: result.reversePromptEnglish,
      negativePrompt: result.negativePromptEnglish,
      rawJson: parsedJson.rawJson,
    },
    select: {
      id: true,
      imageId: true,
      title: true,
      styleSummary: true,
      visualSubject: true,
      composition: true,
      colorPalette: true,
      lighting: true,
      texture: true,
      eraFeeling: true,
      topicPotential: true,
      reversePrompt: true,
      negativePrompt: true,
      createdAt: true,
    },
  });

  return {
    analysis,
    result,
  };
}
