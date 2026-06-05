import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCollectionPanel } from "@/components/collections/add-to-collection-panel";
import { GeneratedImageDetailWorkspace } from "@/components/generation/generated-image-detail-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { CopyButton } from "@/components/ui/copy-button";
import { prisma } from "@/lib/db/prisma";

type GeneratedImageDetailPageProps = {
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

function fileUrl(id: string): string {
  return `/api/generated-images/${id}/file`;
}

function sourceTypeLabel(sourceType: string): string {
  if (sourceType === "analysis_reverse_prompt") return "Reverse Prompt";
  if (sourceType === "fusion_prompt") return "风格迁移 Prompt";
  if (sourceType === "custom_prompt") return "自定义 Prompt";
  return sourceType;
}

function parseJsonList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default async function GeneratedImageDetailPage({ params }: GeneratedImageDetailPageProps) {
  const { id } = await params;
  const image = await prisma.generatedImage.findUnique({
    where: { id },
    include: {
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!image) {
    notFound();
  }

  const latestEvaluation = image.evaluations[0] ?? null;
  const collections = await prisma.collection.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, name: true } });
  const initialEvaluation = latestEvaluation
    ? {
        overallScore: latestEvaluation.overallScore,
        promptMatchScore: latestEvaluation.promptMatchScore,
        styleRetentionScore: latestEvaluation.styleRetentionScore ?? latestEvaluation.promptMatchScore,
        requirementMatchScore: latestEvaluation.requirementMatchScore ?? latestEvaluation.promptMatchScore,
        compositionScore: latestEvaluation.compositionScore,
        colorScore: latestEvaluation.colorScore,
        lightingScore: latestEvaluation.lightingScore,
        subjectScore: latestEvaluation.subjectScore,
        commercialPotentialScore: latestEvaluation.commercialPotentialScore,
        summary: latestEvaluation.summary,
        strengths: parseJsonList(latestEvaluation.strengths),
        weaknesses: parseJsonList(latestEvaluation.weaknesses),
        improvementAdvice: parseJsonList(latestEvaluation.improvementAdvice),
        improvedPrompt: latestEvaluation.improvedPrompt,
        improvedNegativePrompt: latestEvaluation.improvedNegativePrompt ?? "",
      }
    : null;

  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">生成图详情</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">生成图效果评估</h1>
          <p className="mt-3 text-sm text-slate-500">创建时间：{formatDate(image.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/generated-images"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            返回生成图
          </Link>
          <a
            href={fileUrl(image.id)}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
          >
            打开图片
          </a>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(image.id)} alt="生成图预览" className="max-h-[640px] w-full rounded-md object-contain" />
        </div>

        <div className="space-y-6">
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">生成参数</h2>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">来源</dt>
                <dd className="mt-1 text-slate-600">{sourceTypeLabel(image.sourceType)}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">sourceId</dt>
                <dd className="mt-1 break-all text-slate-600">{image.sourceId ?? "无"}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">模型</dt>
                <dd className="mt-1 break-all text-slate-600">{image.model}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="font-semibold text-slate-900">尺寸 / 质量 / 格式</dt>
                <dd className="mt-1 text-slate-600">
                  {image.size} / {image.quality ?? "未记录"} / {image.format ?? "未记录"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-cyan-200 bg-cyan-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-cyan-950">生成 Prompt</h2>
              <CopyButton text={image.prompt} />
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{image.prompt}</p>
          </section>

          <section className="rounded-md border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-rose-950">Negative Prompt</h2>
              {image.negativePrompt ? <CopyButton text={image.negativePrompt} /> : null}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{image.negativePrompt ?? "无"}</p>
          </section>

          <AddToCollectionPanel itemType="generated_image" itemId={image.id} collections={collections} />
        </div>
      </section>

      <div className="mt-6">
        <GeneratedImageDetailWorkspace imageId={image.id} initialEvaluation={initialEvaluation} initialEvaluationId={latestEvaluation?.id ?? null} />
      </div>
    </AppShell>
  );
}
