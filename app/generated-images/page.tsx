import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyButton } from "@/components/ui/copy-button";
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

function fileUrl(id: string): string {
  return `/api/generated-images/${id}/file`;
}

function sourceTypeLabel(sourceType: string): string {
  if (sourceType === "analysis_reverse_prompt") return "Reverse Prompt";
  if (sourceType === "fusion_prompt") return "风格迁移 Prompt";
  if (sourceType === "custom_prompt") return "自定义 Prompt";
  return sourceType;
}

export default async function GeneratedImagesPage() {
  const images = await prisma.generatedImage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          evaluations: true,
        },
      },
    },
  });

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">生成结果</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">生成图</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          查看最近生成的测试图、生成参数和最近一次评估评分，并进入详情页做 Prompt 迭代优化。
        </p>
      </div>

      {images.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => {
            const latestEvaluation = image.evaluations[0] ?? null;

            return (
              <article key={image.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(image.id)} alt="生成图预览" className="h-56 w-full rounded-md object-cover" />
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded-md bg-cyan-50 px-2 py-1 text-cyan-700">{sourceTypeLabel(image.sourceType)}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{image.model}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{image.size}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{image.quality ?? "未记录"}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{image.format ?? "未记录"}</span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{image.prompt}</p>
                <p className="mt-3 text-xs text-slate-500">{formatDate(image.createdAt)}</p>

                <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
                  {latestEvaluation ? (
                    <>
                      <p className="font-semibold text-slate-900">最近评估：{latestEvaluation.overallScore}/10</p>
                      <p className="mt-1 line-clamp-2 text-slate-600">{latestEvaluation.summary}</p>
                    </>
                  ) : (
                    <p className="text-slate-500">暂无评估</p>
                  )}
                  <p className="mt-2 text-xs text-slate-500">评估次数：{image._count.evaluations}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/generated-images/${image.id}`}
                    className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                  >
                    查看详情
                  </Link>
                  <CopyButton text={fileUrl(image.id)} label="复制图片地址" />
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState title="暂无生成图" description="请先在风格迁移页或 Prompt 详情页生成测试图。" actionLabel="去风格迁移" actionHref="/fusion" />
      )}
    </AppShell>
  );
}
