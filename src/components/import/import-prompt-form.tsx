"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ImageUploader, UploadedImage } from "@/components/upload/image-uploader";
import { ErrorState } from "@/components/ui/error-state";
import { OperationProgressModal } from "@/components/ui/operation-progress-modal";
import { useOperationProgress } from "@/hooks/use-operation-progress";
import { promptImportProgress } from "@/lib/ui/operation-progress-presets";

type ImportMode = "semantic_preserve" | "direct";

type ImportResponse =
  | {
      ok: true;
      analysis: {
        id: string;
      };
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

type FieldKey = "title" | "rawPrompt" | "negativePrompt" | "tags";

const initialForm: Record<FieldKey, string> = {
  title: "",
  rawPrompt: "",
  negativePrompt: "",
  tags: "",
};

function TextInput({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <input
        className="mt-2 w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  required,
  placeholder,
  minHeight = "min-h-28",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  minHeight?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-900">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </span>
      <textarea
        className={`mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 ${minHeight}`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ModeOption({
  value,
  current,
  title,
  description,
  onChange,
}: {
  value: ImportMode;
  current: ImportMode;
  title: string;
  description: string;
  onChange: (value: ImportMode) => void;
}) {
  const isActive = value === current;

  return (
    <button
      type="button"
      className={`rounded-md border p-4 text-left transition ${
        isActive ? "border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 bg-white hover:border-cyan-200"
      }`}
      onClick={() => onChange(value)}
    >
      <span className="text-sm font-semibold text-slate-950">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-slate-600">{description}</span>
    </button>
  );
}

export function ImportPromptForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [importMode, setImportMode] = useState<ImportMode>("semantic_preserve");
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { progress, startProgress, completeProgress, failProgress, hideProgress } = useOperationProgress();

  const tags = useMemo(
    () =>
      form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    [form.tags],
  );

  function updateField(key: FieldKey, value: string) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!form.rawPrompt.trim()) {
      setError("请填写原始 Prompt 或画面描述");
      return;
    }

    setIsSubmitting(true);
    if (importMode === "semantic_preserve") {
      startProgress(promptImportProgress);
    }

    try {
      const response = await fetch("/api/prompts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          rawPrompt: form.rawPrompt,
          negativePrompt: form.negativePrompt,
          tags,
          imageId: image?.id,
          importMode,
        }),
      });
      const data = (await response.json()) as ImportResponse;

      if (!response.ok || !data.ok) {
        const message = data.ok ? "导入失败" : data.error;
        setError(message);
        if (importMode === "semantic_preserve") {
          failProgress(message);
        }
        return;
      }

      if (importMode === "semantic_preserve") {
        completeProgress("Prompt 已保留原文并整理入库");
      }
      router.push(`/library/${data.analysis.id}`);
    } catch {
      const message = "导入失败，请检查网络或稍后重试";
      setError(message);
      if (importMode === "semantic_preserve") {
        failProgress(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={(event) => void submit(event)}>
      <OperationProgressModal {...progress} onClose={hideProgress} />
      <section className="space-y-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Prompt 导入信息</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            可以粘贴中文、英文、中英混合 Prompt，也可以只写模糊画面需求。导入会保留原文，不会自动改写、翻译或重排。
          </p>
        </div>

        <TextInput
          label="标题"
          value={form.title}
          placeholder="例如“冷色电影感悬疑封面”"
          onChange={(value) => updateField("title", value)}
        />
        <TextArea
          label="原始 Prompt / 模糊描述"
          required
          value={form.rawPrompt}
          minHeight="min-h-52"
          placeholder="例如：冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面"
          onChange={(value) => updateField("rawPrompt", value)}
        />
        <TextArea
          label="Negative Prompt"
          value={form.negativePrompt}
          placeholder="可填写中文、英文或中英混合内容，系统会原样保存。"
          onChange={(value) => updateField("negativePrompt", value)}
        />
        <TextInput
          label="标签"
          value={form.tags}
          placeholder="用英文逗号分隔，例如：封面,电影感,冷色"
          onChange={(value) => updateField("tags", value)}
        />

        {error ? <ErrorState title="导入失败" description={error} /> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? "正在导入" : importMode === "semantic_preserve" ? "AI 语义整理入库" : "直接入库"}
        </button>
      </section>

      <aside className="space-y-6">
        <section className="space-y-4 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">导入模式</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">推荐使用 AI 语义整理入库。AI 只分析风格、主体、构图、色彩、光影和标签，不会覆盖原始 Prompt。</p>
          </div>
          <div className="grid gap-3">
            <ModeOption
              value="semantic_preserve"
              current={importMode}
              title="AI 语义整理入库，保留原文"
              description="自动识别语言并整理结构化信息，原始 Prompt 会作为可执行 Prompt 原样保存。"
              onChange={setImportMode}
            />
            <ModeOption
              value="direct"
              current={importMode}
              title="直接入库"
              description="不调用 AI，不做结构化分析，适合先保存已验证 Prompt。"
              onChange={setImportMode}
            />
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">可选参考图</h2>
          <ImageUploader onUploaded={setImage} />
        </section>
      </aside>
    </form>
  );
}
