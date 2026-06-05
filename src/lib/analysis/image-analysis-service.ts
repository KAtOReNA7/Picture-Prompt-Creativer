import "server-only";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { IMAGE_ANALYSIS_SYSTEM_PROMPT, buildImageAnalysisUserPrompt } from "@/lib/ai/prompts/image-analysis-prompt";
import { validateImageAnalysisResult, type ImageAnalysisResult } from "@/lib/ai/schemas/image-analysis";

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
    throw new Error(parsed.message);
  }

  if (!rawContent.trim()) {
    throw new Error("模型返回内容为空。");
  }

  const parsedJson = parseModelJson(rawContent);

  if (!parsedJson.ok) {
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const result = validateImageAnalysisResult(parsedJson.value);
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
