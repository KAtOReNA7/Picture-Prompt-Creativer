import { prisma } from "@/lib/db/prisma";

type TagWhere = {
  isArchived?: boolean;
  category?: string | null;
  level?: number;
  name?: { contains: string };
};

function intParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const category = url.searchParams.get("category");
    const level = intParam(url.searchParams.get("level"));
    const q = url.searchParams.get("q")?.trim();

    const where: TagWhere = {
      ...(includeArchived ? {} : { isArchived: false }),
      ...(category === "未分类" ? { category: null } : category ? { category } : {}),
      ...(level ? { level } : {}),
      ...(q ? { name: { contains: q } } : {}),
    };

    const [totalTags, activeTags, archivedTags, uncategorizedTags, tags, categoryRows] = await Promise.all([
      prisma.tag.count(),
      prisma.tag.count({ where: { isArchived: false } }),
      prisma.tag.count({ where: { isArchived: true } }),
      prisma.tag.count({ where: { isArchived: false, category: null } }),
      prisma.tag.findMany({
        where,
        include: {
          aliases: { orderBy: { createdAt: "asc" } },
          _count: { select: { analyses: true } },
        },
        orderBy: [{ isArchived: "asc" }, { category: "asc" }, { level: "asc" }, { name: "asc" }],
      }),
      prisma.tag.groupBy({
        by: ["category"],
        where: includeArchived ? {} : { isArchived: false },
        _count: { _all: true },
      }),
    ]);

    return Response.json({
      ok: true,
      summary: {
        totalTags,
        activeTags,
        archivedTags,
        uncategorizedTags,
      },
      categories: categoryRows.map((row) => ({
        category: row.category ?? "未分类",
        count: row._count._all,
      })),
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        description: tag.description,
        normalizedName: tag.normalizedName ?? tag.name,
        category: tag.category,
        level: tag.level,
        parentId: tag.parentId,
        aliases: tag.aliases.map((alias) => alias.alias),
        analysisCount: tag._count.analyses,
        isArchived: tag.isArchived,
        mergedIntoId: tag.mergedIntoId,
        createdAt: tag.createdAt.toISOString(),
        updatedAt: tag.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "读取标签统计失败" }, { status: 500 });
  }
}
