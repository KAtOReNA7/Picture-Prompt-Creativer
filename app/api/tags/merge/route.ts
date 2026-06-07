import { prisma } from "@/lib/db/prisma";
import { createMissingAlias, normalizeTagName, tagToResponse, validateTagCategory, validateTagLevel } from "@/lib/tags/tag-governance";

type MergeBody = {
  targetTagId?: unknown;
  targetName?: unknown;
  sourceTagIds?: unknown;
  category?: unknown;
  level?: unknown;
  parentId?: unknown;
};

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim()))];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MergeBody;
    const requestedSourceIds = uniqueIds(body.sourceTagIds);
    const targetName = optionalString(body.targetName);
    const targetTagIdInput = optionalString(body.targetTagId);
    const category = validateTagCategory(optionalString(body.category));
    const level = body.level === undefined ? 2 : validateTagLevel(body.level);
    const parentId = optionalString(body.parentId);

    if (requestedSourceIds.length < 1) {
      throw new Error("sourceTagIds 至少需要 1 个标签");
    }
    if (!targetTagIdInput && !targetName) {
      throw new Error("targetTagId 为空时必须提供 targetName");
    }
    if (parentId && requestedSourceIds.includes(parentId)) {
      throw new Error("父级标签不能是被合并的 source tag");
    }

    const result = await prisma.$transaction(async (tx) => {
      const targetTag = targetTagIdInput
        ? await tx.tag.update({
            where: { id: targetTagIdInput },
            data: {
              ...(targetName ? { name: targetName, normalizedName: normalizeTagName(targetName) } : {}),
              category,
              level,
              parentId,
            },
          })
        : await tx.tag.create({
            data: {
              name: targetName as string,
              normalizedName: normalizeTagName(targetName as string),
              category,
              level,
              parentId,
            },
          });

      const sourceTagIds = requestedSourceIds.filter((id) => id !== targetTag.id);
      if (sourceTagIds.length === 0) {
        throw new Error("sourceTagIds 不能只包含目标标签");
      }

      const sourceTags = await tx.tag.findMany({ where: { id: { in: sourceTagIds } } });
      if (sourceTags.length !== sourceTagIds.length) {
        throw new Error("存在不存在的 sourceTagId");
      }

      const sourceRelations = await tx.promptAnalysisTag.findMany({
        where: { tagId: { in: sourceTagIds } },
        select: { analysisId: true, tagId: true },
      });

      let movedRelationsCount = 0;
      for (const relation of sourceRelations) {
        const existing = await tx.promptAnalysisTag.findUnique({
          where: { analysisId_tagId: { analysisId: relation.analysisId, tagId: targetTag.id } },
          select: { id: true },
        });
        if (!existing) {
          await tx.promptAnalysisTag.create({ data: { analysisId: relation.analysisId, tagId: targetTag.id } });
          movedRelationsCount += 1;
        }
      }

      await tx.promptAnalysisTag.deleteMany({ where: { tagId: { in: sourceTagIds } } });
      await tx.tag.updateMany({
        where: { id: { in: sourceTagIds } },
        data: { isArchived: true, mergedIntoId: targetTag.id },
      });

      for (const sourceTag of sourceTags) {
        const aliases = [sourceTag.name, sourceTag.normalizedName].filter((alias): alias is string => Boolean(alias?.trim()));
        for (const alias of aliases) {
          await tx.tagAlias.upsert({
            where: { tagId_alias: { tagId: targetTag.id, alias } },
            update: {},
            create: { tagId: targetTag.id, alias },
          });
        }
      }

      return {
        targetTagId: targetTag.id,
        movedRelationsCount,
        archivedTagsCount: sourceTagIds.length,
      };
    });

    if (targetName) {
      await createMissingAlias(result.targetTagId, targetName);
    }

    return Response.json({
      ok: true,
      targetTag: await tagToResponse(result.targetTagId),
      movedRelationsCount: result.movedRelationsCount,
      archivedTagsCount: result.archivedTagsCount,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "合并标签失败" }, { status: 400 });
  }
}
