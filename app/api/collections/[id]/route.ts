import { prisma } from "@/lib/db/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CollectionBody = {
  name?: unknown;
  description?: unknown;
  useCase?: unknown;
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value.trim() : null;
}

function imagePreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

async function buildItemSummary(itemType: string, itemId: string) {
  if (itemType === "analysis") {
    const analysis = await prisma.promptAnalysis.findUnique({
      where: { id: itemId },
      include: {
        image: { select: { id: true, publicPath: true } },
        tags: { include: { tag: true } },
      },
    });
    return analysis
      ? {
          title: analysis.title,
          imagePreviewUrl: imagePreviewUrl(analysis.image),
          styleSummary: analysis.styleSummary,
          tags: analysis.tags.map((item) => ({ id: item.tag.id, name: item.tag.name, color: item.tag.color })),
          href: `/library/${analysis.id}`,
        }
      : null;
  }

  if (itemType === "prompt_variant") {
    const variant = await prisma.promptVariant.findUnique({
      where: { id: itemId },
      include: { analysis: { select: { id: true, title: true } } },
    });
    return variant
      ? {
          title: variant.title,
          composedPrompt: variant.composedPrompt,
          analysis: variant.analysis,
          href: `/prompt-variants/${variant.id}`,
        }
      : null;
  }

  if (itemType === "generated_image") {
    const image = await prisma.generatedImage.findUnique({
      where: { id: itemId },
      include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    return image
      ? {
          imagePreviewUrl: `/api/generated-images/${image.id}/file`,
          score: image.evaluations[0]?.overallScore ?? null,
          sourceType: image.sourceType,
          href: `/generated-images/${image.id}`,
        }
      : null;
  }

  return null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!collection) {
    return Response.json({ ok: false, error: "合集不存在" }, { status: 404 });
  }

  const items = await Promise.all(
    collection.items.map(async (item) => ({
      id: item.id,
      collectionId: item.collectionId,
      itemType: item.itemType,
      itemId: item.itemId,
      note: item.note,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
      summary: await buildItemSummary(item.itemType, item.itemId),
    })),
  );

  return Response.json({
    ok: true,
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      useCase: collection.useCase,
      createdAt: collection.createdAt.toISOString(),
      updatedAt: collection.updatedAt.toISOString(),
      itemCount: items.length,
    },
    items,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as CollectionBody;
    const name = stringValue(body.name);

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(body.description !== undefined ? { description: stringValue(body.description) } : {}),
        ...(body.useCase !== undefined ? { useCase: stringValue(body.useCase) } : {}),
      },
      include: { _count: { select: { items: true } } },
    });

    return Response.json({
      ok: true,
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        useCase: collection.useCase,
        itemCount: collection._count.items,
        createdAt: collection.createdAt.toISOString(),
        updatedAt: collection.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "更新合集失败" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.collection.delete({ where: { id } });
    return Response.json({ ok: true, message: "合集已删除，原始素材已保留" });
  } catch {
    return Response.json({ ok: false, error: "删除合集失败，合集可能不存在" }, { status: 400 });
  }
}
