import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryBulkManager } from "@/components/library/library-bulk-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db/prisma";

type LibraryPageProps = {
  searchParams: Promise<{
    q?: string;
    hasSegments?: string;
    hasFusions?: string;
    tagId?: string;
    sort?: string;
  }>;
};

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

async function getAnalyses(params: Awaited<LibraryPageProps["searchParams"]>) {
  const q = params.q?.trim();
  const hasSegments = params.hasSegments;
  const hasFusions = params.hasFusions;
  const tagId = params.tagId;
  const sort = params.sort ?? "latest";

  const analyses = await prisma.promptAnalysis.findMany({
    where: {
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
      ...(hasSegments === "true" ? { segments: { some: {} } } : {}),
      ...(hasSegments === "false" ? { segments: { none: {} } } : {}),
      ...(hasFusions === "true" ? { fusions: { some: {} } } : {}),
      ...(hasFusions === "false" ? { fusions: { none: {} } } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {}),
    },
    orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      styleSummary: true,
      visualSubject: true,
      topicPotential: true,
      createdAt: true,
      image: {
        select: {
          id: true,
          publicPath: true,
        },
      },
      fusions: {
        select: {
          id: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          segments: true,
          fusions: true,
          variants: true,
        },
      },
    },
  });

  const sorted = sort === "mostFusions" ? [...analyses].sort((a, b) => b._count.fusions - a._count.fusions) : analyses;

  return Promise.all(
    sorted.slice(0, 50).map(async (analysis) => {
      const generatedCount = await prisma.generatedImage.count({
        where: {
          OR: [
            { sourceType: "analysis_reverse_prompt", sourceId: analysis.id },
            { sourceType: "fusion_prompt", sourceId: { in: analysis.fusions.map((fusion) => fusion.id) } },
          ],
        },
      });

      return {
        ...analysis,
        generatedCount,
      };
    }),
  );
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const analyses = await getAnalyses(params);
  const tags = await prisma.tag.findMany({ orderBy: { createdAt: "desc" } });
  const collections = await prisma.collection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">素材沉淀</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Prompt 库</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            保存图片分析、手动导入 Prompt、拆解模块、风格迁移记录和生成测试图，方便运营人员快速复用优质视觉方案。
          </p>
        </div>
        <Link
          href="/import"
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          导入 Prompt
        </Link>
      </div>

      <form className="mb-6 grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          placeholder="搜索标题、风格、主体或 Prompt"
        />
        <select
          name="hasSegments"
          defaultValue={params.hasSegments ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">拆解状态不限</option>
          <option value="true">已有拆解</option>
          <option value="false">未拆解</option>
        </select>
        <select
          name="hasFusions"
          defaultValue={params.hasFusions ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">迁移状态不限</option>
          <option value="true">已有迁移</option>
          <option value="false">未迁移</option>
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? "latest"}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="latest">最新优先</option>
          <option value="oldest">最早优先</option>
          <option value="mostFusions">迁移次数最多</option>
        </select>
        <select
          name="tagId"
          defaultValue={params.tagId ?? ""}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        >
          <option value="">标签不限</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
          筛选
        </button>
      </form>

      {analyses.length > 0 ? (
        <LibraryBulkManager
          collections={collections}
          analyses={analyses.map((analysis) => ({
            id: analysis.id,
            title: analysis.title,
            styleSummary: analysis.styleSummary,
            visualSubject: analysis.visualSubject,
            topicPotential: analysis.topicPotential,
            createdAtText: formatDate(analysis.createdAt),
            previewUrl: getPreviewUrl(analysis.image),
            segmentsCount: analysis._count.segments,
            fusionsCount: analysis._count.fusions,
            variantsCount: analysis._count.variants,
            generatedCount: analysis.generatedCount,
            tags: analysis.tags.map((item) => ({
              id: item.tag.id,
              name: item.tag.name,
              color: item.tag.color,
            })),
          }))}
        />
      ) : (
        <EmptyState
          title="暂无 Prompt 记录"
          description="可以先上传图片完成 AI 逆向分析，也可以直接导入已有英文 Prompt。"
          actionLabel="去图片逆向分析"
        />
      )}
    </AppShell>
  );
}
