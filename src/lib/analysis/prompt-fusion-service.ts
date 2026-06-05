import "server-only";
import { prisma } from "@/lib/db/prisma";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { PROMPT_FUSION_SYSTEM_PROMPT, buildPromptFusionUserPrompt } from "@/lib/ai/prompts/prompt-fusion-prompt";
import { validatePromptFusionResult, type PromptFusionResult } from "@/lib/ai/schemas/prompt-fusion";

type PromptFusionOutput = {
  fusion: {
    id: string;
    analysisId: string;
    userRequirement: string;
    fusedPrompt: string;
    changeSummary: string | null;
    createdAt: Date;
  };
  result: PromptFusionResult;
};

async function requestFusionJson(prompt: string): Promise<string> {
  const config = requireAiConfig();
  const client = getOpenAIClient();
  let rawContent = "";

  try {
    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content: PROMPT_FUSION_SYSTEM_PROMPT,
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

export async function fusePromptByAnalysisId(analysisId: string, userRequirement: string): Promise<PromptFusionOutput> {
  const requirement = userRequirement.trim();

  if (!analysisId) {
    throw new Error("analysisId 不能为空。");
  }

  if (!requirement) {
    throw new Error("新需求不能为空。");
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
      segments: {
        orderBy: { sortOrder: "asc" },
        select: {
          type: true,
          label: true,
          content: true,
          isReplaceable: true,
          replaceHint: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!analysis) {
    throw new Error("analysisId 不存在。");
  }

  if (!analysis.reversePrompt?.trim()) {
    throw new Error("reversePrompt 为空，无法进行风格迁移。");
  }

  const prompt = buildPromptFusionUserPrompt({
    userRequirement: requirement,
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
    segments: analysis.segments,
  });
  const rawContent = await requestFusionJson(prompt);
  const parsedJson = parseModelJson(rawContent);

  if (!parsedJson.ok) {
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const result = validatePromptFusionResult(parsedJson.value);
  const fusion = await prisma.promptFusion.create({
    data: {
      analysisId,
      userRequirement: requirement,
      fusedPrompt: result.finalPromptEnglish,
      changeSummary: result.changeSummary,
    },
    select: {
      id: true,
      analysisId: true,
      userRequirement: true,
      fusedPrompt: true,
      changeSummary: true,
      createdAt: true,
    },
  });

  return {
    fusion,
    result,
  };
}
