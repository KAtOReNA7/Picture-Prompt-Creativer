"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LibraryCardActionsProps = {
  analysisId: string;
};

export function LibraryCardActions({ analysisId }: LibraryCardActionsProps) {
  const router = useRouter();
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function segmentPrompt() {
    setIsSegmenting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/prompts/segment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "Prompt 重新拆解失败");
        return;
      }

      setMessage("Prompt 模块已重新拆解");
      router.refresh();
    } catch {
      setMessage("Prompt 重新拆解失败，请稍后重试");
    } finally {
      setIsSegmenting(false);
    }
  }

  async function deleteAnalysis() {
    const confirmed = window.confirm("确定删除这条 Prompt 分析记录吗？拆解模块和风格迁移历史会一并删除，参考图片文件会保留。");
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

      router.refresh();
    } catch {
      setMessage("删除失败，请稍后重试");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/library/${analysisId}`}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          查看详情
        </Link>
        <Link
          href={`/fusion?analysisId=${analysisId}`}
          className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
        >
          用于风格迁移
        </Link>
        <button
          type="button"
          disabled={isSegmenting}
          className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          onClick={() => void segmentPrompt()}
        >
          {isSegmenting ? "拆解中" : "重新拆解"}
        </button>
        <button
          type="button"
          disabled={isDeleting}
          className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-400"
          onClick={() => void deleteAnalysis()}
        >
          {isDeleting ? "删除中" : "删除"}
        </button>
      </div>
      {message ? <p className="text-xs text-slate-500">{message}</p> : null}
    </div>
  );
}
