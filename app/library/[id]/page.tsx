import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LibraryDetailActions } from "@/components/library/library-detail-actions";
import { CopyButton } from "@/components/ui/copy-button";
import { prisma } from "@/lib/db/prisma";

type LibraryDetailPageProps = {
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

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function getPreviewUrl(image: { id: string; publicPath: string | null } | null): string | null {
  if (!image) return null;
  return image.publicPath ?? `/api/images/${image.id}/file`;
}

function InfoBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="text-sm font-semibold text-slate-900">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-slate-600">{value || "未填写"}</dd>
    </div>
  );
}

export default async function LibraryDetailPage({ params }: LibraryDetailPageProps) {
  const { id } = await params;
  const analysis = await prisma.promptAnalysis.findUnique({
    where: { id },
    include: {
      image: true,
      segments: {
        orderBy: { sortOrder: "asc" },
      },
      fusions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!analysis) {
    notFound();
  }

  const previewUrl = getPreviewUrl(analysis.image);

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">Prompt 详情</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{analysis.title ?? "未命名 Prompt 模板"}</h1>
          <p className="mt-3 text-sm text-slate-500">创建时间：{formatDate(analysis.createdAt)}</p>
        </div>
        <LibraryDetailActions analysisId={analysis.id} reversePrompt={analysis.reversePrompt} negativePrompt={analysis.negativePrompt} />
      </div>

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={analysis.image?.originalName ?? analysis.title ?? "Prompt 参考图"} className="max-h-[420px] w-full rounded-md object-contain" />
          ) : (
            <div className="flex h-72 w-full items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-500">
              无参考图
            </div>
          )}

          <dl className="mt-4 grid gap-3 text-sm">
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">原文件名</dt>
              <dd className="mt-1 break-all text-slate-600">{analysis.image?.originalName ?? "无参考图"}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">文件格式</dt>
              <dd className="mt-1 text-slate-600">{analysis.image?.mimeType ?? "无"}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">文件大小</dt>
              <dd className="mt-1 text-slate-600">{analysis.image ? formatBytes(analysis.image.size) : "无"}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">结构化分析</h2>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoBlock label="画面主体" value={analysis.visualSubject} />
              <InfoBlock label="风格" value={analysis.styleSummary} />
              <InfoBlock label="年代感" value={analysis.eraFeeling} />
              <InfoBlock label="构图" value={analysis.composition} />
              <InfoBlock label="色彩" value={analysis.colorPalette} />
              <InfoBlock label="光影" value={analysis.lighting} />
              <InfoBlock label="材质" value={analysis.texture} />
              <InfoBlock label="题材卖点" value={analysis.topicPotential} />
            </dl>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">英文 Reverse Prompt</h2>
              {analysis.reversePrompt ? <CopyButton text={analysis.reversePrompt} /> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-md bg-cyan-50 p-4 text-sm leading-7 text-slate-700">
              {analysis.reversePrompt ?? "暂无 Reverse Prompt"}
            </p>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-950">英文 Negative Prompt</h2>
              {analysis.negativePrompt ? <CopyButton text={analysis.negativePrompt} /> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap rounded-md bg-rose-50 p-4 text-sm leading-7 text-slate-700">
              {analysis.negativePrompt ?? "暂无 Negative Prompt"}
            </p>
          </section>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">Prompt 模块拆解</h2>
            <p className="mt-2 text-sm text-slate-500">当前共 {analysis.segments.length} 个模块</p>
          </div>
        </div>

        {analysis.segments.length > 0 ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {analysis.segments.map((segment) => (
              <article key={segment.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">{segment.label}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-500">type: {segment.type}</p>
                  </div>
                  <span
                    className={
                      segment.isReplaceable
                        ? "rounded-md bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-md bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    }
                  >
                    {segment.isReplaceable ? "可替换" : "建议保留"}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">{segment.content}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">替换建议：{segment.replaceHint ?? "暂无建议"}</p>
                <div className="mt-3">
                  <CopyButton text={segment.content} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            暂无拆解模块，可点击页面顶部“重新拆解 Prompt”生成模块。
          </div>
        )}
      </section>

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">风格迁移历史</h2>
        {analysis.fusions.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {analysis.fusions.map((fusion) => (
              <article key={fusion.id} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">新需求</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{fusion.userRequirement}</p>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(fusion.createdAt)}</span>
                </div>
                {fusion.changeSummary ? (
                  <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">变更说明：{fusion.changeSummary}</p>
                ) : null}
                <div className="mt-4 rounded-md bg-cyan-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-cyan-950">融合 Prompt</h4>
                    <CopyButton text={fusion.fusedPrompt} />
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{fusion.fusedPrompt}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            暂无风格迁移记录，可点击页面顶部“用于风格迁移”生成新的融合 Prompt。
          </div>
        )}
      </section>
    </AppShell>
  );
}
