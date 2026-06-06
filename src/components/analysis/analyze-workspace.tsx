"use client";

import { useState } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { CopyButton } from "@/components/ui/copy-button";
import { ImageUploader, type UploadedImage } from "@/components/upload/image-uploader";

type ReplaceableField = {
  field: string;
  currentValue: string;
  replaceHint: string;
};

type ImageAnalysisResult = {
  title: string;
  imageSummary: string;
  subject: string;
  style: string;
  eraFeeling: string;
  composition: string;
  colorPalette: string;
  lighting: string;
  texture: string;
  mood: string;
  topicPotential: string;
  reversePromptEnglish: string;
  negativePromptEnglish: string;
  replaceableFields: ReplaceableField[];
  tags: string[];
  qualityScore: number;
  commercialPotentialScore: number;
};

type SavedAnalysis = {
  id: string;
  imageId: string;
  title: string | null;
  styleSummary: string | null;
  visualSubject: string | null;
  composition: string | null;
  colorPalette: string | null;
  lighting: string | null;
  texture: string | null;
  eraFeeling: string | null;
  topicPotential: string | null;
  reversePrompt: string | null;
  negativePrompt: string | null;
  createdAt: string;
};

type PromptSegment = {
  id: string;
  type: string;
  label: string;
  content: string;
  isReplaceable: boolean;
  replaceHint: string | null;
  sortOrder: number;
};

type SegmentationResult = {
  analysisId: string;
  segments: PromptSegment[];
  templateSummary: string;
  replacementStrategy: string;
};

type AnalyzeResponse =
  | {
      ok: true;
      analysis: SavedAnalysis;
      result: ImageAnalysisResult;
    }
  | {
      ok: false;
      error: string;
    };

type SegmentResponse =
  | ({
      ok: true;
    } & SegmentationResult)
  | {
      ok: false;
      error: string;
    };

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <dt className="text-sm font-semibold text-slate-900">{label}</dt>
      <dd className="mt-2 text-sm leading-6 text-slate-600">{value}</dd>
    </div>
  );
}

