import { assertCollectionItemExists, assertCollectionItemType } from "@/lib/collections/collection-service";
import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ItemsBody = {
  items?: unknown;
};

type ItemInput = {
  itemType: string;
  itemId: string;
  note?: string | null;
};

function parseItems(value: unknown): ItemInput[] {
  if (!Array.isArray(value)) {
    throw new Error("items 必须是数组");
  }

  return value.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("items 格式错误");
    }

    const record = item as Record<string, unknown>;
    const itemType = typeof record.itemType === "string" ? record.itemType.trim() : "";
    const itemId = typeof record.itemId === "string" ? record.itemId.trim() : "";
    const note = typeof record.note === "string" ? record.note.trim() : null;

    if (!itemType || !itemId) {
      throw new Error("itemType 和 itemId 必填");
    }

    return { itemType, itemId, note };
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const collection = await prisma.collection.findUnique({ where: { id }, select: { id: true } });
    if (!collection) {
      throw new Error("合集不存在");
    }

    const body = (await request.json()) as ItemsBody;
    const items = parseItems(body.items);
    const created = [];
    const skipped = [];

    for (const item of items) {
      assertCollectionItemType(item.itemType);
      await assertCollectionItemExists(item.itemType, item.itemId);

      const existing = await prisma.collectionItem.findFirst({
        where: {
          collectionId: id,
          itemType: item.itemType,
          itemId: item.itemId,
        },
      });

      if (existing) {
        skipped.push(existing);
        continue;
      }

      const record = await prisma.collectionItem.create({
        data: {
          collectionId: id,
          itemType: item.itemType,
          itemId: item.itemId,
          note: item.note,
          sortOrder: await prisma.collectionItem.count({ where: { collectionId: id } }),
        },
      });
      created.push(record);
    }

    return Response.json({
      ok: true,
      created: created.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
      skippedCount: skipped.length,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "添加合集素材失败" }, { status: 400 });
  }
}
