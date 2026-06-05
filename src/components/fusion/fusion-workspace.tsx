"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageGenerationPanel } from "@/components/generation/image-generation-panel";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

type AnalysisListItem = {
  id: string;
  imageId: string | null;
  title: string | null;
  styleSummary: string | null;
  visualSubject: string | null;
  composition: string | null;
  colorPalette: string | null;
  lighting: string | null;
  reversePromptExists: boolean;
  segmentsCount: number;
  fusionsCount: number;
  generatedCount: number;
  createdAt: string;
  imagePreviewUrl: string | null;
};

type AnalysesResponse =
  | {
      ok: true;
      analyses: AnalysisListItem[];
    }
  | {
      ok: false;
      error: string;
    };

type FusionResult = {
  title: string;
  finalPromptEnglish: string;
  negativePromptEnglish: string;
  changeSummary: string;
  preservedElements: string[];
  replacedElements: string[];
  usageAdvice: string;
  riskNotes: string[];
  styleRetentionScore: number;
  requirementMatchScore: number;
  commercialPotentialScore: number;
};

type FusionRecord = {
  id: string;
  analysisId: string;
  userRequirement: string;
  fusedPrompt: string;
  changeSummary: string | null;
  createdAt: string;
};

type FusionResponse =
  | {
      ok: true;
      fusion: FusionRecord;
      result: FusionResult;
    }
  | {
      ok: false;
      error: string;
    };

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-cyan-700">{value}/10</p>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ImagePreview({ analysis }: { analysis: AnalysisListItem }) {
  if (!analysis.imagePreviewUrl) {
    return (
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">
        无图
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={analysis.imagePreviewUrl} alt={analysis.title ?? "分析记录"} className="h-16 w-16 shrink-0 rounded-md object-cover" />
  );
}

