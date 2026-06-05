"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LibraryCardActions } from "@/components/library/library-card-actions";

type TagItem = {
  id: string;
  name: string;
  color: string | null;
};

type CollectionItem = {
  id: string;
  name: string;
};

type AnalysisCard = {
  id: string;
  title: string | null;
  styleSummary: string | null;
  visualSubject: string | null;
  topicPotential: string | null;
  createdAtText: string;
  previewUrl: string | null;
  segmentsCount: number;
  fusionsCount: number;
  variantsCount: number;
  generatedCount: number;
  tags: TagItem[];
};

type LibraryBulkManagerProps = {
  analyses: AnalysisCard[];
  collections: CollectionItem[];
};

export function LibraryBulkManager({ analyses, collections }: LibraryBulkManagerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [exportFormat, setExportFormat] = useState<"json" | "markdown">("json");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const selectedCount = selectedIds.length;
  const allSelected = analyses.length > 0 && selectedIds.length === analyses.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : analyses.map((analysis) => analysis.id));
  }

  async function bulkAddTags() {
    const names = tagNames
      .split(/[,\n，、]/)
      .map((name) => name.trim())
      .filter(Boolean);

    if (selectedCount === 0 || names.length === 0) {
      setError("请选择记录并填写标签名称");
      return;
    }

    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      for (const id of selectedIds) {
        const response = await fetch(`/api/analyses/${id}/tags/quick-add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagNames: names }),
        });
        const data = (await response.json()) as { ok: boolean; error?: string };
        if (!response.ok || !data.ok) throw new Error(data.error ?? "批量添加标签失败");
      }
      setMessage("批量添加标签成功，刷新页面后可查看最新标签。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量添加标签失败");
    } finally {
      setIsWorking(false);
    }
  }

  async function bulkAddCollection() {
    if (selectedCount === 0 || !collectionId) {
      setError("请选择记录和合集");
      return;
    }

    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selectedIds.map((id) => ({ itemType: "analysis", itemId: id })),
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; skippedCount?: number };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "批量加入合集失败");
      setMessage(`已加入合集，跳过重复项 ${data.skippedCount ?? 0} 条。`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量加入合集失败");
    } finally {
      setIsWorking(false);
    }
  }

  async function bulkExport() {
    if (selectedCount === 0) {
      setError("请选择要导出的 Prompt 记录");
      return;
    }

    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "analyses", ids: selectedIds, format: exportFormat }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; export?: { downloadUrl: string; filename: string } };
      if (!response.ok || !data.ok || !data.export) throw new Error(data.error ?? "批量导出失败");
      setMessage(`导出文件已生成：${data.export.filename}`);
      window.open(data.export.downloadUrl, "_blank");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量导出失败");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div>
      <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            全选当前列表
          </label>
          <span className="text-sm text-slate-500">已选择 {selectedCount} 条</span>
        </div>

        {selectedCount > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.8fr_auto_auto_auto]">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              placeholder="批量添加标签，用逗号分隔"
              value={tagNames}
              onChange={(event) => setTagNames(event.target.value)}
            />
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              value={collectionId}
              onChange={(event) => setCollectionId(event.target.value)}
            >
              <option value="">选择合集</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              value={exportFormat}
              onChange={(event) => setExportFormat(event.target.value as "json" | "markdown")}
            >
              <option value="json">导出 JSON</option>
              <option value="markdown">导出 Markdown</option>
            </select>
            <button type="button" disabled={isWorking} onClick={bulkAddTags} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
              批量添加标签
            </button>
            <button type="button" disabled={isWorking} onClick={bulkAddCollection} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
              批量加入合集
            </button>
            <button type="button" disabled={isWorking} onClick={bulkExport} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
              批量导出
            </button>
          </div>
        ) : null}

        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {analyses.map((analysis) => (
          <article key={analysis.id} className={selectedSet.has(analysis.id) ? "rounded-md border border-cyan-300 bg-cyan-50 p-4 shadow-sm" : "rounded-md border border-slate-200 bg-white p-4 shadow-sm"}>
            <label className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={selectedSet.has(analysis.id)} onChange={() => toggle(analysis.id)} />
              选择
            </label>

            {analysis.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={analysis.previewUrl} alt={analysis.title ?? "Prompt 参考图"} className="h-44 w-full rounded-md object-cover" />
            ) : (
              <div className="flex h-44 w-full items-center justify-center rounded-md bg-slate-100 text-sm font-medium text-slate-500">无参考图</div>
            )}

            <div className="mt-4">
              <h2 className="line-clamp-1 text-lg font-semibold text-slate-950">{analysis.title ?? "未命名 Prompt 模板"}</h2>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                {analysis.styleSummary ?? analysis.topicPotential ?? analysis.visualSubject ?? "暂无摘要"}
              </p>
            </div>

            <dl className="mt-4 grid gap-2 text-sm">
              <div className="rounded-md bg-white/70 p-3">
                <dt className="font-semibold text-slate-900">画面主体</dt>
                <dd className="mt-1 line-clamp-2 text-slate-600">{analysis.visualSubject ?? "未填写"}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.tags.length > 0 ? (
                analysis.tags.map((tag) => (
                  <span key={tag.id} className="rounded-md px-2 py-1 text-xs font-medium text-slate-700" style={{ backgroundColor: tag.color ?? "#e0f2fe" }}>
                    {tag.name}
                  </span>
                ))
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">暂无标签</span>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className={analysis.segmentsCount > 0 ? "rounded-md bg-emerald-50 px-3 py-1 text-emerald-700" : "rounded-md bg-slate-100 px-3 py-1 text-slate-600"}>Prompt 模块：{analysis.segmentsCount}</span>
              <span className="rounded-md bg-cyan-50 px-3 py-1 text-cyan-700">风格迁移：{analysis.fusionsCount}</span>
              <span className="rounded-md bg-amber-50 px-3 py-1 text-amber-700">模板版本：{analysis.variantsCount}</span>
              <span className="rounded-md bg-violet-50 px-3 py-1 text-violet-700">生成图：{analysis.generatedCount}</span>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-600">{analysis.createdAtText}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/library/${analysis.id}#tags`} className="rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50">
                编辑标签
              </Link>
              <Link href={`/library/${analysis.id}#tags`} className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50">
                AI 推荐标签
              </Link>
            </div>

            <div className="mt-4">
              <LibraryCardActions analysisId={analysis.id} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
