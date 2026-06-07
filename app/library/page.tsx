import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryBulkManager } from "@/components/library/library-bulk-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db/prisma";
import { countGeneratedImagesForAnalysis } from "@/lib/generation/image-generation-service";

type LibraryPageProps = {
  searchParams: Promise<{
    q?: string;
    hasSegments?: string;
    hasFusions?: string;
    tagId?: string;
    tagSearch?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }>;
};

function parsePage(value?: string): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parsePageSize(value?: string): number {
  const parsed = Number.parseInt(value ?? "24", 10);
  return [24, 48, 96].includes(parsed) ? parsed : 24;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

function makeQuery(params: Awaited<LibraryPageProps["searchParams"]>, overrides: Record<string, string | number | null>) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) next.set(key, value);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return `/library?${next.toString()}`;
}

function buildWhere(params: Awaited<LibraryPageProps["searchParams"]>): Prisma.PromptAnalysisWhereInput {
  const q = params.q?.trim();
  const tagId = params.tagId?.trim();
  const filters: Prisma.PromptAnalysisWhereInput[] = [];
  if (tagId) filters.push({ tags: { some: { tagId } } });

  return {
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { styleSummary: { contains: q } },
            { visualSubject: { contains: q } },
            { reversePrompt: { contains: q } },
          ],
        }
      : {}),
    ...(params.hasSegments === "true" ? { segments: { some: {} } } : {}),
    ...(params.hasSegments === "false" ? { segments: { none: {} } } : {}),
    ...(params.hasFusions === "true" ? { fusions: { some: {} } } : {}),
    ...(params.hasFusions === "false" ? { fusions: { none: {} } } : {}),
    ...(filters.length > 0 ? { AND: filters } : {}),
  };
}

