import "server-only";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { requireAiConfig } from "@/lib/ai/models";
import { getOpenAIClient } from "@/lib/ai/openai-client";

export type SuggestedTag = {
  name: string;
  reason: string;
  category: string;
};

function assertSuggestionPayload(value: unknown): SuggestedTag[] {
  const list =
    Array.isArray(value)
      ? value
      : typeof value === "object" && value !== null
        ? (value as { suggestedTags?: unknown; tags?: unknown; suggestions?: unknown }).suggestedTags ??
          (value as { tags?: unknown }).tags ??
          (value as { suggestions?: unknown }).suggestions
        : null;

  if (!Array.isArray(list)) {
    throw new Error("AI 返回格式异常，缺少 suggestedTags。");
  }

  const tags = list
    .map((item) => {
      if (typeof item === "string") {
        const name = item.trim();
        return name ? { name, reason: "AI 根据当前 Prompt 素材上下文推荐。", category: "用途" } : null;
      }

      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const rawName = record.name ?? record.tag ?? record.label ?? record["标签"] ?? record["名称"];
      const rawReason = record.reason ?? record["理由"] ?? record["推荐理由"] ?? record.description;
      const rawCategory = record.category ?? record["类别"] ?? record["分类"] ?? record.type;
      const name = typeof rawName === "string" ? rawName.trim() : "";
      const reason = typeof rawReason === "string" && rawReason.trim() ? rawReason.trim() : "AI 根据当前 Prompt 素材上下文推荐。";
      const category = typeof rawCategory === "string" && rawCategory.trim() ? rawCategory.trim() : "用途";
      return name ? { name, reason, category } : null;
    })
    .filter((item): item is SuggestedTag => item !== null);

  if (tags.length === 0) {
    throw new Error("AI 未返回可用标签建议。");
  }

  return tags.slice(0, 10);
}

export async function suggestTagsForAnalysis(analysisId: string): Promise<SuggestedTag[]> {
  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id: analysisId },
    include: {
      segments: { orderBy: { sortOrder: "asc" } },
      fusions: { orderBy: { createdAt: "desc" }, take: 5 },
      variants: { orderBy: { createdAt: "desc" }, take: 5 },
      tags: { include: { tag: true } },
    },
  });

  if (!analysis) {
    throw new Error("未找到该 Prompt 分析记录");
  }

  const config = requireAiConfig();
  const client = getOpenAIClient();

  const context = {
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
    existingTags: analysis.tags.map((item) => item.tag.name),
    segments: analysis.segments.map((segment) => ({
      type: segment.type,
      label: segment.label,
      content: segment.content.slice(0, 500),
    })),
    fusions: analysis.fusions.map((fusion) => ({
      userRequirement: fusion.userRequirement,
      changeSummary: fusion.changeSummary,
      fusedPrompt: fusion.fusedPrompt.slice(0, 800),
    })),
    variants: analysis.variants.map((variant) => ({
      title: variant.title,
      source: variant.source,
      composedPrompt: variant.composedPrompt.slice(0, 800),
    })),
  };

  try {
    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "你是中文内容运营素材库管理员。请基于 PromptAnalysis、PromptSegment、PromptFusion 和 PromptVariant 信息推荐 5-10 个中文标签。只输出严格 JSON，不要 Markdown。标签类别从：风格、题材、用途、色彩、情绪、构图、平台、商业场景 中选择。",
        },
        {
          role: "user",
          content: `请为以下素材推荐标签。不要自动保存，只返回建议。\n\n${JSON.stringify(context)}`,
        },
      ],
    });

    let text = "";
    for await (const chunk of stream) {
      text += chunk.choices?.[0]?.delta?.content ?? "";
    }

    if (!text) {
      throw new Error("AI 未返回标签建议。");
    }

    const parsed = parseModelJson(text);

    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    return assertSuggestionPayload(parsed.value);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.startsWith("AI ") || error.message.includes("返回格式") || error.message.includes("标签建议"))
    ) {
      throw error;
    }

    const parsed = parseAiError(error);
    throw new Error(parsed.status === 400 && parsed.detail ? `AI 请求失败：${parsed.detail}` : parsed.message);
  }
}
