"use client";

import { useMemo, useState } from "react";
import { PromptVariantActions } from "@/components/prompt-variants/prompt-variant-actions";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";

type SegmentInput = {
  id: string;
  type: string;
  label: string;
  content: string;
  isReplaceable: boolean;
  replaceHint: string | null;
  sortOrder: number;
};

type EditableSegment = SegmentInput & {
  isEnabled: boolean;
};

type ComposeResponse =
  | {
      ok: true;
      variant: PromptVariantResult;
    }
  | {
      ok: false;
      error: string;
    };

type PromptVariantResult = {
  id: string;
  analysisId: string;
  title: string;
  composedPrompt: string;
  negativePrompt: string | null;
  source: string;
  createdAt: string;
};

type PromptTemplateEditorProps = {
  analysisId: string;
  segments: SegmentInput[];
  defaultNegativePrompt?: string | null;
};

const editableTypes = new Set(["subject", "scene", "mood", "color", "style", "camera", "text_area"]);
const preserveTypes = new Set(["composition", "lighting", "texture"]);

export function PromptTemplateEditor({ analysisId, segments, defaultNegativePrompt }: PromptTemplateEditorProps) {
  const sortedSegments = useMemo(() => segments.toSorted((a, b) => a.sortOrder - b.sortOrder), [segments]);
  const negativeSegment = sortedSegments.find((segment) => segment.type === "negative");
  const [title, setTitle] = useState("模块替换 Prompt 版本");
  const [userNote, setUserNote] = useState("");
  const [negativePrompt, setNegativePrompt] = useState(negativeSegment?.content ?? defaultNegativePrompt ?? "");
  const [editableSegments, setEditableSegments] = useState<EditableSegment[]>(
    sortedSegments
      .filter((segment) => segment.type !== "negative")
      .map((segment) => ({
        ...segment,
        isEnabled: true,
      })),
  );
  const [variant, setVariant] = useState<PromptVariantResult | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateSegment(id: string, patch: Partial<EditableSegment>) {
    setEditableSegments((current) => current.map((segment) => (segment.id === id ? { ...segment, ...patch } : segment)));
  }

  async function compose() {
    setIsComposing(true);
    setError(null);
    setVariant(null);

    try {
      const response = await fetch("/api/prompt-variants/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          title,
          userNote,
          negativePrompt,
          editedSegments: editableSegments.map((segment) => ({
            type: segment.type,
            label: segment.label,
            content: segment.content,
            isEnabled: segment.isEnabled,
            sortOrder: segment.sortOrder,
          })),
        }),
      });
      const data = (await response.json()) as ComposeResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "组合新 Prompt 失败" : data.error);
        return;
      }

      setVariant(data.variant);
    } catch {
      setError("组合新 Prompt 失败，请稍后重试");
    } finally {
      setIsComposing(false);
    }
  }

  if (segments.length === 0) {
    return (
      <section className="mt-6 rounded-md border border-dashed border-slate-300 bg-white p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-950">模板编辑器</h2>
        <p className="mt-2 text-sm text-slate-500">当前记录还没有 Prompt 模块，请先点击重新拆解 Prompt。</p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-cyan-700">变量替换</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950">模板编辑器</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          基于已拆解的 Prompt 模块进行人工替换和组合。适合快速改主体、场景、情绪、色彩或文字区域，不强制调用 AI。
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">新版本标题</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-900">备注</span>
          <input
            className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={userNote}
            placeholder="例如：主体替换为古风女刺客，保留冷色电影感"
            onChange={(event) => setUserNote(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {editableSegments.map((segment) => (
          <article key={segment.id} className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-950">{segment.label}</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">type: {segment.type}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={segment.isReplaceable ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"}>
                  {segment.isReplaceable ? "可替换" : "建议保留"}
                </span>
                {preserveTypes.has(segment.type) ? (
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">建议保留以维持原风格</span>
                ) : null}
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={segment.isEnabled}
                onChange={(event) => updateSegment(segment.id, { isEnabled: event.target.checked })}
              />
              启用该模块
            </label>
            <textarea
              className="mt-3 min-h-28 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              value={segment.content}
              onChange={(event) => updateSegment(segment.id, { content: event.target.value })}
            />
            {editableTypes.has(segment.type) ? (
              <input
                className="mt-3 w-full rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                placeholder="快捷替换输入，填写后会覆盖上方内容"
                onBlur={(event) => {
                  if (event.target.value.trim()) {
                    updateSegment(segment.id, { content: event.target.value.trim() });
                    event.target.value = "";
                  }
                }}
              />
            ) : null}
            <p className="mt-3 text-sm leading-6 text-slate-500">替换建议：{segment.replaceHint ?? "暂无建议"}</p>
          </article>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-slate-900">Negative Prompt</span>
        <textarea
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-6 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          value={negativePrompt}
          onChange={(event) => setNegativePrompt(event.target.value)}
        />
      </label>

      {error ? (
        <div className="mt-5">
          <ErrorState title="组合失败" description={error} />
        </div>
      ) : null}

      <button
        type="button"
        disabled={isComposing}
        className="mt-5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        onClick={() => void compose()}
      >
        {isComposing ? "组合中" : "组合新 Prompt"}
      </button>

      {variant ? (
        <div className="mt-6 rounded-md border border-cyan-200 bg-cyan-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-cyan-950">{variant.title}</h3>
            <CopyButton text={variant.composedPrompt} />
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{variant.composedPrompt}</p>
          <div className="mt-4 rounded-md bg-white/70 p-3">
            <p className="text-sm font-semibold text-slate-900">Negative Prompt</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{variant.negativePrompt ?? "无"}</p>
          </div>
          <div className="mt-4">
            <PromptVariantActions variant={variant} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
