import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TagsBody = {
  tagIds?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as TagsBody;

    if (!Array.isArray(body.tagIds)) {
      throw new Error("tagIds 必须是数组");
    }

    const tagIds = [...new Set(body.tagIds.filter((tagId): tagId is string => typeof tagId === "string" && tagId.trim().length > 0))];
    const analysis = await prisma.promptAnalysis.findUnique({ where: { id }, select: { id: true } });
    if (!analysis) {
      throw new Error("Prompt 分析记录不存在");
    }

    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } } });
    if (tags.length !== tagIds.length) {
      throw new Error("存在不存在的 tagId");
    }

    await prisma.$transaction([
      prisma.promptAnalysisTag.deleteMany({ where: { analysisId: id } }),
      ...tagIds.map((tagId) =>
        prisma.promptAnalysisTag.create({
          data: { analysisId: id, tagId },
        }),
      ),
    ]);

    const updated = await prisma.promptAnalysisTag.findMany({
      where: { analysisId: id },
      include: { tag: true },
      orderBy: { createdAt: "asc" },
    });

    return Response.json({
      ok: true,
      tags: updated.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color,
        description: item.tag.description,
      })),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "更新标签绑定失败" }, { status: 400 });
  }
}
