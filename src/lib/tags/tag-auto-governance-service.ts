import "server-only";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { requireAiConfig } from "@/lib/ai/models";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { TAG_AUTO_GOVERNANCE_SYSTEM_PROMPT, buildTagAutoGovernanceUserPrompt } from "@/lib/ai/prompts/tag-auto-governance-prompt";
import { parseTagAutoGovernancePlan, type TagAutoGovernancePlan } from "@/lib/ai/schemas/tag-auto-governance";
import { prisma } from "@/lib/db/prisma";
import { appLog } from "@/lib/logging/app-logger";
import { normalizeTagName } from "@/lib/tags/tag-governance";

type SourceTag = {
  id: string;
  name: string;
  normalizedName: string | null;
  aliases: { alias: string }[];
  _count: { analyses: number };
};

export type AutoTagGovernanceSummary = {
  sourceTagCount: number;
  targetTagCount: number;
  archivedTagCount: number;
  movedRelationsCount: number;
  unmappedCount: number;
};

function clampTargetMaxTags(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(10, Math.min(50, Math.floor(value)));
}

function sourcePayload(tags: SourceTag[]) {
  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    normalizedName: tag.normalizedName,
    aliases: tag.aliases.map((alias) => alias.alias).slice(0, 10),
    analysisCount: tag._count.analyses,
  }));
}

async function buildPlanWithAi(tags: SourceTag[], targetMaxTags: number): Promise<TagAutoGovernancePlan> {
  const config = requireAiConfig();
  const client = getOpenAIClient();
  const validIds = new Set(tags.map((tag) => tag.id));
  const stream = await client.chat.completions.create(
    {
      model: config.textModel,
      temperature: 0.15,
      max_tokens: 5000,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        { role: "system", content: TAG_AUTO_GOVERNANCE_SYSTEM_PROMPT },
        { role: "user", content: buildTagAutoGovernanceUserPrompt({ targetMaxTags, tags: sourcePayload(tags) }) },
      ],
    },
    { timeout: 120000 },
  );

  let text = "";
  for await (const chunk of stream) {
    text += chunk.choices?.[0]?.delta?.content ?? "";
  }

  if (!text) {
    throw new Error("AI 未返回标签治理计划");
  }

  const parsed = parseModelJson(text);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }

  return parseTagAutoGovernancePlan(parsed.value, validIds, targetMaxTags);
}

function buildFallbackPlan(tags: SourceTag[], targetMaxTags: number): TagAutoGovernancePlan {
  const sorted = [...tags].sort((a, b) => b._count.analyses - a._count.analyses || a.name.localeCompare(b.name, "zh-CN"));
  const targets = sorted.slice(0, targetMaxTags);
  const remaining = sorted.slice(targetMaxTags);
  const groups = targets.map((target) => ({ target, sources: [target], aliases: new Set<string>([target.name, target.normalizedName ?? ""]) }));

  remaining.forEach((tag, index) => {
    const group = groups[index % Math.max(1, groups.length)];
    group.sources.push(tag);
    group.aliases.add(tag.name);
    if (tag.normalizedName) group.aliases.add(tag.normalizedName);
    for (const alias of tag.aliases) group.aliases.add(alias.alias);
  });

  return {
    targetTags: groups.map((group) => ({
      targetName: group.target.name.slice(0, 16),
      category: "其他",
      level: group.target._count.analyses > 3 ? 2 : 3,
      description: "自动治理保留的核心未分类标签，可后续人工微调",
      sourceTagIds: group.sources.map((source) => source.id),
      sourceNames: group.sources.map((source) => source.name),
      aliases: [...group.aliases].filter(Boolean),
      reason: "AI 治理超时或标签量较少时，系统按高频标签兜底归并，确保标签数量先压缩到可管理规模。",
    })),
    unmappedTags: [],
    summary: "系统使用兜底归并策略，将未分类标签压缩到目标数量以内。",
  };
}