export function FusionWorkspace() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [requirement, setRequirement] = useState("");
  const [result, setResult] = useState<FusionResult | null>(null);
  const [fusion, setFusion] = useState<FusionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFusing, setIsFusing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fusionError, setFusionError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    fetch("/api/analyses?limit=50", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("历史分析记录加载失败");
        }

        return (await response.json()) as AnalysesResponse;
      })
      .then((data) => {
        if (!isActive) return;

        if (!data.ok) {
          setError(data.error);
          return;
        }

        const query = new URLSearchParams(window.location.search);
        const queryAnalysisId = query.get("analysisId");
        setAnalyses(data.analyses);
        setSelectedId(queryAnalysisId && data.analyses.some((item) => item.id === queryAnalysisId) ? queryAnalysisId : data.analyses[0]?.id ?? null);
      })
      .catch(() => {
        if (isActive) {
          setError("无法加载历史分析记录");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const selectedAnalysis = useMemo(() => analyses.find((item) => item.id === selectedId) ?? null, [analyses, selectedId]);

  async function startFusion() {
    if (!selectedAnalysis) {
      setFusionError("请先选择一个历史分析记录");
      return;
    }

    if (!requirement.trim()) {
      setFusionError("请先输入新的文字需求");
      return;
    }

    setIsFusing(true);
    setFusionError(null);
    setResult(null);
    setFusion(null);

    try {
      const response = await fetch("/api/prompts/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: selectedAnalysis.id,
          userRequirement: requirement,
        }),
      });
      const data = (await response.json()) as FusionResponse;

      if (!response.ok || !data.ok) {
        setFusionError(data.ok ? "风格迁移 Prompt 生成失败" : data.error);
        return;
      }

      setResult(data.result);
      setFusion(data.fusion);
    } catch {
      setFusionError("风格迁移 Prompt 生成失败，请检查网络或稍后重试");
    } finally {
      setIsFusing(false);
    }
  }

  if (isLoading) {
    return <LoadingState title="正在加载历史分析记录" description="请稍候，系统正在读取可用于风格迁移的 Prompt 模板。" />;
  }

  if (error) {
    return <ErrorState title="加载失败" description={error} actionLabel="重新加载" />;
  }

  if (analyses.length === 0) {
    return (
      <EmptyState
        title="暂无可用于风格迁移的分析记录"
        description="请先前往图片逆向分析页面上传图片并完成 AI 分析，或者直接导入已有 Prompt。"
        actionLabel="去图片逆向分析"
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">历史分析记录</h2>
        <div className="mt-4 grid gap-3">
          {analyses.map((analysis) => (
            <button
              key={analysis.id}
              type="button"
              className={`rounded-md border p-4 text-left transition ${
                selectedId === analysis.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              onClick={() => {
                setSelectedId(analysis.id);
                setResult(null);
                setFusion(null);
                setFusionError(null);
              }}
            >
              <div className="flex gap-3">
                <ImagePreview analysis={analysis} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{analysis.title ?? "未命名分析"}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{analysis.styleSummary ?? "暂无风格摘要"}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>模块：{analysis.segmentsCount}</span>
                <span>融合：{analysis.fusionsCount}</span>
                <span>生成图：{analysis.generatedCount}</span>
                <span>{new Date(analysis.createdAt).toLocaleDateString("zh-CN")}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-6">
        {selectedAnalysis ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
              {selectedAnalysis.imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedAnalysis.imagePreviewUrl} alt={selectedAnalysis.title ?? "分析图片"} className="h-56 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-56 w-full items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-500">
                  无参考图
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{selectedAnalysis.title ?? "未命名分析"}</h2>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-sm font-semibold text-slate-900">风格摘要</dt>
                    <dd className="mt-1 text-sm text-slate-600">{selectedAnalysis.styleSummary ?? "无"}</dd>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-sm font-semibold text-slate-900">画面主体</dt>
                    <dd className="mt-1 text-sm text-slate-600">{selectedAnalysis.visualSubject ?? "无"}</dd>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-sm font-semibold text-slate-900">构图</dt>
                    <dd className="mt-1 text-sm text-slate-600">{selectedAnalysis.composition ?? "无"}</dd>
                  </div>
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-sm font-semibold text-slate-900">色彩</dt>
                    <dd className="mt-1 text-sm text-slate-600">{selectedAnalysis.colorPalette ?? "无"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">输入新文字需求</h2>
          <textarea
            className="mt-5 min-h-48 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="例如：把主体换成古风女刺客，适合小红书悬疑小说封面，保留原图的冷色电影感和强对比光影"
            value={requirement}
            onChange={(event) => setRequirement(event.target.value)}
          />
          <button
            type="button"
            disabled={isFusing}
            className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            onClick={() => void startFusion()}
          >
            {isFusing ? "正在生成" : "生成风格迁移 Prompt"}
          </button>
        </section>

        {isFusing ? (
          <LoadingState title="正在融合原图风格与新需求，生成迁移 Prompt" description="请稍候，文本模型正在保留风格资产并替换新题材。" />
        ) : null}

        {fusionError ? <ErrorState title="生成失败" description={fusionError} actionLabel="重新生成" /> : null}

        {result ? (
          <section className="rounded-md border border-cyan-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">{result.title}</h2>
            <p className="mt-2 text-sm text-slate-500">本阶段可以基于生成的 Prompt 调用 image2 生成单张测试图。</p>

            <div className="mt-6 rounded-md border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-cyan-950">英文 finalPromptEnglish</h3>
                <CopyButton text={result.finalPromptEnglish} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.finalPromptEnglish}</p>
              {fusion ? (
                <div className="mt-4">
                  <ImageGenerationPanel
                    prompt={result.finalPromptEnglish}
                    negativePrompt={result.negativePromptEnglish}
                    sourceType="fusion_prompt"
                    sourceId={fusion.id}
                    title="生成测试图"
                    buttonLabel="生成测试图"
                    compact
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-rose-950">英文 negativePromptEnglish</h3>
                <CopyButton text={result.negativePromptEnglish} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.negativePromptEnglish}</p>
            </div>

            <div className="mt-6 rounded-md bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-900">中文变更说明</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{result.changeSummary}</p>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ListBlock title="保留的风格资产" items={result.preservedElements} />
              <ListBlock title="替换的元素" items={result.replacedElements} />
              <ListBlock title="风险提示" items={result.riskNotes} />
              <div className="rounded-md bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">使用建议</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{result.usageAdvice}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <ScorePill label="风格保留评分" value={result.styleRetentionScore} />
              <ScorePill label="需求匹配评分" value={result.requirementMatchScore} />
              <ScorePill label="商业潜力评分" value={result.commercialPotentialScore} />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