function AnalysisResultView({ result }: { result: ImageAnalysisResult }) {
  const detailItems = [
    ["模板标题", result.title],
    ["图片整体描述", result.imageSummary],
    ["画面主体", result.subject],
    ["风格", result.style],
    ["年代感", result.eraFeeling],
    ["构图", result.composition],
    ["色彩", result.colorPalette],
    ["光影", result.lighting],
    ["材质", result.texture],
    ["情绪", result.mood],
    ["选题传播潜力", result.topicPotential],
    ["质量评分", result.qualityScore],
    ["商业潜力评分", result.commercialPotentialScore],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">真实 AI 分析结果</h2>
          <p className="mt-1 text-sm text-slate-500">该 prompt 是风格迁移参考，不保证逐像素复刻原图。</p>
        </div>
        <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">已保存</span>
      </div>

      <dl className="mt-6 grid gap-4">
        {detailItems.map(([label, value]) => (
          <DetailItem key={label} label={String(label)} value={value} />
        ))}
      </dl>

      <div className="mt-6 rounded-md bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">标签</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {result.tags.length > 0 ? (
            result.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                {tag}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">暂无标签</span>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-md bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">可替换字段</h3>
        <div className="mt-3 grid gap-3">
          {result.replaceableFields.map((item) => (
            <div key={item.field} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-semibold text-slate-900">{item.field}</p>
              <p className="mt-1 text-sm text-slate-600">当前内容：{item.currentValue}</p>
              <p className="mt-1 text-sm text-slate-600">替换建议：{item.replaceHint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-cyan-200 bg-cyan-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-cyan-950">英文 reverse prompt</h3>
          <CopyButton text={result.reversePromptEnglish} label="复制 Prompt" />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.reversePromptEnglish}</p>
      </div>

      <div className="mt-6 rounded-md border border-rose-200 bg-rose-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-rose-950">英文 negative prompt</h3>
          <CopyButton text={result.negativePromptEnglish} label="复制 Negative Prompt" />
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.negativePromptEnglish}</p>
      </div>
    </section>
  );
}

function SegmentationView({ segmentation }: { segmentation: SegmentationResult }) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-cyan-700">Prompt 模块拆解</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">已生成 11 个结构化模块</h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-md bg-cyan-50 p-4">
          <h3 className="text-sm font-semibold text-cyan-950">模板保留重点</h3>
          <p className="mt-2 text-sm leading-6 text-cyan-800">{segmentation.templateSummary}</p>
        </div>
        <div className="rounded-md bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-950">替换策略</h3>
          <p className="mt-2 text-sm leading-6 text-amber-800">{segmentation.replacementStrategy}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {segmentation.segments.map((segment) => (
          <article key={segment.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">{segment.label}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{segment.type}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    segment.isReplaceable ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {segment.isReplaceable ? "可替换" : "建议保留"}
                </span>
                <CopyButton text={segment.content} label="复制 Prompt" />
              </div>
            </div>
            <p className="mt-4 rounded-md bg-white p-3 text-sm leading-7 text-slate-700">{segment.content}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">替换建议：{segment.replaceHint ?? "暂无替换建议"}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AnalyzeWorkspace() {
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [analysis, setAnalysis] = useState<SavedAnalysis | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [segmentation, setSegmentation] = useState<SegmentationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentError, setSegmentError] = useState<string | null>(null);

  async function startAnalysis() {
    if (!uploadedImage) {
      setError("请先上传图片。");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setSegmentError(null);
    setResult(null);
    setAnalysis(null);
    setSegmentation(null);

    try {
      const response = await fetch("/api/images/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId: uploadedImage.id }),
      });
      const data = (await response.json()) as AnalyzeResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "图片分析失败。" : data.error);
        return;
      }

      setAnalysis(data.analysis);
      setResult(data.result);
    } catch {
      setError("图片分析失败，请检查网络或稍后重试。");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function startSegmentation() {
    if (!analysis) {
      setSegmentError("请先完成图片 AI 分析。");
      return;
    }

    setIsSegmenting(true);
    setSegmentError(null);

    try {
      const response = await fetch("/api/prompts/segment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysisId: analysis.id }),
      });
      const data = (await response.json()) as SegmentResponse;

      if (!response.ok || !data.ok) {
        setSegmentError(data.ok ? "Prompt 拆解失败。" : data.error);
        return;
      }

      setSegmentation({
        analysisId: data.analysisId,
        segments: data.segments,
        templateSummary: data.templateSummary,
        replacementStrategy: data.replacementStrategy,
      });
    } catch {
      setSegmentError("Prompt 拆解失败，请检查网络或稍后重试。");
    } finally {
      setIsSegmenting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <div>
        <ImageUploader
          onUploaded={(image) => {
            setUploadedImage(image);
            setAnalysis(null);
            setResult(null);
            setSegmentation(null);
            setError(null);
            setSegmentError(null);
          }}
        />
        <button
          type="button"
          disabled={!uploadedImage || isAnalyzing}
          className="mt-5 w-full rounded-md bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => void startAnalysis()}
        >
          {isAnalyzing ? "正在分析" : "开始 AI 分析"}
        </button>
        <button
          type="button"
          disabled={!analysis || isSegmenting}
          className="mt-3 w-full rounded-md border border-cyan-300 bg-white px-5 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
          onClick={() => void startSegmentation()}
        >
          {isSegmenting ? "正在拆解" : "拆解 Prompt"}
        </button>
        {analysis ? (
          <Link
            href={`/fusion?analysisId=${analysis.id}`}
            className="mt-3 block w-full rounded-md border border-emerald-300 bg-emerald-50 px-5 py-3 text-center text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            去风格迁移
          </Link>
        ) : null}
      </div>

      <div className="space-y-5">
        {isAnalyzing ? (
          <LoadingState title="正在分析图片风格与 prompt 结构" description="请稍候，视觉模型正在提取画面风格、构图、色彩、光影和英文 prompt。" />
        ) : null}

        {error ? <ErrorState title="分析失败" description={error} actionLabel="重新分析" /> : null}

        {result ? (
          <AnalysisResultView result={result} />
        ) : !isAnalyzing && !error ? (
          <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950">等待 AI 分析</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              上传图片后点击“开始 AI 分析”，系统会生成真实结构化分析、英文 reverse prompt 和英文 negative prompt。
            </p>
            <p className="mt-4 rounded-md bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              该 prompt 是风格迁移参考，不保证逐像素复刻原图。
            </p>
          </section>
        ) : null}

        {isSegmenting ? (
          <LoadingState title="正在拆解 Prompt 模块，标注可替换字段" description="请稍候，文本模型正在拆解 reverse prompt 和 negative prompt。" />
        ) : null}

        {segmentError ? <ErrorState title="拆解失败" description={segmentError} actionLabel="重新拆解" /> : null}

        {segmentation ? <SegmentationView segmentation={segmentation} /> : null}
      </div>
    </div>
  );
}