function completePlanCoverage(plan: TagAutoGovernancePlan, allTags: SourceTag[], targetMaxTags: number): TagAutoGovernancePlan {
  if (plan.targetTags.length === 0) return buildFallbackPlan(allTags, targetMaxTags);

  const mapped = new Set(plan.targetTags.flatMap((target) => target.sourceTagIds));
  const remaining = allTags.filter((tag) => !mapped.has(tag.id));
  const nextTargets = plan.targetTags.map((target) => ({
    ...target,
    aliases: [...target.aliases],
    sourceNames: [...target.sourceNames],
    sourceTagIds: [...target.sourceTagIds],
  }));

  remaining.forEach((tag, index) => {
    const target = nextTargets[index % nextTargets.length];
    target.sourceTagIds.push(tag.id);
    target.sourceNames.push(tag.name);
    target.aliases.push(tag.name);
    if (tag.normalizedName) target.aliases.push(tag.normalizedName);
    for (const alias of tag.aliases) target.aliases.push(alias.alias);
  });

  return {
    ...plan,
    targetTags: nextTargets.slice(0, targetMaxTags).map((target) => ({
      ...target,
      sourceTagIds: [...new Set(target.sourceTagIds)],
      sourceNames: [...new Set(target.sourceNames)],
      aliases: [...new Set(target.aliases.filter(Boolean))],
    })),
    unmappedTags: [],
    summary: `${plan.summary ?? "AI 已生成核心标签。"} 系统已将未覆盖标签自动并入目标标签，确保关联完整迁移。`,
  };
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function aliasUpsert(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], tagId: string, alias: string | null | undefined) {
  const value = alias?.trim();
  if (!value) return;
  await tx.tagAlias.upsert({
    where: { tagId_alias: { tagId, alias: value } },
    update: {},
    create: { tagId, alias: value },
  });
}

