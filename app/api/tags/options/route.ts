import { prisma } from "@/lib/db/prisma";

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? "200");
  if (!Number.isInteger(parsed) || parsed <= 0) return 200;
  return Math.min(parsed, 300);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim();
  const category = url.searchParams.get("category")?.trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  const tags = await prisma.tag.findMany({
    where: {
      isArchived: false,
      ...(q ? { name: { contains: q } } : {}),
      ...(category ? { category } : {}),
    },
    include: { _count: { select: { analyses: true } } },
    orderBy: [{ analyses: { _count: "desc" } }, { category: "asc" }, { name: "asc" }],
    take: limit,
  });

  return Response.json({
    ok: true,
    options: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      category: tag.category,
      level: tag.level,
      color: tag.color,
      analysisCount: tag._count.analyses,
    })),
  });
}
