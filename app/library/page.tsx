import { AppShell } from "@/components/layout/app-shell";
import { PromptCard } from "@/components/prompt/prompt-card";
import { EmptyState } from "@/components/ui/empty-state";

const prompts = [
  {
    title: "雨夜霓虹人像",
    style: "电影感",
    score: "4.8",
    createdAt: "2026-06-06",
    summary: "适合城市夜景、人像海报、潮流服饰主视觉，强调湿润反光和霓虹轮廓光。",
    hasSegments: true,
  },
  {
    title: "复古杂志静物",
    style: "复古商业",
    score: "4.6",
    createdAt: "2026-06-05",
    summary: "适合香水、饰品、手作产品，保留胶片颗粒、暖色台灯和纸张纹理。",
    hasSegments: false,
  },
  {
    title: "自然光家居场景",
    style: "生活方式",
    score: "4.7",
    createdAt: "2026-06-04",
    summary: "适合家居、软装和日用品，强调清晨自然光、浅色空间和真实材质触感。",
    hasSegments: true,
  },
];

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-cyan-700">素材沉淀</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Prompt 库</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            保存分析结果、风格标签和可复用 Prompt，帮助运营人员快速复用优质视觉方案。
          </p>
        </div>
        <div className="flex w-full max-w-md gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="搜索标题、风格或关键词"
          />
          <button className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
            搜索
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {prompts.map((prompt) => (
          <div key={prompt.title} className="space-y-2">
            <PromptCard {...prompt} />
            <span
              className={`inline-flex rounded-md px-3 py-1 text-sm font-medium ${
                prompt.hasSegments ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {prompt.hasSegments ? "已生成 Prompt 模块" : "未拆解 Prompt"}
            </span>
          </div>
        ))}
      </section>

      <div className="mt-6">
        <EmptyState title="暂无更多 Prompt" description="后续接入数据库后，这里会展示真实保存的图片、Prompt 和拆解模块记录。" />
      </div>
    </AppShell>
  );
}