async function executePlan(plan: TagAutoGovernancePlan, sourceTags: SourceTag[]) {
  const sourceById = new Map(sourceTags.map((tag) => [tag.id, tag]));
  let movedRelationsCount = 0;
  let archivedTagCount = 0;
  let failedCount = 0;
  const targetResults = [];

  for (const target of plan.targetTags) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existingTarget = await tx.tag.findFirst({
          where: { name: target.targetName, isArchived: false },
        });
        const targetTag =
          existingTarget ??
          (await tx.tag.create({
            data: {
              name: target.targetName,
              category: target.category,
              level: target.level,
              description: target.description,
              normalizedName: normalizeTagName(target.targetName),
            },
          }));

        const sourceTagIds = target.sourceTagIds.filter((id) => id !== targetTag.id);
        await tx.tag.update({
          where: { id: targetTag.id },
          data: {
            category: target.category,
            level: target.level,
            description: target.description ?? targetTag.description,
            normalizedName: normalizeTagName(target.targetName),
          },
        });

        const sourceRelations = await tx.promptAnalysisTag.findMany({
          where: { tagId: { in: sourceTagIds } },
          select: { analysisId: true, tagId: true },
        });

        let moved = 0;
        for (const relation of sourceRelations) {
          const existingRelation = await tx.promptAnalysisTag.findUnique({
            where: { analysisId_tagId: { analysisId: relation.analysisId, tagId: targetTag.id } },
            select: { id: true },
          });
          if (!existingRelation) {
            await tx.promptAnalysisTag.create({ data: { analysisId: relation.analysisId, tagId: targetTag.id } });
            moved += 1;
          }
        }

        await tx.promptAnalysisTag.deleteMany({ where: { tagId: { in: sourceTagIds } } });
        await tx.tag.updateMany({
          where: { id: { in: sourceTagIds } },
          data: { isArchived: true, mergedIntoId: targetTag.id },
        });

        const aliasCandidates = new Set<string>([...target.aliases, ...target.sourceNames]);
        for (const sourceId of sourceTagIds) {
          const source = sourceById.get(sourceId);
          if (source) {
            aliasCandidates.add(source.name);
            if (source.normalizedName) aliasCandidates.add(source.normalizedName);
            for (const alias of source.aliases) aliasCandidates.add(alias.alias);
          }
        }
        for (const alias of aliasCandidates) {
          await aliasUpsert(tx, targetTag.id, alias);
        }

        return {
          targetTagId: targetTag.id,
          targetName: target.targetName,
          movedRelationsCount: moved,
          archivedTagCount: sourceTagIds.length,
        };
      });

      movedRelationsCount += result.movedRelationsCount;
      archivedTagCount += result.archivedTagCount;
      targetResults.push(result);
    } catch (error) {
      failedCount += 1;
      await appLog({
        level: "error",
        scope: "tags.auto-governance.target",
        message: "单个目标标签治理失败",
        safeDetail: {
          targetName: target.targetName,
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  return { movedRelationsCount, archivedTagCount, failedCount, targetResults };
}

export async function runAutoTagGovernanceForUncategorizedTags(targetMaxTagsInput = 50) {
  const targetMaxTags = clampTargetMaxTags(targetMaxTagsInput);
  await prisma.tagGovernanceRun.updateMany({
    where: {
      status: "running",
      startedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
    data: {
      status: "failed",
      errorMessage: "自动治理任务超时，已标记为失败。",
      finishedAt: new Date(),
    },
  });

  const sourceTags = await prisma.tag.findMany({
    where: {
      isArchived: false,
      OR: [{ category: null }, { category: "" }],
    },
    include: {
      aliases: true,
      _count: { select: { analyses: true } },
    },
    orderBy: [{ analyses: { _count: "desc" } }, { name: "asc" }],
  });

  if (sourceTags.length === 0) {
    const run = await prisma.tagGovernanceRun.create({
      data: {
        mode: "auto_uncategorized_to_core",
        status: "completed",
        sourceTagCount: 0,
        targetTagCount: 0,
        resultJson: JSON.stringify({ message: "当前没有未分类标签需要治理。" }),
        startedAt: new Date(),
        finishedAt: new Date(),
      },
    });
    return {
      run,
      summary: { sourceTagCount: 0, targetTagCount: 0, archivedTagCount: 0, movedRelationsCount: 0, unmappedCount: 0 },
    };
  }

  const run = await prisma.tagGovernanceRun.create({
    data: {
      mode: "auto_uncategorized_to_core",
      status: "running",
      sourceTagCount: sourceTags.length,
      startedAt: new Date(),
    },
  });

  try {
    let plan: TagAutoGovernancePlan;
    if (sourceTags.length <= targetMaxTags) {
      plan = buildFallbackPlan(sourceTags, targetMaxTags);
    } else {
      try {
        const aiInputTags = sourceTags.slice(0, 180);
        const aiPlan = await withTimeout(buildPlanWithAi(aiInputTags, targetMaxTags), 130000, "AI 标签治理计划生成超时，系统已改用本地兜底治理。");
        plan = completePlanCoverage(aiPlan, sourceTags, targetMaxTags);
      } catch (error) {
        await appLog({
          level: "warn",
          scope: "tags.auto-governance",
          message: "AI 标签治理计划不可用，改用兜底治理",
          safeDetail: { error: error instanceof Error ? error.message : String(error) },
        });
        plan = buildFallbackPlan(sourceTags, targetMaxTags);
      }
    }
    await prisma.tagGovernanceRun.update({
      where: { id: run.id },
      data: { rawPlanJson: JSON.stringify(plan) },
    });

    const execution = await executePlan(plan, sourceTags);
    const summary: AutoTagGovernanceSummary = {
      sourceTagCount: sourceTags.length,
      targetTagCount: plan.targetTags.length,
      archivedTagCount: execution.archivedTagCount,
      movedRelationsCount: execution.movedRelationsCount,
      unmappedCount: plan.unmappedTags.length,
    };
    const resultJson = JSON.stringify({ summary, targetResults: execution.targetResults, unmappedTags: plan.unmappedTags, planSummary: plan.summary });
    const completedRun = await prisma.tagGovernanceRun.update({
      where: { id: run.id },
      data: {
        status: execution.failedCount > 0 ? "failed" : "completed",
        targetTagCount: plan.targetTags.length,
        archivedTagCount: execution.archivedTagCount,
        movedRelationsCount: execution.movedRelationsCount,
        failedCount: execution.failedCount,
        errorMessage: execution.failedCount > 0 ? "部分目标标签治理失败，详情见日志。" : null,
        resultJson,
        finishedAt: new Date(),
      },
    });

    return { run: completedRun, summary };
  } catch (error) {
    const parsed = parseAiError(error);
    const message = error instanceof Error ? error.message : parsed.message;
    await appLog({ level: "error", scope: "tags.auto-governance", message: "自动标签治理失败", safeDetail: { message } });
    await prisma.tagGovernanceRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        failedCount: 1,
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
    throw new Error(message || "自动标签治理失败");
  }
}
