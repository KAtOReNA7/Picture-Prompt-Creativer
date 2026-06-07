import { prisma } from "@/lib/db/prisma";
import { normalizeTagName, validateTagCategory, validateTagLevel } from "@/lib/tags/tag-governance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type TagBody = {
  name?: unknown;
  color?: unknown;
  description?: unknown;
  category?: unknown;
  level?: unknown;
  parentId?: unknown;
};

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as TagBody;
    const name = optionalString(body.name);

    if (name) {
      const existing = await prisma.tag.findUnique({ where: { name } });
      if (existing && existing.id !== id) {
        throw new Error("标签名称已存在");
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(name !== undefined ? { normalizedName: normalizeTagName(name) } : {}),
        ...(body.color !== undefined ? { color: optionalString(body.color) ?? null } : {}),
        ...(body.description !== undefined ? { description: optionalString(body.description) ?? null } : {}),
        ...(body.category !== undefined ? { category: validateTagCategory(optionalString(body.category) ?? null) } : {}),
        ...(body.level !== undefined ? { level: validateTagLevel(body.level) } : {}),
        ...(body.parentId !== undefined ? { parentId: optionalString(body.parentId) ?? null } : {}),
      },
      include: {
        aliases: true,
        _count: { select: { analyses: true } },
      },
    });

    return Response.json({
      ok: true,
      tag: {
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
        updatedAt: tag.updatedAt.toISOString(),
        analysisCount: tag._count.analyses,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "更新标签失败" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.tag.delete({ where: { id } });
    return Response.json({ ok: true, message: "标签已删除" });
  } catch {
    return Response.json({ ok: false, error: "删除标签失败，标签可能不存在" }, { status: 400 });
  }
}
