"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { promptSegmentationProgress } from "@/lib/ui/operation-progress-presets";

type LibraryDetailActionsProps = {
  analysisId: string;
  reversePrompt?: string | null;
  negativePrompt?: string | null;
};

export function LibraryDetailActions({ analysisId, reversePrompt, negativePrompt }: LibraryDetailActionsProps) {
  const router = useRouter();
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { progress, startProgress, completeProgress, failProgress, hideProgress } = useOperationProgress();

  async function segmentPrompt() {
    setIsSegmenting(true);
    setMessage(null);
    startProgress(promptSegmentationProgress);

    try {
      const response = await fetch("/api/prompts/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        const nextMessage = data.error ?? "重新拆解 Prompt 失败";
        setMessage(nextMessage);
        failProgress(nextMessage);
        return;
      }

      setMessage("Prompt 模块已重新拆解");
      completeProgress("Prompt 模块已重新拆解");
      router.refresh();
    } catch {
      const nextMessage = "重新拆解 Prompt 失败，请稍后重试";
      setMessage(nextMessage);
      failProgress(nextMessage);
    } finally {
      setIsSegmenting(false);
    }
  }

  async function deleteAnalysis() {
    const confirmed = window.confirm(
      "确定删除这条 Prompt 记录吗？该操作只删除 Prompt 记录，不删除原始图片和生成图。拆解模块、风格迁移、模板版本和标签绑定会一并删除。",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/analyses/${analysisId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "删除失败");
        return;
      }

      setMessage("已删除 Prompt 记录，原始图片和生成图已保留。");
      router.push("/library");
      router.refresh();
    } catch {
      setMessage("删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <OperationProgressModal {...progress} onClose={hideProgress} />
      <div className="flex flex-wrap gap-2">
        <Link
          href="/library"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          返回 Prompt 库
        </Link>
        <Link
          href={`/fusion?analysisId=${analysisId}`}
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          用于风格迁移
        </Link>
        <button
          type="button"
          disabled={isSegmenting}
          className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={() => void segmentPrompt()}
        >
          {isSegmenting ? "拆解中" : "重新拆解 Prompt"}
        </button>
        {reversePrompt ? <CopyButton text={reversePrompt} label="复制 Prompt" /> : null}
        {negativePrompt ? <CopyButton text={negativePrompt} label="复制 Negative Prompt" /> : null}
        <button
          type="button"
          disabled={isDeleting}
          className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={() => void deleteAnalysis()}
        >
          {isDeleting ? "删除中" : "删除记录"}
        </button>
      </div>
      {message ? <p className="text-sm text-slate-500">{message}</p> : null}
    </div>
  );
}
