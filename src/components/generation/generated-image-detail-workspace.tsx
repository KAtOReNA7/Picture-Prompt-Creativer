"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { imageEvaluationProgress, imageGenerationProgress } from "@/lib/ui/operation-progress-presets";

type EvaluationResult = {
  overallScore: number;
  promptMatchScore: number;
  styleRetentionScore: number;
  requirementMatchScore: number;
  compositionScore: number;
  colorScore: number;
  lightingScore: number;
  subjectScore: number;
  commercialPotentialScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  improvedPrompt: string;
  improvedNegativePrompt: string;
};

type EvaluationRecord = {
  id: string;
  generatedImageId: string;
  overallScore: number;
  promptMatchScore: number;
  styleRetentionScore: number | null;
  requirementMatchScore: number | null;
  compositionScore: number;
  colorScore: number;
  lightingScore: number;
  subjectScore: number;
  commercialPotentialScore: number;
  summary: string;
  strengths: string;
  weaknesses: string;
  improvementAdvice: string;
  improvedPrompt: string;
  improvedNegativePrompt: string | null;
  createdAt: string;
};

type EvaluateResponse =
  | {
      ok: true;
      evaluation: EvaluationRecord;
      result: EvaluationResult;
    }
  | {
      ok: false;
      error: string;
    };

type GeneratedImageRecord = {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  sourceType: string;
  sourceId: string | null;
  model: string;
  size: string;
  quality: string | null;
  format: string | null;
  fileUrl: string;
  originAnalysisId: string | null;
  createdAt: string;
};

type GenerateResponse =
  | {
      ok: true;
      image: GeneratedImageRecord;
    }
  | {
      ok: false;
      error: string;
    };

type GeneratedImageDetailWorkspaceProps = {
  imageId: string;
  originAnalysisId?: string | null;
  initialEvaluation?: EvaluationResult | null;
  initialEvaluationId?: string | null;
};

function ScoreCard({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-cyan-700">{value ?? "未评"}/10</p>
    </div>
  );
}

function TextList({ title, items }: { title: string; items: string[] }) {
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

export function GeneratedImageDetailWorkspace({
  imageId,
  originAnalysisId,
  initialEvaluation,
  initialEvaluationId,
}: GeneratedImageDetailWorkspaceProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(initialEvaluation ?? null);
  const [evaluationId, setEvaluationId] = useState<string | null>(initialEvaluationId ?? null);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImageRecord | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const { progress, startProgress, completeProgress, failProgress, hideProgress } = useOperationProgress();

  async function evaluate() {
    setIsEvaluating(true);
    setError(null);
    startProgress(imageEvaluationProgress);

    try {
      const response = await fetch(`/api/generated-images/${imageId}/evaluate`, {
        method: "POST",
      });
      const data = (await response.json()) as EvaluateResponse;

      if (!response.ok || !data.ok) {
        const message = data.ok ? "评估失败" : data.error;
        setError(message);
        failProgress(message);
        return;
      }

      setEvaluation(data.result);
      setEvaluationId(data.evaluation.id);
      completeProgress("生成图评估已完成");
    } catch {
      const message = "评估失败，请检查网络或稍后重试";
      setError(message);
      failProgress(message);
    } finally {
      setIsEvaluating(false);
    }
  }

  async function generateWithImprovedPrompt() {
    if (!evaluation) return;
    setIsGenerating(true);
    setGenerateError(null);
    setGeneratedImage(null);
    startProgress(imageGenerationProgress);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: evaluation.improvedPrompt,
          negativePrompt: evaluation.improvedNegativePrompt,
          sourceType: "custom_prompt",
          sourceId: evaluationId,
          originAnalysisId,
          size: "1024x1024",
          quality: "low",
          format: "png",
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.ok) {
        const message = data.ok ? "生成失败" : data.error;
        setGenerateError(message);
        failProgress(message);
        return;
      }

      setGeneratedImage(data.image);
      completeProgress("改良 Prompt 生成图已完成");
    } catch {
      const message = "生成失败，请检查网络或稍后重试";
      setGenerateError(message);
      failProgress(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <OperationProgressModal {...progress} onClose={hideProgress} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">生成图效果评估</h2>
          <p className="mt-2 text-sm text-slate-500">使用视觉模型评估图片效果，并生成可再次使用的改良版英文 Prompt。</p>
        </div>
        <button
          type="button"
          disabled={isEvaluating}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => void evaluate()}
        >
          {isEvaluating ? "评估中" : "评估生成效果"}
        </button>
      </div>

      {isEvaluating ? (
        <div className="mt-5">
          <LoadingState title="正在评估生成图效果，并生成 Prompt 优化建议" description="请稍候，视觉模型正在结合图片、Prompt 和来源上下文进行判断。" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-5">
          <ErrorState title="评估失败" description={error} />
        </div>
      ) : null}

      {evaluation ? (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <ScoreCard label="综合评分" value={evaluation.overallScore} />
            <ScoreCard label="Prompt 匹配" value={evaluation.promptMatchScore} />
            <ScoreCard label="风格保留" value={evaluation.styleRetentionScore} />
            <ScoreCard label="需求匹配" value={evaluation.requirementMatchScore} />
            <ScoreCard label="商业潜力" value={evaluation.commercialPotentialScore} />
            <ScoreCard label="构图" value={evaluation.compositionScore} />
            <ScoreCard label="色彩" value={evaluation.colorScore} />
            <ScoreCard label="光影" value={evaluation.lightingScore} />
            <ScoreCard label="主体" value={evaluation.subjectScore} />
          </div>

          <div className="rounded-md bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">总体评价</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{evaluation.summary}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TextList title="优点" items={evaluation.strengths} />
            <TextList title="问题" items={evaluation.weaknesses} />
            <TextList title="优化建议" items={evaluation.improvementAdvice} />
          </div>

          <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-cyan-950">改良版英文 Prompt</h3>
              <CopyButton text={evaluation.improvedPrompt} label="复制 Prompt" />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{evaluation.improvedPrompt}</p>
          </div>

          <div className="rounded-md border border-rose-200 bg-rose-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-rose-950">改良版 Negative Prompt</h3>
              <CopyButton text={evaluation.improvedNegativePrompt} label="复制 Negative Prompt" />
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{evaluation.improvedNegativePrompt}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isGenerating}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              onClick={() => void generateWithImprovedPrompt()}
            >
              {isGenerating ? "正在生成" : "用改良 Prompt 再生成"}
            </button>
          </div>

          {isGenerating ? (
            <LoadingState title="正在使用改良 Prompt 生成新图" description="系统正在调用 image2，并将新图保存到生成图历史。" />
          ) : null}

          {generateError ? <ErrorState title="再生成失败" description={generateError} /> : null}

          {generatedImage ? (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImage.fileUrl} alt="改良 Prompt 生成图" className="max-h-[520px] w-full rounded-md object-contain" />
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/generated-images/${generatedImage.id}`}
                  className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
                >
                  跳转新图详情
                </Link>
                <a
                  href={generatedImage.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
                >
                  打开图片
                </a>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
