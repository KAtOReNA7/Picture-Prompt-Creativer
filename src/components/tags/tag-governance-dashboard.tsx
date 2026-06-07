"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const categories = ["风格", "题材", "场景", "色彩", "光影", "构图", "情绪", "用途", "平台", "质量", "其他"];

type TagStatsItem = {
  id: string;
  name: string;
  category: string | null;
  level: number;
  parentId: string | null;
  normalizedName: string | null;
  aliases: string[];
  analysisCount: number;
  isArchived: boolean;
  mergedIntoId: string | null;
  createdAt: string;
};

type StatsPayload = {
  ok: boolean;
  error?: string;
  summary?: {
    totalTags: number;
    activeTags: number;
    archivedTags: number;
    uncategorizedTags: number;
  };
  categories?: { category: string; count: number }[];
  tags?: TagStatsItem[];
};

type GovernanceSuggestions = {
  mergeGroups: {
    targetName: string;
    category: string | null;
    level: number;
    sourceTagIds: string[];
    sourceNames: string[];
    reason: string;
    confidence: number;
    caution: boolean;
  }[];
  classifications: {
    tagId: string;
    name: string;
    suggestedCategory: string | null;
    suggestedLevel: number;
    reason: string;
  }[];
  hierarchy: {
    parentName: string;
    children: string[];
    reason?: string;
  }[];
};

function categoryLabel(value: string | null): string {
  return value ?? "未分类";
}

function groupTags(tags: TagStatsItem[]) {
  return tags.reduce<Record<string, TagStatsItem[]>>((groups, tag) => {
    const key = categoryLabel(tag.category);
    groups[key] = groups[key] ?? [];
    groups[key].push(tag);
    return groups;
  }, {});
}

