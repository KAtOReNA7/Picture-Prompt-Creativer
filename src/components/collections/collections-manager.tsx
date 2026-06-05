"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type CollectionItem = {
  id: string;
  name: string;
  description: string | null;
  useCase: string | null;
  itemCount: number;
  updatedAtText: string;
};

type CollectionsManagerProps = {
  initialCollections: CollectionItem[];
};

export function CollectionsManager({ initialCollections }: CollectionsManagerProps) {
  const [collections, setCollections] = useState(initialCollections);
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [useCase, setUseCase] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return collections;
    return collections.filter((collection) =>
      [collection.name, collection.description ?? "", collection.useCase ?? ""].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [collections, q]);

  async function createCollection() {
    if (!name.trim()) {
      setError("请填写合集名称");
      return;
    }

    setIsCreating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, useCase }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        collection?: { id: string; name: string; description: string | null; useCase: string | null; itemCount: number; updatedAt: string };
      };
      if (!response.ok || !data.ok || !data.collection) throw new Error(data.error ?? "创建合集失败");
      setCollections((current) => [
        {
          id: data.collection!.id,
          name: data.collection!.name,
          description: data.collection!.description,
          useCase: data.collection!.useCase,
          itemCount: data.collection!.itemCount,
          updatedAtText: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(data.collection!.updatedAt)),
        },
        ...current,
      ]);
      setName("");
      setDescription("");
      setUseCase("");
      setMessage("合集已创建");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建合集失败");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div>
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">创建合集</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_0.8fr_auto]">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="合集名称" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="说明" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <input value={useCase} onChange={(event) => setUseCase(event.target.value)} placeholder="用途" className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <button type="button" disabled={isCreating} onClick={createCollection} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            创建合集
          </button>
        </div>
        {message ? <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <div className="mt-6 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="搜索合集名称、说明或用途" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((collection) => (
          <article key={collection.id} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{collection.name}</h2>
              <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-700">{collection.itemCount} 项</span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{collection.description ?? "暂无说明"}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-md bg-amber-50 px-3 py-1 text-amber-700">用途：{collection.useCase ?? "未填写"}</span>
              <span className="rounded-md bg-slate-100 px-3 py-1 text-slate-600">更新：{collection.updatedAtText}</span>
            </div>
            <Link href={`/collections/${collection.id}`} className="mt-4 inline-flex rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700">
              进入合集
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
