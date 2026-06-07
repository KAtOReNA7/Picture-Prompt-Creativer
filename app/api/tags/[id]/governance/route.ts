import { prisma } from "@/lib/db/prisma";
import { normalizeTagName, tagToResponse, validateTagCategory, validateTagLevel } from "@/lib/tags/tag-governance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type GovernanceBody = {
  category?: unknown;
  level?: unknown;
  parentId?: unknown;
  normalizedName?: unknown;
  isArchived?: unknown;
};

function optionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as GovernanceBody;
    const parentId = optionalString(body.parentId);

    if (parentId === id) {
      throw new Error("父级标签不能等于自身");
    }

    if (parentId) {
      const parent = await prisma.tag.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) {
        throw new Error("父级标签不存在");
      }
    }

    const normalizedName = optionalString(body.normalizedName);
    const data = {
      ...(body.category !== undefined ? { category: validateTagCategory(optionalString(body.category)) } : {}),
      ...(body.level !== undefined ? { level: validateTagLevel(body.level) } : {}),
      ...(body.parentId !== undefined ? { parentId } : {}),
      ...(body.normalizedName !== undefined ? { normalizedName: normalizedName ?? null } : {}),
      ...(body.isArchived !== undefined ? { isArchived: Boolean(body.isArchived) } : {}),
    };

    if (Object.keys(data).length === 0) {
      throw new Error("没有需要更新的标签治理字段");
    }

    const existing = await prisma.tag.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!existing) {
      throw new Error("标签不存在");
    }

    await prisma.tag.update({
      where: { id },
      data: {
        normalizedName: normalizeTagName(existing.name),
        ...data,
      },
    });

    return Response.json({ ok: true, tag: await tagToResponse(id) });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "更新标签治理信息失败" }, { status: 400 });
  }
}
