import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { PROMPT_SEGMENTATION_SYSTEM_PROMPT, buildPromptSegmentationUserPrompt } from "@/lib/ai/prompts/prompt-segmentation-prompt";
import { validatePromptSegmentationResult, type PromptSegmentationResult } from "@/lib/ai/schemas/prompt-segmentation";

type SavedPromptSegment = {
  id: string;
  type: string;
  label: string;
  content: string;
  isReplaceable: boolean;
  replaceHint: string | null;
  sortOrder: number;
};

type SegmentPromptOutput = {
  analysisId: string;
  segments: SavedPromptSegment[];
  templateSummary: string;
  replacementStrategy: string;
};

async function requestSegmentationJson(prompt: string): Promise<string> {
  const config = requireAiConfig();
  const client = getOpenAIClient();
  let rawContent = "";

  try {
    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.1,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content: PROMPT_SEGMENTATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
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

  return rawContent;
}

export async function segmentPromptByAnalysisId(analysisId: string): Promise<SegmentPromptOutput> {
  if (!analysisId) {
    throw new Error("analysisId 不能为空。");
  }

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id: analysisId },
    select: {
      id: true,
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
    },
  });

  if (!analysis) {
    throw new Error("analysisId 不存在。");
  }

  if (!analysis.reversePrompt?.trim()) {
    throw new Error("reversePrompt 为空，无法拆解。");
  }

  const prompt = buildPromptSegmentationUserPrompt({
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
  });
  const rawContent = await requestSegmentationJson(prompt);
  const parsedJson = parseModelJson(rawContent);

  if (!parsedJson.ok) {
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const result: PromptSegmentationResult = validatePromptSegmentationResult(parsedJson.value);

  await prisma.$transaction(async (tx) => {
    await tx.promptSegment.deleteMany({
      where: { analysisId },
    });

    for (const segment of result.segments) {
      await tx.promptSegment.create({
        data: {
          analysisId,
          type: segment.type,
          label: segment.label,
          content: segment.content,
          isReplaceable: segment.isReplaceable,
          replaceHint: segment.replaceHint,
          sortOrder: segment.sortOrder,
        },
      });
    }
  });

  const segments = await prisma.promptSegment.findMany({
    where: { analysisId },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      type: true,
      label: true,
      content: true,
      isReplaceable: true,
      replaceHint: true,
      sortOrder: true,
    },
  });

  return {
    analysisId,
    segments,
    templateSummary: result.templateSummary,
    replacementStrategy: result.replacementStrategy,
  };
}
