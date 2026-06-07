import { runAutoTagGovernanceForUncategorizedTags } from "@/lib/tags/tag-auto-governance-service";

type AutoGovernanceBody = {
  scope?: unknown;
  targetMaxTags?: unknown;
};

function parseTargetMaxTags(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 50;
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(10, Math.min(50, Math.floor(parsed)));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AutoGovernanceBody;
    const scope = typeof body.scope === "string" ? body.scope : "uncategorized";
    if (scope !== "uncategorized") {
      throw new Error("当前只支持治理未分类标签");
    }

    const result = await runAutoTagGovernanceForUncategorizedTags(parseTargetMaxTags(body.targetMaxTags));

    return Response.json({
      ok: true,
      run: {
        id: result.run.id,
        mode: result.run.mode,
        status: result.run.status,
        sourceTagCount: result.run.sourceTagCount,
        targetTagCount: result.run.targetTagCount,
        archivedTagCount: result.run.archivedTagCount,
        movedRelationsCount: result.run.movedRelationsCount,
        failedCount: result.run.failedCount,
        errorMessage: result.run.errorMessage,
        createdAt: result.run.createdAt.toISOString(),
        startedAt: result.run.startedAt?.toISOString() ?? null,
        finishedAt: result.run.finishedAt?.toISOString() ?? null,
      },
      summary: result.summary,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "自动标签治理失败" }, { status: 400 });
  }
}
