"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";

type CollectionDetail = {
  id: string;
  name: string;
  description: string | null;
  useCase: string | null;
};

type CollectionDetailItem = {
  id: string;
  itemType: string;
  itemId: string;
  note: string | null;
  title: string;
  description: string;
  imagePreviewUrl: string | null;
  href: string;
  badges: string[];
};

type CollectionDetailManagerProps = {
  initialCollection: CollectionDetail;
  initialItems: CollectionDetailItem[];
};

function typeLabel(type: string): string {
  if (type === "analysis") return "Prompt 分析";
  if (type === "prompt_variant") return "模板版本";
  if (type === "generated_image") return "生成图";
  return type;
}

export function CollectionDetailManager({ initialCollection, initialItems }: CollectionDetailManagerProps) {
  const [collection, setCollection] = useState(initialCollection);
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  const filteredItems = useMemo(() => (filter === "all" ? items : items.filter((item) => item.itemType === filter)), [filter, items]);

  async function saveCollection() {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(collection),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "保存合集失败");
      setMessage("合集信息已保存");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "保存合集失败");
    } finally {
      setIsWorking(false);
    }
  }

  async function removeItem(itemId: string) {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/collections/${collection.id}/items/${itemId}`, { method: "DELETE" });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "移除素材失败");
      setItems((current) => current.filter((item) => item.id !== itemId));
      setMessage("已从合集中移除素材");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "移除素材失败");
    } finally {
      setIsWorking(false);
    }
  }

  async function exportCollection(format: "json" | "markdown") {
    setIsWorking(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "collection", collectionId: collection.id, format }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; export?: { filename: string; downloadUrl: string } };
      if (!response.ok || !data.ok || !data.export) throw new Error(data.error ?? "导出合集失败");
      setDownloadUrl(data.export.downloadUrl);
      setMessage(`导出文件已生成：${data.export.filename}`);
      window.open(data.export.downloadUrl, "_blank");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "导出合集失败");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr_auto]">
          <input value={collection.name} onChange={(event) => setCollection({ ...collection, name: event.target.value })} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <input value={collection.description ?? ""} onChange={(event) => setCollection({ ...collection, description: event.target.value })} placeholder="说明" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <input value={collection.useCase ?? ""} onChange={(event) => setCollection({ ...collection, useCase: event.target.value })} placeholder="用途" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <button type="button" disabled={isWorking} onClick={saveCollection} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            保存合集
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={isWorking} onClick={() => exportCollection("json")} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            导出 JSON
          </button>
          <button type="button" disabled={isWorking} onClick={() => exportCollection("markdown")} className="rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
            导出 Markdown
          </button>
        </div>
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        {downloadUrl ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-cyan-50 p-3 text-sm text-cyan-800">
            <span className="break-all">下载地址：{downloadUrl}</span>
            <CopyButton text={downloadUrl} label="复制下载地址" />
          </div>
        ) : null}
        {error ? <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["all", "全部"],
          ["analysis", "Prompt 分析"],
          ["prompt_variant", "模板版本"],
          ["generated_image", "生成图"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={filter === value ? "rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white" : "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        {filteredItems.length > 0 ? filteredItems.map((item) => (
          <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
            {item.imagePreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imagePreviewUrl} alt={item.title} className="h-44 w-full rounded-md object-cover" />
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">{typeLabel(item.itemType)}</div>
            )}
            <div className="mt-4 flex items-start justify-between gap-3">
              <h2 className="line-clamp-2 text-base font-semibold text-slate-950">{item.title}</h2>
              <span className="shrink-0 rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">{typeLabel(item.itemType)}</span>
            </div>
            <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{item.description}</p>
            {item.note ? <p className="mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">备注：{item.note}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {item.badges.map((badge) => (
                <span key={badge} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {badge}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={item.href} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
                查看原始详情
              </Link>
              <button type="button" disabled={isWorking} onClick={() => removeItem(item.id)} className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700 disabled:opacity-60">
                移除
              </button>
            </div>
          </article>
        )) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center lg:col-span-3">
            <p className="text-sm text-slate-500">当前合集还没有素材。可以回到 Prompt 库选择记录后加入合集。</p>
            <Link href="/library" className="mt-4 inline-flex rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white">
              去 Prompt 库选择素材
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
