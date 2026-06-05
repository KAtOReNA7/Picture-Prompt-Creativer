import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PromptCard } from "@/components/prompt/prompt-card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/db/prisma";

async function getPromptCards() {
  const analyses = await prisma.promptAnalysis.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      title: true,
      styleSummary: true,
      visualSubject: true,
      topicPotential: true,
      createdAt: true,
      _count: {
        select: {
          segments: true,
          fusions: true,
        },
      },
    },
  });

  return analyses.map((analysis) => ({
    id: analysis.id,
    title: analysis.title ?? "未命名 Prompt 模板",
    style: analysis.styleSummary ?? "未标注风格",
    score: "待评分",
    createdAt: analysis.createdAt.toLocaleDateString("zh-CN"),
    summary: analysis.topicPotential ?? analysis.visualSubject ?? "暂无摘要",
    segmentsCount: analysis._count.segments,
    fusionsCount: analysis._count.fusions,
  }));
}

export default async function LibraryPage() {
  const prompts = await getPromptCards();

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">素材沉淀</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Prompt 库</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            保存分析结果、风格标签、Prompt 模块和风格迁移记录，帮助运营人员快速复用优质视觉方案。
          </p>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="搜索标题、风格或关键词"
          />
          <button className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
            搜索
          </button>
        </div>
      </div>

      {prompts.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="space-y-2">
              <PromptCard title={prompt.title} style={prompt.style} score={prompt.score} createdAt={prompt.createdAt} summary={prompt.summary} />
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-md px-3 py-1 text-sm font-medium ${
                    prompt.segmentsCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  Prompt 模块：{prompt.segmentsCount}
                </span>
                <span className="inline-flex rounded-md bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                  风格迁移：{prompt.fusionsCount}
                </span>
              </div>
              <Link
                href={`/fusion?analysisId=${prompt.id}`}
                className="inline-flex rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
              >
                用于风格迁移
              </Link>
            </div>
          ))}
        </section>
      ) : (
        <EmptyState title="暂无 Prompt 记录" description="请先前往图片逆向分析页面上传图片并完成 AI 分析。" actionLabel="去图片逆向分析" />
      )}
    </AppShell>
  );
}
