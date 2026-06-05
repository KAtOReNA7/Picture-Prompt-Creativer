import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string; itemId: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id, itemId } = await context.params;
    await prisma.collectionItem.delete({
      where: {
        id: itemId,
        collectionId: id,
      },
    });

    return Response.json({ ok: true, message: "已从合集中移除该素材" });
  } catch {
    return Response.json({ ok: false, error: "移除合集素材失败，素材可能不存在" }, { status: 400 });
  }
}
