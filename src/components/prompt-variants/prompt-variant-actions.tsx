"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { imageGenerationProgress, promptVariantPolishProgress } from "@/lib/ui/operation-progress-presets";

type VariantLike = {
  id: string;
  composedPrompt: string;
  negativePrompt: string | null;
};

type VariantResponse =
  | {
      ok: true;
      variant: VariantLike & {
        title: string;
      };
      changeSummary?: string;
    }
  | {
      ok: false;
      error: string;
    };

type GenerateResponse =
  | {
      ok: true;
      image: {
        id: string;
        fileUrl: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export function PromptVariantActions({ variant }: { variant: VariantLike }) {
  const [message, setMessage] = useState<string | null>(null);
  const [polishedVariant, setPolishedVariant] = useState<VariantLike | null>(null);
  const [generatedImageId, setGeneratedImageId] = useState<string | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { progress, startProgress, completeProgress, failProgress, hideProgress } = useOperationProgress();

  const activeVariant = polishedVariant ?? variant;

  async function polish() {
    setIsPolishing(true);
    setMessage(null);
    startProgress(promptVariantPolishProgress);

    try {
      const response = await fetch(`/api/prompt-variants/${activeVariant.id}/polish`, {
        method: "POST",
      });
      const data = (await response.json()) as VariantResponse;

      if (!response.ok || !data.ok) {
        const nextMessage = data.ok ? "AI 润色失败" : data.error;
        setMessage(nextMessage);
        failProgress(nextMessage);
        return;
      }

      setPolishedVariant(data.variant);
      setMessage(data.changeSummary ?? "AI 润色完成");
      completeProgress("AI 润色已完成");
    } catch {
      const nextMessage = "AI 润色失败，请稍后重试";
      setMessage(nextMessage);
      failProgress(nextMessage);
    } finally {
      setIsPolishing(false);
    }
  }

  async function generate() {
    setIsGenerating(true);
    setMessage(null);
    setGeneratedImageId(null);
    startProgress(imageGenerationProgress);

    try {
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: activeVariant.composedPrompt,
          negativePrompt: activeVariant.negativePrompt,
          sourceType: "custom_prompt",
          sourceId: activeVariant.id,
          size: "1024x1024",
          quality: "low",
          format: "png",
        }),
      });
      const data = (await response.json()) as GenerateResponse;

      if (!response.ok || !data.ok) {
        const nextMessage = data.ok ? "生成测试图失败" : data.error;
        setMessage(nextMessage);
        failProgress(nextMessage);
        return;
      }

      setGeneratedImageId(data.image.id);
      setMessage("生成测试图成功");
      completeProgress("测试图已生成");
    } catch {
      const nextMessage = "生成测试图失败，请稍后重试";
      setMessage(nextMessage);
      failProgress(nextMessage);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-3">
      <OperationProgressModal {...progress} onClose={hideProgress} />
      <div className="flex flex-wrap gap-2">
        <CopyButton text={activeVariant.composedPrompt} label="复制 Prompt" />
        <button
          type="button"
          disabled={isPolishing}
          className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={() => void polish()}
        >
          {isPolishing ? "润色中" : "AI 润色"}
        </button>
        <button
          type="button"
          disabled={isGenerating}
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => void generate()}
        >
          {isGenerating ? "生成中" : "生成测试图"}
        </button>
        <Link
          href={`/prompt-variants/${activeVariant.id}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          查看变体详情
        </Link>
      </div>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      {polishedVariant ? (
        <div className="rounded-md border border-cyan-200 bg-cyan-50 p-3">
          <p className="text-sm font-semibold text-cyan-950">AI 润色版 Prompt</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{polishedVariant.composedPrompt}</p>
        </div>
      ) : null}
      {generatedImageId ? (
        <Link
          href={`/generated-images/${generatedImageId}`}
          className="inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          查看生成图详情
        </Link>
      ) : null}
    </div>
  );
}
