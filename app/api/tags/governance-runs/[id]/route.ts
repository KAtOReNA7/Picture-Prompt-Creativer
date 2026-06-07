import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const run = await prisma.tagGovernanceRun.findUnique({ where: { id } });
    if (!run) {
      throw new Error("治理记录不存在");
    }

    return Response.json({
      ok: true,
      run: {
        id: run.id,
        mode: run.mode,
        status: run.status,
        sourceTagCount: run.sourceTagCount,
        targetTagCount: run.targetTagCount,
        archivedTagCount: run.archivedTagCount,
        movedRelationsCount: run.movedRelationsCount,
        failedCount: run.failedCount,
        errorMessage: run.errorMessage,
        rawPlanJson: run.rawPlanJson,
        resultJson: run.resultJson,
        createdAt: run.createdAt.toISOString(),
        startedAt: run.startedAt?.toISOString() ?? null,
        finishedAt: run.finishedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "读取治理记录失败" }, { status: 404 });
  }
}
