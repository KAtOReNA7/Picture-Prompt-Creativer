import "server-only";
import { prisma } from "@/lib/db/prisma";

export const TAG_CATEGORIES = ["风格", "题材", "场景", "色彩", "光影", "构图", "情绪", "用途", "平台", "质量", "其他"] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number];

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, "").replace(/[，,。.\-_]/g, "").toLowerCase();
}

export function validateTagCategory(category: string | null | undefined): string | null {
  if (!category) return null;
  if (!TAG_CATEGORIES.includes(category as TagCategory)) {
    throw new Error("标签分类不在允许列表中");
  }
  return category;
}

export function validateTagLevel(level: unknown): number {
  const parsed = typeof level === "number" ? level : typeof level === "string" ? Number(level) : NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
    throw new Error("标签等级必须是 1-3");
  }
  return parsed;
}

export async function tagToResponse(tagId: string) {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    include: {
      aliases: { orderBy: { createdAt: "asc" } },
      _count: { select: { analyses: true, children: true } },
    },
  });

  if (!tag) {
    throw new Error("标签不存在");
  }

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    description: tag.description,
    category: tag.category,
    level: tag.level,
    parentId: tag.parentId,
    normalizedName: tag.normalizedName,
    isArchived: tag.isArchived,
    mergedIntoId: tag.mergedIntoId,
    aliases: tag.aliases.map((alias) => alias.alias),
    aliasCount: tag.aliases.length,
    analysisCount: tag._count.analyses,
    childrenCount: tag._count.children,
    createdAt: tag.createdAt.toISOString(),
    updatedAt: tag.updatedAt.toISOString(),
  };
}

export async function createMissingAlias(tagId: string, alias: string | null | undefined) {
  const value = alias?.trim();
  if (!value) return;

  await prisma.tagAlias.upsert({
    where: { tagId_alias: { tagId, alias: value } },
    update: {},
    create: { tagId, alias: value },
  });
}
