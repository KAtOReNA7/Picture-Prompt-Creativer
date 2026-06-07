import { TAG_CATEGORIES } from "@/lib/tags/tag-governance";

export type TagAutoGovernanceTarget = {
  targetName: string;
  category: string;
  level: number;
  description?: string;
  sourceTagIds: string[];
  sourceNames: string[];
  aliases: string[];
  reason?: string;
};

export type TagAutoGovernanceUnmapped = {
  tagId: string;
  name: string;
  reason?: string;
};

export type TagAutoGovernancePlan = {
  targetTags: TagAutoGovernanceTarget[];
  unmappedTags: TagAutoGovernanceUnmapped[];
  summary?: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item)).filter(Boolean))];
}

function parseLevel(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
    throw new Error("AI 标签治理计划格式异常：level 必须是 1-3。");
  }
  return parsed;
}

function parseCategory(value: unknown): string {
  const category = text(value);
  if (!TAG_CATEGORIES.includes(category as (typeof TAG_CATEGORIES)[number])) {
    throw new Error("AI 标签治理计划格式异常：category 不在允许列表中。");
  }
  return category;
}

export function parseTagAutoGovernancePlan(value: unknown, validSourceIds: Set<string>, targetMaxTags = 50): TagAutoGovernancePlan {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("AI 标签治理计划格式异常：缺少 JSON 对象。");
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.targetTags)) {
    throw new Error("AI 标签治理计划格式异常：缺少 targetTags。");
  }

  if (record.targetTags.length > targetMaxTags) {
    throw new Error(`AI 标签治理计划格式异常：targetTags 不能超过 ${targetMaxTags} 个。`);
  }

  const usedSourceIds = new Set<string>();
  const targetTags = record.targetTags.map((item): TagAutoGovernanceTarget => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error("AI 标签治理计划格式异常：targetTags 项必须是对象。");
    }
    const target = item as Record<string, unknown>;
    const targetName = text(target.targetName);
    if (!targetName) {
      throw new Error("AI 标签治理计划格式异常：targetName 不能为空。");
    }

    const sourceTagIds = stringList(target.sourceTagIds).filter((id) => validSourceIds.has(id));
    if (sourceTagIds.length === 0) {
      throw new Error(`AI 标签治理计划格式异常：${targetName} 缺少有效 sourceTagIds。`);
    }

    for (const id of sourceTagIds) {
      if (usedSourceIds.has(id)) {
        throw new Error("AI 标签治理计划格式异常：同一个 sourceTagId 被重复映射。");
      }
      usedSourceIds.add(id);
    }

    return {
      targetName,
      category: parseCategory(target.category),
      level: parseLevel(target.level),
      description: text(target.description) || undefined,
      sourceTagIds,
      sourceNames: stringList(target.sourceNames),
      aliases: stringList(target.aliases),
      reason: text(target.reason) || undefined,
    };
  });

  const unmappedTags = Array.isArray(record.unmappedTags)
    ? record.unmappedTags
        .map((item): TagAutoGovernanceUnmapped | null => {
          if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
          const tag = item as Record<string, unknown>;
          const tagId = text(tag.tagId);
          if (!tagId || !validSourceIds.has(tagId)) return null;
          return {
            tagId,
            name: text(tag.name),
            reason: text(tag.reason) || undefined,
          };
        })
        .filter((item): item is TagAutoGovernanceUnmapped => item !== null)
    : [];

  return {
    targetTags,
    unmappedTags,
    summary: text(record.summary) || undefined,
  };
}
