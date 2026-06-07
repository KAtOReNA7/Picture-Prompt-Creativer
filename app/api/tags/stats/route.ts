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

function parsePage(value: string | null): number {
  const parsed = Number(value ?? "1");
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value: string | null): number {
  const parsed = Number(value ?? "100");
  if (!Number.isInteger(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 200);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeArchived = url.searchParams.get("includeArchived") === "true";
    const category = url.searchParams.get("category");
    const level = intParam(url.searchParams.get("level"));
    const q = url.searchParams.get("q")?.trim();
    const view = url.searchParams.get("view");
    const page = parsePage(url.searchParams.get("page"));
    const pageSize = parsePageSize(url.searchParams.get("pageSize"));

    const where: TagWhere = {
      ...(includeArchived ? {} : { isArchived: false }),
      ...(category === "未分类" ? { category: null } : category ? { category } : {}),
      ...(level ? { level } : {}),
      ...(q ? { name: { contains: q } } : {}),
    };

    const [totalTags, activeTags, archivedTags, uncategorizedTags, categoryRows, total] = await Promise.all([
      prisma.tag.count(),
      prisma.tag.count({ where: { isArchived: false } }),
      prisma.tag.count({ where: { isArchived: true } }),
      prisma.tag.count({ where: { isArchived: false, OR: [{ category: null }, { category: "" }] } }),
      prisma.tag.groupBy({
        by: ["category"],
        where: includeArchived ? {} : { isArchived: false },
        _count: { _all: true },
      }),
      prisma.tag.count({ where }),
    ]);

    const summary = { totalTags, activeTags, archivedTags, uncategorizedTags };
    const categories = categoryRows.map((row) => ({ category: row.category || "未分类", count: row._count._all }));

    if (view === "summary") {
      return Response.json({ ok: true, summary, categories });
    }

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const skip = (safePage - 1) * pageSize;
    const tags = await prisma.tag.findMany({
      where,
      include: {
        aliases: { select: { alias: true }, orderBy: { createdAt: "asc" }, take: 8 },
        _count: { select: { analyses: true } },
      },
      orderBy: [{ analyses: { _count: "desc" } }, { isArchived: "asc" }, { category: "asc" }, { level: "asc" }, { name: "asc" }],
      skip,
      take: pageSize,
    });

    const items = tags.map((tag) => ({
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
    }));

    return Response.json({
      ok: true,
      summary,
      categories,
      items,
      tags: items,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPrevPage: safePage > 1,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "读取标签统计失败" }, { status: 500 });
  }
}
