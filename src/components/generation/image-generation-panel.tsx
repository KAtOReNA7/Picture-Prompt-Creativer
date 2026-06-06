"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { imageGenerationProgress } from "@/lib/ui/operation-progress-presets";

type SourceType = "analysis_reverse_prompt" | "fusion_prompt" | "custom_prompt";

type GeneratedImage = {
  id: string;
  prompt: string;
  negativePrompt: string | null;
  sourceType: string;
  sourceId: string | null;
  originAnalysisId: string | null;
  model: string;
  size: string;
  quality: string | null;
  format: string | null;
  fileUrl: string;
  createdAt: string;
};

type GenerateResponse =
  | {
      ok: true;
      image: GeneratedImage;
    }
  | {
      ok: false;
      error: string;
    };

type ImageGenerationPanelProps = {
  prompt: string;
  negativePrompt?: string | null;
  sourceType: SourceType;
  sourceId?: string | null;
  originAnalysisId?: string | null;
  title?: string;
  buttonLabel?: string;
  compact?: boolean;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ImageGenerationPanel({
  prompt,
  negativePrompt,
  sourceType,
  sourceId,
  originAnalysisId,
  title = "生成测试图",
  buttonLabel = "生成测试图",
  compact = false,
}: ImageGenerationPanelProps) {
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("medium");
  const [format, setFormat] = useState("png");
  const [image, setImage] = useState<GeneratedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { progress, startProgress, completeProgress, failProgress, hideProgress } = useOperationProgress();

  async function generate() {
    setIsGenerating(true);
    setError(null);
    setImage(null);
    startProgress(imageGenerationProgress);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          negativePrompt,
          sourceType,
          sourceId,
          originAnalysisId,
          size,
          quality,
          format,
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.ok) {
        const message = data.ok ? "图片生成失败" : data.error;
        setError(message);
        failProgress(message);
        return;
      }

      setImage(data.image);
      completeProgress("测试图已生成");
    } catch {
      const message = "图片生成失败，请检查网络或稍后重试";
      setError(message);
      failProgress(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className={compact ? "space-y-3" : "rounded-md border border-slate-200 bg-white p-4"}>
      <OperationProgressModal {...progress} onClose={hideProgress} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <button
          type="button"
          disabled={isGenerating || !prompt.trim()}
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => void generate()}
        >
          {isGenerating ? "生成中" : buttonLabel}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium text-slate-700">
          尺寸
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={size}
            onChange={(event) => setSize(event.target.value)}
          >
            <option value="1024x1024">1024x1024</option>
            <option value="1024x1536">1024x1536</option>
            <option value="1536x1024">1536x1024</option>
            <option value="auto">auto</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          质量
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={quality}
            onChange={(event) => setQuality(event.target.value)}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="auto">auto</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          格式
          <select
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            <option value="png">png</option>
            <option value="jpeg">jpeg</option>
            <option value="webp">webp</option>
          </select>
        </label>
      </div>

      {isGenerating ? (
        <div className="mt-4">
          <LoadingState title="正在调用 image2 生成测试图，可能需要稍等" description="系统正在请求图片模型并保存生成结果。" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-4">
          <ErrorState title="生成失败" description={error} />
        </div>
      ) : null}

      {image ? (
        <div className="mt-4 rounded-md border border-cyan-200 bg-cyan-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.fileUrl} alt="生成测试图" className="max-h-[520px] w-full rounded-md object-contain" />
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="font-semibold text-slate-900">模型</dt>
              <dd className="mt-1 break-all text-slate-600">{image.model}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">尺寸</dt>
              <dd className="mt-1 text-slate-600">{image.size}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">质量</dt>
              <dd className="mt-1 text-slate-600">{image.quality ?? "未记录"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-900">格式</dt>
              <dd className="mt-1 text-slate-600">{image.format ?? "未记录"}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="font-semibold text-slate-900">所属分析</dt>
              <dd className="mt-1 break-all text-slate-600">{image.originAnalysisId ?? "未归属"}</dd>
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <dt className="font-semibold text-slate-900">创建时间</dt>
              <dd className="mt-1 text-slate-600">{formatDate(image.createdAt)}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/generated-images/${image.id}`}
              className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              查看生成图详情
            </Link>
            <Link
              href={`/generated-images/${image.id}`}
              className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
            >
              评估生成效果
            </Link>
            <a
              href={image.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
            >
              打开图片
            </a>
            <CopyButton text={`${window.location.origin}${image.fileUrl}`} label="复制图片地址" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