async function getAnalyses(params: Awaited<LibraryPageProps["searchParams"]>) {
  const pageSize = parsePageSize(params.pageSize);
  const requestedPage = parsePage(params.page);
  const sort = params.sort ?? "latest";
  const where = buildWhere(params);
  const total = await prisma.promptAnalysis.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * pageSize;
  const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : sort === "mostFusions" ? { fusions: { _count: "desc" as const } } : { createdAt: "desc" as const };

  const analyses = await prisma.promptAnalysis.findMany({
    where,
    orderBy,
    skip,
    take: pageSize,
    select: {
      id: true,
      title: true,
      importedPromptLanguage: true,
      importMode: true,
      createdAt: true,
      image: { select: { id: true, publicPath: true } },
      tags: {
        include: { tag: true },
        orderBy: { createdAt: "asc" },
      },
      _count: { select: { segments: true, fusions: true, variants: true } },
    },
  });

  const generatedCounts = await Promise.all(analyses.map(async (analysis) => [analysis.id, await countGeneratedImagesForAnalysis(analysis.id)] as const));
  const generatedCountByAnalysisId = new Map(generatedCounts);

  return {
    items: analyses.map((analysis) => ({
      id: analysis.id,
      title: analysis.title,
      importedPromptLanguage: analysis.importedPromptLanguage,
      importMode: analysis.importMode,
      createdAtText: formatDate(analysis.createdAt),
      previewUrl: getPreviewUrl(analysis.image),
      segmentsCount: analysis._count.segments,
      fusionsCount: analysis._count.fusions,
      variantsCount: analysis._count.variants,
      generatedCount: generatedCountByAnalysisId.get(analysis.id) ?? 0,
      tags: analysis.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color,
        category: item.tag.category,
      })),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      from: total === 0 ? 0 : skip + 1,
      to: Math.min(skip + analyses.length, total),
    },
  };
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const { items, pagination } = await getAnalyses(params);
  const tags = await prisma.tag.findMany({
    where: {
      isArchived: false,
      ...(params.tagSearch?.trim() ? { name: { contains: params.tagSearch.trim() } } : {}),
    },
    include: {
      _count: { select: { analyses: true } },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  const currentTag = params.tagId ? await prisma.tag.findUnique({ where: { id: params.tagId }, select: { name: true, category: true, isArchived: true } }) : null;
  const groupedTags = tags
    .sort((a, b) => b._count.analyses - a._count.analyses)
    .reduce<Record<string, typeof tags>>((groups, tag) => {
      const key = tag.category ?? "未分类";
      groups[key] = groups[key] ?? [];
      groups[key].push(tag);
      return groups;
    }, {});
  const collections = await prisma.collection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const listKey = JSON.stringify({ ...params, page: pagination.page, pageSize: pagination.pageSize });

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">素材沉淀</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Prompt 库</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            列表页只保留定位素材所需的摘要信息，完整分析、Prompt、拆解和生成记录仍保留在详情页。
          </p>
          {currentTag ? (
            <p className="mt-2 text-sm font-medium text-cyan-700">
              当前标签筛选：{currentTag.category ? `${currentTag.category} / ` : ""}
              {currentTag.name}
              {currentTag.isArchived ? "（该标签已归档）" : ""}
            </p>
          ) : null}
        </div>
        <Link href="/import" className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
          导入 Prompt
        </Link>
      </div>

      <form className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          placeholder="搜索标题、风格、主体或 Prompt"
        />
        <select name="hasSegments" defaultValue={params.hasSegments ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          <option value="">拆解状态不限</option>
          <option value="true">已有拆解</option>
          <option value="false">未拆解</option>
        </select>
        <select name="hasFusions" defaultValue={params.hasFusions ?? ""} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          <option value="">迁移状态不限</option>
          <option value="true">已有迁移</option>
          <option value="false">未迁移</option>
        </select>
        <select name="sort" defaultValue={params.sort ?? "latest"} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          <option value="latest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="mostFusions">迁移次数最多</option>
        </select>
        <select name="pageSize" defaultValue={String(pagination.pageSize)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          <option value="24">每页 24 条</option>
          <option value="48">每页 48 条</option>
          <option value="96">每页 96 条</option>
        </select>
        <input
          name="tagSearch"
          defaultValue={params.tagSearch ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          placeholder="搜索标签选项"
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">筛选</button>
      </form>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">按分类快速筛选标签</h2>
          {params.tagId || params.q || params.hasSegments || params.hasFusions || params.tagSearch ? (
            <Link href="/library" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              清空筛选
            </Link>
          ) : null}
        </div>
        {Object.keys(groupedTags).length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Object.entries(groupedTags).map(([categoryName, categoryTags]) => (
              <details key={categoryName} open={Boolean(params.tagId && categoryTags.some((tag) => tag.id === params.tagId))} className="rounded-md border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                  {categoryName}（{categoryTags.length}）
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryTags.slice(0, 24).map((tag) => (
                    <Link
                      key={tag.id}
                      href={makeQuery(params, { tagId: tag.id, page: 1 })}
                      className={
                        params.tagId === tag.id
                          ? "rounded-md bg-cyan-600 px-2 py-1 text-xs font-medium text-white"
                          : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-cyan-50 hover:text-cyan-700"
                      }
                    >
                      {tag.name} · {tag._count.analyses}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">没有匹配的标签选项。</p>
        )}
      </section>

      {items.length > 0 ? (
        <>
          <LibraryBulkManager key={listKey} collections={collections} analyses={items} pagination={pagination} params={params} />
          <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <span className="text-slate-600">
              当前显示 {pagination.from}-{pagination.to} 条，共 {pagination.total} 条；第 {pagination.page} / {pagination.totalPages} 页
            </span>
            <div className="flex flex-wrap gap-2">
              <Link
                href={makeQuery(params, { page: Math.max(1, pagination.page - 1), pageSize: pagination.pageSize })}
                className={pagination.hasPrevPage ? "rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" : "pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-300"}
              >
                上一页
              </Link>
              <Link
                href={makeQuery(params, { page: Math.min(pagination.totalPages, pagination.page + 1), pageSize: pagination.pageSize })}
                className={pagination.hasNextPage ? "rounded-md border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50" : "pointer-events-none rounded-md border border-slate-200 px-3 py-2 text-slate-300"}
              >
                下一页
              </Link>
            </div>
          </nav>
        </>
      ) : (
        <EmptyState
          title="没有匹配的 Prompt 记录"
          description="当前搜索或筛选条件下暂无结果，可以清空筛选后重新查看。"
          actionLabel="清空筛选"
          actionHref="/library"
        />
      )}
    </AppShell>
  );
}
