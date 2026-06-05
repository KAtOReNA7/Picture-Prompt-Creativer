import { CollectionsManager } from "@/components/collections/collections-manager";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db/prisma";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">项目归档</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">合集</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          按项目、用途、平台或风格整理 Prompt 分析、模板版本和生成图，并支持统一导出。
        </p>
      </div>

      <CollectionsManager
        initialCollections={collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          useCase: collection.useCase,
          itemCount: collection._count.items,
          updatedAtText: formatDate(collection.updatedAt),
        }))}
      />
    </AppShell>
  );
}