export function TagGovernanceDashboard() {
  const [tags, setTags] = useState<TagStatsItem[]>([]);
  const [summary, setSummary] = useState<StatsPayload["summary"] | null>(null);
  const [categoryStats, setCategoryStats] = useState<StatsPayload["categories"]>([]);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [suggestions, setSuggestions] = useState<GovernanceSuggestions | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const grouped = useMemo(() => groupTags(tags), [tags]);

  async function loadStats() {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (level) params.set("level", level);
    if (includeArchived) params.set("includeArchived", "true");

    try {
      const response = await fetch(`/api/tags/stats?${params.toString()}`);
      const data = (await response.json()) as StatsPayload;
      if (!response.ok || !data.ok || !data.tags || !data.summary) throw new Error(data.error ?? "读取标签统计失败");
      setTags(data.tags);
      setSummary(data.summary);
      setCategoryStats(data.categories ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "读取标签统计失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    fetch("/api/tags/stats")
      .then((response) => response.json() as Promise<StatsPayload>)
      .then((data) => {
        if (cancelled) return;
        if (!data.ok || !data.tags || !data.summary) throw new Error(data.error ?? "读取标签统计失败");
        setTags(data.tags);
        setSummary(data.summary);
        setCategoryStats(data.categories ?? []);
      })
      .catch((requestError: unknown) => {
        if (!cancelled) setError(requestError instanceof Error ? requestError.message : "读取标签统计失败");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function suggestGovernance() {
    setIsSuggesting(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tags/suggest-governance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "merge_and_classify" }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; suggestions?: GovernanceSuggestions };
      if (!response.ok || !data.ok || !data.suggestions) throw new Error(data.error ?? "AI 标签治理建议失败");
      setSuggestions(data.suggestions);
      setMessage("AI 已返回治理建议。所有建议都需要人工确认，不会自动修改标签。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 标签治理建议失败");
    } finally {
      setIsSuggesting(false);
    }
  }

  async function mergeGroup(group: GovernanceSuggestions["mergeGroups"][number]) {
    setWorkingId(group.sourceTagIds.join("-"));
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/tags/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetName: group.targetName,
          sourceTagIds: group.sourceTagIds,
          category: group.category,
          level: group.level,
        }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; movedRelationsCount?: number; archivedTagsCount?: number };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "合并标签失败");
      setMessage(`合并完成：迁移 ${data.movedRelationsCount ?? 0} 条关联，归档 ${data.archivedTagsCount ?? 0} 个源标签。`);
      await loadStats();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "合并标签失败");
    } finally {
      setWorkingId(null);
    }
  }

  async function applyClassification(item: GovernanceSuggestions["classifications"][number]) {
    setWorkingId(item.tagId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tags/${item.tagId}/governance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: item.suggestedCategory, level: item.suggestedLevel }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "应用分类建议失败");
      setMessage("分类和等级建议已应用。");
      await loadStats();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "应用分类建议失败");
    } finally {
      setWorkingId(null);
    }
  }

  async function updateGovernance(tag: TagStatsItem, data: { category?: string | null; level?: number; isArchived?: boolean }) {
    setWorkingId(tag.id);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/tags/${tag.id}/governance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "更新标签失败");
      setMessage("标签治理信息已更新。");
      await loadStats();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "更新标签失败");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">全部标签</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{summary?.totalTags ?? 0}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">活跃标签</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">{summary?.activeTags ?? 0}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">已归档</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{summary?.archivedTags ?? 0}</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">未分类</p>
          <p className="mt-2 text-2xl font-semibold text-rose-700">{summary?.uncategorizedTags ?? 0}</p>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.6fr_auto_auto]">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="搜索标签名称"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部分类</option>
            <option value="未分类">未分类</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={level} onChange={(event) => setLevel(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
            <option value="">全部等级</option>
            <option value="1">等级 1</option>
            <option value="2">等级 2</option>
            <option value="3">等级 3</option>
          </select>
          <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} />
            显示已归档
          </label>
          <button type="button" onClick={loadStats} disabled={isLoading} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            筛选
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {categoryStats?.map((item) => (
            <span key={item.category} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">
              {item.category}：{item.count}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-950">AI 标签治理建议</h2>
            <p className="mt-2 text-sm leading-6 text-amber-800">AI 只给出建议，不会自动合并或修改标签。合并必须由你逐条确认。</p>
          </div>
          <button type="button" onClick={suggestGovernance} disabled={isSuggesting} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {isSuggesting ? "正在分析标签" : "AI 标签治理"}
          </button>
        </div>

        {suggestions ? (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-md bg-white p-4">
              <h3 className="font-semibold text-slate-950">合并建议</h3>
              <div className="mt-3 space-y-3">
                {suggestions.mergeGroups.length > 0 ? (
                  suggestions.mergeGroups.map((group) => (
                    <div key={`${group.targetName}-${group.sourceTagIds.join("-")}`} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{group.targetName}</span>
                        <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs text-cyan-700">{categoryLabel(group.category)} / 等级 {group.level}</span>
                        <span className={group.caution ? "rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800" : "rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700"}>
                          置信度 {(group.confidence * 100).toFixed(0)}%{group.caution ? "，需谨慎" : ""}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{group.reason}</p>
                      <p className="mt-2 text-xs text-slate-500">来源：{group.sourceNames.join("、") || group.sourceTagIds.join("、")}</p>
                      <button
                        type="button"
                        onClick={() => mergeGroup(group)}
                        disabled={Boolean(workingId)}
                        className="mt-3 rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        人工确认合并
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">暂无合并建议</p>
                )}
              </div>
            </div>

            <div className="rounded-md bg-white p-4">
              <h3 className="font-semibold text-slate-950">分类与层级建议</h3>
              <div className="mt-3 space-y-3">
                {suggestions.classifications.length > 0 ? (
                  suggestions.classifications.map((item) => (
                    <div key={item.tagId} className="rounded-md border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{item.name}</span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {categoryLabel(item.suggestedCategory)} / 等级 {item.suggestedLevel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
                      <button
                        type="button"
                        onClick={() => applyClassification(item)}
                        disabled={Boolean(workingId)}
                        className="mt-3 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                      >
                        应用分类
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">暂无分类建议</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {suggestions?.hierarchy.length ? (
          <div className="mt-4 rounded-md bg-white p-4">
            <h3 className="font-semibold text-slate-950">父子层级建议</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {suggestions.hierarchy.map((item) => (
                <div key={`${item.parentName}-${item.children.join("-")}`} className="rounded-md border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{item.parentName}</p>
                  <p className="mt-2 text-slate-600">子标签：{item.children.join("、")}</p>
                  {item.reason ? <p className="mt-2 text-slate-500">{item.reason}</p> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">标签列表</h2>
        <div className="mt-4 space-y-6">
          {Object.entries(grouped).map(([groupName, groupTags]) => (
            <div key={groupName}>
              <h3 className="text-sm font-semibold text-cyan-700">{groupName}</h3>
              <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-[900px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2">标签名</th>
                      <th className="px-3 py-2">分类</th>
                      <th className="px-3 py-2">等级</th>
                      <th className="px-3 py-2">使用次数</th>
                      <th className="px-3 py-2">别名数</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupTags.map((tag) => (
                      <tr key={tag.id}>
                        <td className="px-3 py-3">
                          <p className="font-medium text-slate-950">{tag.name}</p>
                          {tag.normalizedName ? <p className="mt-1 text-xs text-slate-500">规范名：{tag.normalizedName}</p> : null}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={tag.category ?? ""}
                            disabled={workingId === tag.id}
                            onChange={(event) => updateGovernance(tag, { category: event.target.value || null })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="">未分类</option>
                            {categories.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            value={tag.level}
                            disabled={workingId === tag.id}
                            onChange={(event) => updateGovernance(tag, { level: Number(event.target.value) })}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                          </select>
                        </td>
                        <td className="px-3 py-3 text-slate-700">{tag.analysisCount}</td>
                        <td className="px-3 py-3 text-slate-700">{tag.aliases.length}</td>
                        <td className="px-3 py-3">
                          <span className={tag.isArchived ? "rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" : "rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700"}>
                            {tag.isArchived ? "已归档" : "正常"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Link href={`/library?tagId=${tag.id}`} className="rounded-md border border-cyan-200 px-2 py-1 text-xs font-medium text-cyan-700">
                              查看图片
                            </Link>
                            <button
                              type="button"
                              disabled={workingId === tag.id}
                              onClick={() => updateGovernance(tag, { isArchived: !tag.isArchived })}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-60"
                            >
                              {tag.isArchived ? "取消归档" : "归档标签"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>

      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
