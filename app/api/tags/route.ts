import { prisma } from "@/lib/db/prisma";
import { normalizeTagName, validateTagCategory, validateTagLevel } from "@/lib/tags/tag-governance";

type TagBody = {
  name?: unknown;
  color?: unknown;
  description?: unknown;
  category?: unknown;
  level?: unknown;
  parentId?: unknown;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export async function GET() {
  const tags = await prisma.tag.findMany({
    where: { isArchived: false },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      aliases: true,
      _count: {
        select: { analyses: true },
      },
    },
  });

  return Response.json({
    ok: true,
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      description: tag.description,
      category: tag.category,
      level: tag.level,
      parentId: tag.parentId,
      normalizedName: tag.normalizedName,
      isArchived: tag.isArchived,
      aliases: tag.aliases.map((alias) => alias.alias),
      createdAt: tag.createdAt.toISOString(),
      analysisCount: tag._count.analyses,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TagBody;
    const name = stringValue(body.name);
    const category = validateTagCategory(stringValue(body.category));
    const level = body.level === undefined ? 1 : validateTagLevel(body.level);
    const parentId = stringValue(body.parentId);

    if (!name) {
      throw new Error("标签名称必填");
    }

    const existing = await prisma.tag.findUnique({ where: { name } });
    if (existing) {
      throw new Error("标签名称已存在");
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        normalizedName: normalizeTagName(name),
        color: stringValue(body.color),
        description: stringValue(body.description),
        category,
        level,
        parentId,
      },
    });

    return Response.json({ ok: true, tag: { ...tag, createdAt: tag.createdAt.toISOString(), updatedAt: tag.updatedAt.toISOString(), analysisCount: 0 } });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "创建标签失败" }, { status: 400 });
  }
}
