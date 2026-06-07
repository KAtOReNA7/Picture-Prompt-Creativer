import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const runs = await prisma.tagGovernanceRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      mode: true,
      status: true,
      sourceTagCount: true,
      targetTagCount: true,
      archivedTagCount: true,
      movedRelationsCount: true,
      failedCount: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  return Response.json({
    ok: true,
    runs: runs.map((run) => ({
      ...run,
      createdAt: run.createdAt.toISOString(),
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null,
    })),
  });
}
