"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { ImageUploader, UploadedImage } from "@/components/upload/image-uploader";
import { ErrorState } from "@/components/ui/error-state";

type ImportResponse =
  | {
      ok: true;
      analysis: {
        id: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

type FieldKey =
  | "title"
  | "reversePrompt"
  | "negativePrompt"
  | "styleSummary"
  | "visualSubject"
  | "composition"
  | "colorPalette"
  | "lighting"
  | "texture"
  | "eraFeeling"
  | "topicPotential"
  | "tags";

const initialForm: Record<FieldKey, string> = {
  title: "",
  reversePrompt: "",
  negativePrompt: "",
  styleSummary: "",
  visualSubject: "",
  composition: "",
  colorPalette: "",
  lighting: "",
  texture: "",
  eraFeeling: "",
  topicPotential: "",
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

export function ImportPromptForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!form.title.trim()) {
      setError("请填写标题");
      return;
    }

    if (!form.reversePrompt.trim()) {
      setError("请填写英文 Prompt");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/prompts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          tags,
          imageId: image?.id,
        }),
      });
      const data = (await response.json()) as ImportResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "导入失败" : data.error);
        return;
      }

      router.push(`/library/${data.analysis.id}`);
    } catch {
      setError("导入失败，请检查网络或稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={(event) => void submit(event)}>
      <section className="space-y-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Prompt 基础信息</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            导入已有英文 Prompt 后，可以进入详情页重新拆解模块，也可以直接用于风格迁移。
          </p>
        </div>

        <TextInput
          label="标题"
          required
          value={form.title}
          placeholder="例如：冷调电影感产品封面 Prompt"
          onChange={(value) => updateField("title", value)}
        />
        <TextArea
          label="英文 Prompt"
          required
          value={form.reversePrompt}
          minHeight="min-h-44"
          placeholder="Paste an English image prompt here..."
          onChange={(value) => updateField("reversePrompt", value)}
        />
        <TextArea
          label="英文 Negative Prompt"
          value={form.negativePrompt}
          placeholder="low quality, blurry, distorted anatomy, bad composition, unreadable text..."
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
          {isSubmitting ? "正在导入" : "导入 Prompt"}
        </button>
      </section>

      <aside className="space-y-6">
        <section className="space-y-5 rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">中文结构化信息</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              这些字段会进入 Prompt 库详情页，并作为后续拆解与风格迁移的上下文。
            </p>
          </div>
          <TextArea label="风格摘要" value={form.styleSummary} onChange={(value) => updateField("styleSummary", value)} />
          <TextArea label="画面主体" value={form.visualSubject} onChange={(value) => updateField("visualSubject", value)} />
          <TextArea label="构图" value={form.composition} onChange={(value) => updateField("composition", value)} />
          <TextArea label="色彩" value={form.colorPalette} onChange={(value) => updateField("colorPalette", value)} />
          <TextArea label="光影" value={form.lighting} onChange={(value) => updateField("lighting", value)} />
          <TextArea label="材质" value={form.texture} onChange={(value) => updateField("texture", value)} />
          <TextArea label="年代感" value={form.eraFeeling} onChange={(value) => updateField("eraFeeling", value)} />
          <TextArea label="选题传播潜力" value={form.topicPotential} onChange={(value) => updateField("topicPotential", value)} />
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-slate-950">可选参考图</h2>
          <ImageUploader onUploaded={setImage} />
        </section>
      </aside>
    </form>
  );
}
