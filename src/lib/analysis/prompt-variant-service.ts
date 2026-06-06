import "server-only";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";

export type EditablePromptSegment = {
  type: string;
  label: string;
  content: string;
  isEnabled: boolean;
  sortOrder: number;
};

type ComposePromptVariantInput = {
  analysisId: string;
  title: string;
  userNote?: string;
  editedSegments: EditablePromptSegment[];
  negativePrompt?: string;
};

type PolishPromptVariantInput = {
  variantId: string;
};

function normalizeSegmentContent(content: string): string {
  return content.trim().replace(/\s+/g, " ");
}

function joinPromptSegments(segments: EditablePromptSegment[]): string {
  const normalized = segments
    .toSorted((a, b) => a.sortOrder - b.sortOrder)
    .map((segment) => normalizeSegmentContent(segment.content))
    .filter(Boolean);

  return normalized
    .map((content, index) => {
      if (index === 0) return content.replace(/[,.]\s*$/, "");
      return content.replace(/^[,.\s]+/, "").replace(/[,.]\s*$/, "");
    })
    .join(", ")
    .replace(/\s+,/g, ",")
    .trim();
}

function cleanText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePolishResult(value: unknown): {
  title: string;
  polishedPromptEnglish: string;
  negativePromptEnglish: string;
  changeSummary: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("模型返回格式异常：必须是 JSON 对象");
  }

  const object = value as Record<string, unknown>;
  const title = typeof object.title === "string" ? object.title.trim() : "";
  const polishedPromptEnglish = typeof object.polishedPromptEnglish === "string" ? object.polishedPromptEnglish.trim() : "";
  const negativePromptEnglish = typeof object.negativePromptEnglish === "string" ? object.negativePromptEnglish.trim() : "";
  const changeSummary = typeof object.changeSummary === "string" ? object.changeSummary.trim() : "";

  if (!title || !polishedPromptEnglish || !negativePromptEnglish || !changeSummary) {
    throw new Error("模型返回格式异常：润色结果字段不完整");
  }

  return { title, polishedPromptEnglish, negativePromptEnglish, changeSummary };
}

export async function composePromptVariant(input: ComposePromptVariantInput) {
  const analysisId = input.analysisId.trim();
  const title = input.title.trim();

  if (!analysisId) {
    throw new Error("analysisId 不能为空");
  }

  if (!title) {
    throw new Error("请填写模板版本标题");
  }

  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id: analysisId },
    select: { id: true },
  });

  if (!analysis) {
    throw new Error("analysisId 不存在");
  }

  const enabledSegments = input.editedSegments
    .filter((segment) => segment.isEnabled)
    .map((segment) => ({
      ...segment,
      content: normalizeSegmentContent(segment.content),
    }))
    .filter((segment) => segment.content);

  if (enabledSegments.length < 3) {
    throw new Error("至少需要启用 3 个 Prompt 模块");
  }

  const negativePrompt = cleanText(input.negativePrompt);

  const composedPrompt = joinPromptSegments(enabledSegments);

  return prisma.promptVariant.create({
    data: {
      analysisId,
      title,
      userNote: cleanText(input.userNote),
      composedPrompt,
      negativePrompt,
      editedSegmentsJson: JSON.stringify(input.editedSegments),
      source: "manual_compose",
    },
  });
}

export async function polishPromptVariant(input: PolishPromptVariantInput) {
  const variant = await prisma.promptVariant.findUnique({
    where: { id: input.variantId },
  });

  if (!variant) {
    throw new Error("PromptVariant 不存在");
  }

  const config = requireAiConfig();
  const client = getOpenAIClient();
  let rawContent = "";

  try {
    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.25,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "你是专业 AI 图像 prompt 工程师。请在不改变核心主体、场景、风格、语言倾向和商业用途的前提下，润色 image2 prompt。输出严格 JSON，不要 Markdown。title 和 changeSummary 使用中文，polishedPromptEnglish 和 negativePromptEnglish 字段名保持不变，但内容可以根据原 Prompt 使用中文、英文或中英混合。",
        },
        {
          role: "user",
          content: `
原标题：${variant.title}
备注：${variant.userNote ?? "无"}
原 prompt：
${variant.composedPrompt}

原 negative prompt：
${variant.negativePrompt ?? "无"}

请返回：
{
  "title": "中文标题",
  "polishedPromptEnglish": "润色后的完整 prompt，可保留原语言",
  "negativePromptEnglish": "negative prompt，可保留原语言",
  "changeSummary": "中文，说明润色做了什么"
}
`.trim(),
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
    throw new Error("AI 润色失败：模型返回内容为空");
  }

  const parsedJson = parseModelJson(rawContent);
  if (!parsedJson.ok) {
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const result = parsePolishResult(parsedJson.value);
  const polished = await prisma.promptVariant.create({
    data: {
      analysisId: variant.analysisId,
      title: `${variant.title} AI润色版`,
      userNote: result.changeSummary,
      composedPrompt: result.polishedPromptEnglish,
      negativePrompt: result.negativePromptEnglish,
      editedSegmentsJson: variant.editedSegmentsJson,
      source: "ai_polished",
    },
  });

  return {
    variant: polished,
    changeSummary: result.changeSummary,
  };
}
