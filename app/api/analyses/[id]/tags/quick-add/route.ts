import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type QuickAddBody = {
  tagNames?: unknown;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as QuickAddBody;

    if (!Array.isArray(body.tagNames)) {
      throw new Error("tagNames 必须是数组");
    }

    const analysis = await prisma.promptAnalysis.findUnique({ where: { id }, select: { id: true } });
    if (!analysis) {
      throw new Error("Prompt 分析记录不存在");
    }

    const names = [...new Set(body.tagNames.map((name) => (typeof name === "string" ? name.trim() : "")).filter(Boolean))];
    if (names.length === 0) {
      throw new Error("请填写至少一个标签名称");
    }

    const tags = [];
    for (const name of names) {
      const tag = await prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      tags.push(tag);
    }

    for (const tag of tags) {
      await prisma.promptAnalysisTag.upsert({
        where: { analysisId_tagId: { analysisId: id, tagId: tag.id } },
        update: {},
        create: { analysisId: id, tagId: tag.id },
      });
    }

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
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "快速添加标签失败" }, { status: 400 });
  }
}
