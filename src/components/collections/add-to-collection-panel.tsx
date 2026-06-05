"use client";

import { useState } from "react";

type CollectionOption = {
  id: string;
  name: string;
};

type AddToCollectionPanelProps = {
  itemType: "analysis" | "prompt_variant" | "generated_image";
  itemId: string;
  collections: CollectionOption[];
  compact?: boolean;
};

export function AddToCollectionPanel({ itemType, itemId, collections, compact }: AddToCollectionPanelProps) {
  const [collectionId, setCollectionId] = useState(collections[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function addToCollection() {
    if (!collectionId) {
      setError("请先创建或选择合集");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/collections/${collectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ itemType, itemId, note }] }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; skippedCount?: number };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "加入合集失败");
      setMessage(data.skippedCount ? "该素材已在合集中，已跳过重复添加。" : "已加入合集");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "加入合集失败");
    } finally {
      setIsLoading(false);
    }
  }

  if (collections.length === 0) {
    return compact ? null : (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-500">
        暂无合集，请先到“合集”页面创建。
      </div>
    );
  }

  return (
    <div className={compact ? "mt-3" : "rounded-md border border-slate-200 bg-white p-4"}>
      {!compact ? <h3 className="text-sm font-semibold text-slate-900">加入合集</h3> : null}
      <div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="备注，可选" className="rounded-md border border-slate-300 px-2 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
        <button type="button" disabled={isLoading} onClick={addToCollection} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
          加入合集
        </button>
      </div>
      {message ? <p className="mt-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
