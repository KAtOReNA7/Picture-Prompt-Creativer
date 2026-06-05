import "server-only";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import {
  buildGeneratedImageEvaluationUserPrompt,
  GENERATED_IMAGE_EVALUATION_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/generated-image-evaluation-prompt";
import {
  GeneratedImageEvaluationResult,
  validateGeneratedImageEvaluationResult,
} from "@/lib/ai/schemas/generated-image-evaluation";
import { generatedImageContentType } from "@/lib/generation/image-generation-service";

type EvaluateGeneratedImageInput = {
  generatedImageId: string;
};

type EvaluateGeneratedImageOutput = {
  evaluation: {
    id: string;
    generatedImageId: string;
    overallScore: number;
    promptMatchScore: number;
    styleRetentionScore: number | null;
    requirementMatchScore: number | null;
    compositionScore: number;
    colorScore: number;
    lightingScore: number;
    subjectScore: number;
    commercialPotentialScore: number;
    summary: string;
    strengths: string;
    weaknesses: string;
    improvementAdvice: string;
    improvedPrompt: string;
    improvedNegativePrompt: string | null;
    createdAt: Date;
  };
  result: GeneratedImageEvaluationResult;
};

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

async function buildSourceContext(sourceType: string, sourceId: string | null): Promise<{ sourceContext: string; warnings: string[] }> {
  const warnings: string[] = [];

  if (sourceType === "analysis_reverse_prompt") {
    if (!sourceId) {
      return { sourceContext: "", warnings: ["sourceId 为空，无法读取 PromptAnalysis。"] };
    }

    const analysis = await prisma.promptAnalysis.findUnique({
      where: { id: sourceId },
    });

    if (!analysis) {
      return { sourceContext: "", warnings: ["未找到关联的 PromptAnalysis，仅基于生成图和 prompt 评估。"] };
    }

    return {
      warnings,
      sourceContext: `
来源为 PromptAnalysis：
- 标题：${analysis.title ?? "无"}
- 风格摘要：${analysis.styleSummary ?? "无"}
- 画面主体：${analysis.visualSubject ?? "无"}
- 构图：${analysis.composition ?? "无"}
- 色彩：${analysis.colorPalette ?? "无"}
- 光影：${analysis.lighting ?? "无"}
- 材质：${analysis.texture ?? "无"}
- 年代感：${analysis.eraFeeling ?? "无"}
- 题材卖点：${analysis.topicPotential ?? "无"}
`.trim(),
    };
  }

  if (sourceType === "fusion_prompt") {
    if (!sourceId) {
      return { sourceContext: "", warnings: ["sourceId 为空，无法读取 PromptFusion。"] };
    }

    const fusion = await prisma.promptFusion.findUnique({
      where: { id: sourceId },
      include: {
        analysis: true,
      },
    });

    if (!fusion) {
      return { sourceContext: "", warnings: ["未找到关联的 PromptFusion，仅基于生成图和 prompt 评估。"] };
    }

    return {
      warnings,
      sourceContext: `
来源为 PromptFusion：
- 用户新需求：${fusion.userRequirement}
- 融合说明：${fusion.changeSummary ?? "无"}
- 原分析标题：${fusion.analysis.title ?? "无"}
- 原风格摘要：${fusion.analysis.styleSummary ?? "无"}
- 原画面主体：${fusion.analysis.visualSubject ?? "无"}
- 原构图：${fusion.analysis.composition ?? "无"}
- 原色彩：${fusion.analysis.colorPalette ?? "无"}
- 原光影：${fusion.analysis.lighting ?? "无"}
- 原材质：${fusion.analysis.texture ?? "无"}
- 原题材卖点：${fusion.analysis.topicPotential ?? "无"}
`.trim(),
    };
  }

  if (sourceType === "custom_prompt") {
    return {
      sourceContext: "来源为 custom_prompt，无额外原图或用户需求上下文。",
      warnings,
    };
  }

  return { sourceContext: "", warnings: [`未知 sourceType：${sourceType}，仅基于生成图和 prompt 评估。`] };
}

export async function evaluateGeneratedImage(input: EvaluateGeneratedImageInput): Promise<EvaluateGeneratedImageOutput> {
  if (!input.generatedImageId) {
    throw new Error("生成图 ID 不能为空");
  }

  const generatedImage = await prisma.generatedImage.findUnique({
    where: { id: input.generatedImageId },
  });

  if (!generatedImage) {
    throw new Error("生成图不存在");
  }

  let file: Buffer;
  try {
    file = await readFile(generatedImage.localPath);
  } catch {
    throw new Error("生成图文件不存在");
  }

  const config = requireAiConfig();
  const client = getOpenAIClient();
  const { sourceContext, warnings } = await buildSourceContext(generatedImage.sourceType, generatedImage.sourceId);
  const dataUrl = toDataUrl(file, generatedImageContentType(generatedImage.format));
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
          content: GENERATED_IMAGE_EVALUATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildGeneratedImageEvaluationUserPrompt({
                prompt: generatedImage.prompt,
                negativePrompt: generatedImage.negativePrompt,
                sourceType: generatedImage.sourceType,
                sourceId: generatedImage.sourceId,
                generatedModel: generatedImage.model,
                size: generatedImage.size,
                quality: generatedImage.quality,
                format: generatedImage.format,
                sourceContext,
                warnings,
              }),
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
    throw new Error("模型返回内容为空");
  }

  const parsedJson = parseModelJson(rawContent);
  if (!parsedJson.ok) {
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const result = validateGeneratedImageEvaluationResult(parsedJson.value);
  const evaluation = await prisma.generatedImageEvaluation.create({
    data: {
      generatedImageId: generatedImage.id,
      overallScore: result.overallScore,
      promptMatchScore: result.promptMatchScore,
      styleRetentionScore: result.styleRetentionScore,
      requirementMatchScore: result.requirementMatchScore,
      compositionScore: result.compositionScore,
      colorScore: result.colorScore,
      lightingScore: result.lightingScore,
      subjectScore: result.subjectScore,
      commercialPotentialScore: result.commercialPotentialScore,
      summary: result.summary,
      strengths: JSON.stringify(result.strengths),
      weaknesses: JSON.stringify(result.weaknesses),
      improvementAdvice: JSON.stringify(result.improvementAdvice),
      improvedPrompt: result.improvedPrompt,
      improvedNegativePrompt: result.improvedNegativePrompt,
      rawJson: parsedJson.rawJson,
    },
    select: {
      id: true,
      generatedImageId: true,
      overallScore: true,
      promptMatchScore: true,
      styleRetentionScore: true,
      requirementMatchScore: true,
      compositionScore: true,
      colorScore: true,
      lightingScore: true,
      subjectScore: true,
      commercialPotentialScore: true,
      summary: true,
      strengths: true,
      weaknesses: true,
      improvementAdvice: true,
      improvedPrompt: true,
      improvedNegativePrompt: true,
      createdAt: true,
    },
  });

  return {
    evaluation,
    result,
  };
}
