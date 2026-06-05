import { prisma } from "@/lib/db/prisma";

type CollectionBody = {
  name?: unknown;
  description?: unknown;
  useCase?: unknown;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

export async function GET() {
  const collections = await prisma.collection.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  return Response.json({
    ok: true,
    collections: collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      useCase: collection.useCase,
      itemCount: collection._count.items,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CollectionBody;
    const name = stringValue(body.name);
    if (!name) {
      throw new Error("合集名称必填");
    }

    const collection = await prisma.collection.create({
      data: {
        name,
        description: stringValue(body.description),
        useCase: stringValue(body.useCase),
      },
    });

    return Response.json({
      ok: true,
      collection: {
        ...collection,
        itemCount: 0,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "创建合集失败" }, { status: 400 });
  }
}
