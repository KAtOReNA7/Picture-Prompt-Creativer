import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCollectionPanel } from "@/components/collections/add-to-collection-panel";
import { AppShell } from "@/components/layout/app-shell";
import { PromptVariantActions } from "@/components/prompt-variants/prompt-variant-actions";
import { CopyButton } from "@/components/ui/copy-button";
import { prisma } from "@/lib/db/prisma";

type PromptVariantDetailPageProps = {
  params: Promise<{
    id: string;
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

function sourceLabel(source: string): string {
  if (source === "manual_compose") return "手动组合";
  if (source === "ai_polished") return "AI 润色";
  if (source === "segment_replace") return "模块替换";
  return source;
}

function fileUrl(id: string): string {
  return `/api/generated-images/${id}/file`;
}

export default async function PromptVariantDetailPage({ params }: PromptVariantDetailPageProps) {
  const { id } = await params;
  const variant = await prisma.promptVariant.findUnique({
    where: { id },
    include: {
      analysis: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!variant) {
    notFound();
  }

  const generatedImages = await prisma.generatedImage.findMany({
    where: {
      sourceType: "custom_prompt",
      sourceId: variant.id,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  const collections = await prisma.collection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">Prompt 模板版本</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{variant.title}</h1>
          <p className="mt-3 text-sm text-slate-500">创建时间：{formatDate(variant.createdAt)}</p>
        </div>
        <Link
          href={`/library/${variant.analysisId}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          返回所属 Prompt
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-4 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">所属分析</p>
            <Link href={`/library/${variant.analysisId}`} className="mt-2 block text-sm text-cyan-700 hover:underline">
              {variant.analysis.title ?? variant.analysisId}
            </Link>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">来源</p>
            <p className="mt-2 text-sm text-slate-600">{sourceLabel(variant.source)}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">备注</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{variant.userNote ?? "无"}</p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-md border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-cyan-950">Composed Prompt</h2>
              <CopyButton text={variant.composedPrompt} label="复制 Prompt" />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{variant.composedPrompt}</p>
          </section>

          <section className="rounded-md border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-rose-950">Negative Prompt</h2>
              {variant.negativePrompt ? <CopyButton text={variant.negativePrompt} label="复制 Negative Prompt" /> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{variant.negativePrompt ?? "无"}</p>
          </section>

          <details className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-xl font-semibold text-slate-950">查看编辑过的模块 JSON</summary>
            <pre className="mt-4 overflow-auto rounded-md bg-slate-950 p-4 text-xs leading-5 text-slate-100">
              {variant.editedSegmentsJson ?? "无"}
            </pre>
          </details>

          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">操作</h2>
            <div className="mt-4">
              <PromptVariantActions variant={variant} />
            </div>
          </section>

          <AddToCollectionPanel itemType="prompt_variant" itemId={variant.id} collections={collections} />
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">基于该版本生成的测试图</h2>
        {generatedImages.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {generatedImages.map((image) => (
              <article key={image.id} className="rounded-md border border-slate-200 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(image.id)} alt="生成图" className="h-56 w-full rounded-md object-cover" />
                <p className="mt-3 text-xs text-slate-500">{formatDate(image.createdAt)}</p>
                <Link
                  href={`/generated-images/${image.id}`}
                  className="mt-3 inline-flex rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  查看生成图详情
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            暂无基于该版本生成的测试图。
          </div>
        )}
      </section>
    </AppShell>
  );
}
