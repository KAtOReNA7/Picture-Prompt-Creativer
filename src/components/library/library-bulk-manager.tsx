"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type TagItem = {
  id: string;
  name: string;
  color: string | null;
  category?: string | null;
};

type CollectionItem = {
  id: string;
  name: string;
};

type AnalysisCard = {
  id: string;
  title: string | null;
  createdAtText: string;
  previewUrl: string | null;
  segmentsCount: number;
  fusionsCount: number;
  variantsCount: number;
  generatedCount: number;
  importedPromptLanguage?: string | null;
  importMode?: string | null;
  tags: TagItem[];
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  from: number;
  to: number;
};

type LibraryBulkManagerProps = {
  analyses: AnalysisCard[];
  collections: CollectionItem[];
  pagination: Pagination;
  params: Record<string, string | undefined>;
};

function languageLabel(language?: string | null): string | null {
  if (language === "zh") return "中文";
  if (language === "en") return "英文";
  if (language === "mixed") return "中英混合";
  return null;
}

function makePageHref(params: Record<string, string | undefined>, page: number, pageSize: number): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") next.set(key, value);
  }
  next.set("page", String(page));
  next.set("pageSize", String(pageSize));
  return `/library?${next.toString()}`;
}

export function LibraryBulkManager({ analyses, collections, pagination, params }: LibraryBulkManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState(analyses);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState("");
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [exportFormat, setExportFormat] = useState<"json" | "markdown">("json");
  const [message, setMessage] = useState<string | null>("已切换筛选或分页，当前选择已清空。");
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const selectedCount = selectedIds.length;
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : items.map((analysis) => analysis.id));
  }

  function afterDelete(deletedIds: string[]) {
    const deletedSet = new Set(deletedIds);
    const nextItems = items.filter((item) => !deletedSet.has(item.id));
    setItems(nextItems);
    setSelectedIds([]);
    setSingleDeleteId(null);
    setIsDeleteConfirmOpen(false);
    if (nextItems.length === 0 && pagination.page > 1) {
      router.push(makePageHref(params, pagination.page - 1, pagination.pageSize));
      return;
    }
    router.refresh();
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
        body: JSON.stringify({ items: selectedIds.map((id) => ({ itemType: "analysis", itemId: id })) }),
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

  async function deleteSelected(ids: string[]) {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/analyses/batch-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        deletedCount?: number;
        deletedIds?: string[];
        skippedGeneratedImagesCount?: number;
        message?: string;
      };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "删除失败");
      setMessage(`${data.message ?? `已删除 ${data.deletedCount ?? 0} 条 Prompt 记录，原始图片和生成图已保留。`} 生成图保留 ${data.skippedGeneratedImagesCount ?? 0} 张。`);
      afterDelete(data.deletedIds ?? ids);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "删除失败");
    } finally {
      setIsWorking(false);
    }
  }

  const pendingDeleteCount = singleDeleteId ? 1 : selectedCount;

  return (
    <div>
      {isDeleteConfirmOpen || singleDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-lg rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-950">{singleDeleteId ? "确认删除？" : "确认批量删除？"}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              将删除{singleDeleteId ? "该" : `选中的 ${pendingDeleteCount} 条`} Prompt 记录及其拆解、风格迁移、模板版本和标签绑定。原始图片和生成图不会删除。
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isWorking}
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setSingleDeleteId(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void deleteSelected(singleDeleteId ? [singleDeleteId] : selectedIds)}
                className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-60"
              >
                {isWorking ? "删除中" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            全选当前页
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-slate-500">已选择 {selectedCount} 条</span>
            <button
              type="button"
              disabled={isWorking || selectedCount === 0}
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              批量删除
            </button>
          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_0.9fr_0.8fr_auto_auto_auto]">
            <input
              className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              placeholder="批量添加标签，用逗号分隔"
              value={tagNames}
              onChange={(event) => setTagNames(event.target.value)}
            />
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>
              <option value="">选择合集</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
            <select className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" value={exportFormat} onChange={(event) => setExportFormat(event.target.value as "json" | "markdown")}>
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

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((analysis) => {
          const visibleTags = analysis.tags.slice(0, 4);
          const hiddenTagCount = Math.max(0, analysis.tags.length - visibleTags.length);
          const importedLabel = languageLabel(analysis.importedPromptLanguage);

          return (
            <article key={analysis.id} className={selectedSet.has(analysis.id) ? "rounded-md border border-cyan-300 bg-cyan-50 p-3 shadow-sm" : "rounded-md border border-slate-200 bg-white p-3 shadow-sm"}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1" checked={selectedSet.has(analysis.id)} onChange={() => toggle(analysis.id)} aria-label="选择该 Prompt" />
                {analysis.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={analysis.previewUrl} alt={analysis.title ?? "Prompt 参考图"} className="h-24 w-24 shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-500">无参考图</div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">{analysis.title ?? "未命名 Prompt 模板"}</h2>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {visibleTags.length > 0 ? (
                      visibleTags.map((tag) => (
                        <span key={tag.id} className="max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-700" style={{ backgroundColor: tag.color ?? "#e0f2fe" }}>
                          {tag.category ? `${tag.category}/` : ""}
                          {tag.name}
                        </span>
                      ))
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">暂无标签</span>
                    )}
                    {hiddenTagCount > 0 ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">+{hiddenTagCount}</span> : null}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px] font-medium">
                <span className="rounded bg-emerald-50 px-1.5 py-1 text-emerald-700">模块 {analysis.segmentsCount}</span>
                <span className="rounded bg-cyan-50 px-1.5 py-1 text-cyan-700">迁移 {analysis.fusionsCount}</span>
                <span className="rounded bg-amber-50 px-1.5 py-1 text-amber-700">版本 {analysis.variantsCount}</span>
                <span className="rounded bg-violet-50 px-1.5 py-1 text-violet-700">生成 {analysis.generatedCount}</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{analysis.createdAtText}</span>
                {importedLabel ? <span className="rounded bg-slate-100 px-2 py-1">{importedLabel}</span> : null}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/library/${analysis.id}`} className="flex-1 rounded-md bg-cyan-600 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-cyan-700">
                  查看详情
                </Link>
                <button
                  type="button"
                  disabled={isWorking}
                  onClick={() => setSingleDeleteId(analysis.id)}
                  className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  删除
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
