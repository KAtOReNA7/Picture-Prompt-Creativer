import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { requireAiConfig } from "@/lib/ai/models";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { prisma } from "@/lib/db/prisma";
import { TAG_CATEGORIES } from "@/lib/tags/tag-governance";

type SuggestBody = {
  mode?: unknown;
};

type MergeSuggestion = {
  targetName: string;
  category: string | null;
  level: number;
  sourceTagIds: string[];
  sourceNames: string[];
  reason: string;
  confidence: number;
  caution: boolean;
};

type ClassificationSuggestion = {
  tagId: string;
  name: string;
  suggestedCategory: string | null;
  suggestedLevel: number;
  reason: string;
};

type HierarchySuggestion = {
  parentName: string;
  children: string[];
  reason?: string;
};

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function score(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function level(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 2;
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 3 ? parsed : 2;
}

function category(value: unknown): string | null {
  const raw = text(value);
  return TAG_CATEGORIES.includes(raw as (typeof TAG_CATEGORIES)[number]) ? raw : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()) : [];
}

function parseSuggestions(value: unknown, validIds: Set<string>) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("AI 返回格式异常，缺少 suggestions 对象");
  }

  const record = value as Record<string, unknown>;
  const suggestions = typeof record.suggestions === "object" && record.suggestions !== null ? (record.suggestions as Record<string, unknown>) : record;

  const mergeGroups = Array.isArray(suggestions.mergeGroups)
    ? suggestions.mergeGroups
        .map((item): MergeSuggestion | null => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
          const sourceTagIds = stringList((item as Record<string, unknown>).sourceTagIds).filter((id) => validIds.has(id));
          if (sourceTagIds.length < 2) return null;
          const confidence = score((item as Record<string, unknown>).confidence);
          return {
            targetName: text((item as Record<string, unknown>).targetName, text((item as Record<string, unknown>).name, "合并标签")),
            category: category((item as Record<string, unknown>).category),
            level: level((item as Record<string, unknown>).level),
            sourceTagIds,
            sourceNames: stringList((item as Record<string, unknown>).sourceNames),
            reason: text((item as Record<string, unknown>).reason, "这些标签语义接近，可由用户确认后合并。"),
            confidence,
            caution: confidence < 0.65,
          };
        })
        .filter((item): item is MergeSuggestion => item !== null)
    : [];

  const classifications = Array.isArray(suggestions.classifications)
    ? suggestions.classifications
        .map((item): ClassificationSuggestion | null => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
          const tagId = text((item as Record<string, unknown>).tagId);
          if (!validIds.has(tagId)) return null;
          return {
            tagId,
            name: text((item as Record<string, unknown>).name),
            suggestedCategory: category((item as Record<string, unknown>).suggestedCategory ?? (item as Record<string, unknown>).category),
            suggestedLevel: level((item as Record<string, unknown>).suggestedLevel ?? (item as Record<string, unknown>).level),
            reason: text((item as Record<string, unknown>).reason, "建议补充标签分类和等级。"),
          };
        })
        .filter((item): item is ClassificationSuggestion => item !== null)
    : [];

  const hierarchy = Array.isArray(suggestions.hierarchy)
    ? suggestions.hierarchy
        .map((item): HierarchySuggestion | null => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
          const children = stringList((item as Record<string, unknown>).children);
          const parentName = text((item as Record<string, unknown>).parentName);
          return parentName && children.length > 0
            ? { parentName, children, reason: text((item as Record<string, unknown>).reason, "建议建立父子层级。") }
            : null;
        })
        .filter((item): item is HierarchySuggestion => item !== null)
    : [];

  return { mergeGroups, classifications, hierarchy };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as SuggestBody;
    const mode = typeof body.mode === "string" ? body.mode : "merge_and_classify";
    if (mode !== "merge_and_classify") {
      throw new Error("暂时只支持 merge_and_classify 模式");
    }

    const tags = await prisma.tag.findMany({
      where: { isArchived: false },
      include: { aliases: true, _count: { select: { analyses: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 40,
    });

    if (tags.length === 0) {
      return Response.json({ ok: true, suggestions: { mergeGroups: [], classifications: [], hierarchy: [] }, warning: "当前没有可治理的标签" });
    }

    const config = requireAiConfig();
    const client = getOpenAIClient();
    const validIds = new Set(tags.map((tag) => tag.id));
    const payload = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      normalizedName: tag.normalizedName,
      category: tag.category,
      level: tag.level,
      parentId: tag.parentId,
      aliases: tag.aliases.map((alias) => alias.alias),
      analysisCount: tag._count.analyses,
    }));

    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "你是中文 Prompt 素材库标签治理顾问。你只能提出建议，不能要求自动执行。请识别语义接近的标签合并建议、分类建议、等级建议和父子层级建议。不要建议合并语义明显不同的标签。输出严格 JSON，不要 Markdown。分类只能从：风格、题材、场景、色彩、光影、构图、情绪、用途、平台、质量、其他 中选择。level 只能是 1、2、3。",
        },
        {
          role: "user",
          content: `请基于这些 active tags 输出 suggestions 对象，格式包含 mergeGroups、classifications、hierarchy。mergeGroups 中 sourceTagIds 至少 2 个，并给 confidence 0-1。\n\n${JSON.stringify(payload)}`,
        },
      ],
    });

    let textContent = "";
    for await (const chunk of stream) {
      textContent += chunk.choices?.[0]?.delta?.content ?? "";
    }

    if (!textContent) {
      throw new Error("AI 未返回标签治理建议");
    }

    const parsed = parseModelJson(textContent);
    if (!parsed.ok) {
      throw new Error(parsed.error);
    }

    return Response.json({ ok: true, suggestions: parseSuggestions(parsed.value, validIds) });
  } catch (error) {
    const parsed = parseAiError(error);
    return Response.json({ ok: false, error: error instanceof Error ? error.message : parsed.message }, { status: 400 });
  }
}
