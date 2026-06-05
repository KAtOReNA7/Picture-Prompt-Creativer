"use client";

import { useState } from "react";

type TagItem = {
  id: string;
  name: string;
  color: string | null;
  description?: string | null;
};

type SuggestedTag = {
  name: string;
  reason: string;
  category: string;
};

type AnalysisTagManagerProps = {
  analysisId: string;
  initialTags: TagItem[];
  allTags: TagItem[];
};

export function AnalysisTagManager({ analysisId, initialTags, allTags }: AnalysisTagManagerProps) {
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [selectedTagId, setSelectedTagId] = useState(allTags[0]?.id ?? "");
  const [quickNames, setQuickNames] = useState("");
  const [suggestions, setSuggestions] = useState<SuggestedTag[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function updateTagIds(tagIds: string[]) {
    const response = await fetch(`/api/analyses/${analysisId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds }),
    });
    const data = (await response.json()) as { ok: boolean; error?: string; tags?: TagItem[] };
    if (!response.ok || !data.ok || !data.tags) throw new Error(data.error ?? "更新标签失败");
    setTags(data.tags);
  }

  async function addExisting() {
    if (!selectedTagId) return;
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await updateTagIds([...new Set([...tags.map((tag) => tag.id), selectedTagId])]);
      setMessage("标签已添加");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "添加标签失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function removeTag(tagId: string) {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      await updateTagIds(tags.filter((tag) => tag.id !== tagId).map((tag) => tag.id));
      setMessage("标签绑定已移除");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "移除标签失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function quickAdd() {
    const names = quickNames
      .split(/[,\n，、]/)
      .map((name) => name.trim())
      .filter(Boolean);
    if (names.length === 0) {
      setError("请填写标签名称");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/tags/quick-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: names }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; tags?: TagItem[] };
      if (!response.ok || !data.ok || !data.tags) throw new Error(data.error ?? "快速添加标签失败");
      setTags(data.tags);
      setQuickNames("");
      setMessage("标签已创建并绑定");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "快速添加标签失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function suggestTags() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/suggest-tags`, { method: "POST" });
      const data = (await response.json()) as { ok: boolean; error?: string; suggestedTags?: SuggestedTag[] };
      if (!response.ok || !data.ok || !data.suggestedTags) throw new Error(data.error ?? "AI 推荐标签失败");
      setSuggestions(data.suggestedTags);
      setSelectedSuggestions([]);
      setMessage("AI 已返回标签建议，请手动选择后添加。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 推荐标签失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function addSelectedSuggestions() {
    const names = selectedSuggestions;
    if (names.length === 0) {
      setError("请选择要添加的建议标签");
      return;
    }
    setQuickNames(names.join("，"));
    await quickAddByNames(names);
  }

  async function quickAddByNames(names: string[]) {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/analyses/${analysisId}/tags/quick-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagNames: names }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string; tags?: TagItem[] };
      if (!response.ok || !data.ok || !data.tags) throw new Error(data.error ?? "添加建议标签失败");
      setTags(data.tags);
      setMessage("已添加选中的建议标签");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "添加建议标签失败");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleSuggestion(name: string) {
    setSelectedSuggestions((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  return (
    <section id="tags" className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-cyan-700">分类整理</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">标签管理</h2>
          <p className="mt-2 text-sm text-slate-500">AI 推荐标签只显示建议，不会自动写入。</p>
        </div>
        <button type="button" disabled={isLoading} onClick={suggestTags} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
          AI 推荐标签
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-800" style={{ backgroundColor: tag.color ?? "#e0f2fe" }}>
              {tag.name}
              <button type="button" onClick={() => removeTag(tag.id)} className="text-xs text-slate-600 hover:text-rose-700">
                移除
              </button>
            </span>
          ))
        ) : (
          <span className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-500">暂无标签</span>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <select value={selectedTagId} onChange={(event) => setSelectedTagId(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
          <option value="">选择已有标签</option>
          {allTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button type="button" disabled={isLoading} onClick={addExisting} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          添加已有标签
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={quickNames}
          onChange={(event) => setQuickNames(event.target.value)}
          placeholder="快速新建标签，多个用逗号分隔"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        />
        <button type="button" disabled={isLoading} onClick={quickAdd} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          新建并绑定
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-amber-950">AI 建议标签</h3>
            <button type="button" disabled={isLoading} onClick={addSelectedSuggestions} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
              添加选中建议
            </button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {suggestions.map((suggestion) => (
              <label key={`${suggestion.category}-${suggestion.name}`} className="rounded-md bg-white p-3 text-sm">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <input type="checkbox" checked={selectedSuggestions.includes(suggestion.name)} onChange={() => toggleSuggestion(suggestion.name)} />
                  {suggestion.name}
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">{suggestion.category}</span>
                </span>
                <span className="mt-2 block leading-6 text-slate-600">{suggestion.reason}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
