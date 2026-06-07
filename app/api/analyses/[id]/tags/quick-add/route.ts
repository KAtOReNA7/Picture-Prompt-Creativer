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
      const existing = await prisma.tag.findUnique({ where: { name } });
      if (existing?.isArchived) {
        throw new Error(`标签“${name}”已归档，可能已有同类标签。请在标签管理页确认后再添加。`);
      }
      const tag = existing ?? (await prisma.tag.create({ data: { name, normalizedName: name.trim().replace(/\s+/g, "").toLowerCase() } }));
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
        category: item.tag.category,
      })),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "快速添加标签失败" }, { status: 400 });
  }
}
