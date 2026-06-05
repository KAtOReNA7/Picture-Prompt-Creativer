import { notFound } from "next/navigation";
import { CollectionDetailManager } from "@/components/collections/collection-detail-manager";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db/prisma";

type CollectionDetailPageProps = {
  params: Promise<{ id: string }>;
};

function imagePreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

async function buildItem(item: {
  id: string;
  itemType: string;
  itemId: string;
  note: string | null;
}) {
  if (item.itemType === "analysis") {
    const analysis = await prisma.promptAnalysis.findUnique({
      where: { id: item.itemId },
      include: {
        image: { select: { id: true, publicPath: true } },
        tags: { include: { tag: true } },
      },
    });

    return {
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
      note: item.note,
      title: analysis?.title ?? "已删除的 Prompt 分析",
      description: analysis?.styleSummary ?? analysis?.visualSubject ?? "暂无摘要",
      imagePreviewUrl: imagePreviewUrl(analysis?.image ?? null),
      href: `/library/${item.itemId}`,
      badges: analysis?.tags.map((tag) => tag.tag.name) ?? [],
    };
  }

  if (item.itemType === "prompt_variant") {
    const variant = await prisma.promptVariant.findUnique({
      where: { id: item.itemId },
      include: { analysis: { select: { title: true } } },
    });

    return {
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
      note: item.note,
      title: variant?.title ?? "已删除的模板版本",
      description: variant?.composedPrompt ?? "暂无 Prompt",
      imagePreviewUrl: null,
      href: `/prompt-variants/${item.itemId}`,
      badges: [variant?.source ?? "模板版本", variant?.analysis.title ?? "未命名分析"].filter(Boolean),
    };
  }

  const image = await prisma.generatedImage.findUnique({
    where: { id: item.itemId },
    include: { evaluations: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  return {
    id: item.id,
    itemType: item.itemType,
    itemId: item.itemId,
    note: item.note,
    title: image ? `生成图 ${image.id}` : "已删除的生成图",
    description: image?.prompt ?? "暂无 Prompt",
    imagePreviewUrl: image ? `/api/generated-images/${image.id}/file` : null,
    href: `/generated-images/${item.itemId}`,
    badges: [image?.sourceType ?? "生成图", image?.evaluations[0] ? `评分 ${image.evaluations[0].overallScore}` : "未评估"].filter(Boolean),
  };
}

export default async function CollectionDetailPage({ params }: CollectionDetailPageProps) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!collection) {
    notFound();
  }

  const items = await Promise.all(collection.items.map(buildItem));

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">合集详情</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{collection.name}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          管理合集基础信息，按素材类型筛选，跳转原始详情，或导出为 JSON / Markdown。
        </p>
      </div>

      <CollectionDetailManager
        initialCollection={{
          id: collection.id,
          name: collection.name,
          description: collection.description,
          useCase: collection.useCase,
        }}
        initialItems={items}
      />
    </AppShell>
  );
}
