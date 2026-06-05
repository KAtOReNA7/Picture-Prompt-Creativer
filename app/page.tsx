import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

const features = [
  {
    title: "图片逆向分析",
    description: "上传参考图片，提取主体、风格、构图、色彩、光影和材质等关键视觉信息。",
  },
  {
    title: "Prompt 模块拆解",
    description: "把英文 Prompt 拆成可复用模块，标注哪些内容建议保留，哪些内容适合替换。",
  },
  {
    title: "风格迁移融合",
    description: "输入新的中文需求，沿用原图或原 Prompt 的风格资产，生成适合 image2 的英文 Prompt。",
  },
  {
    title: "Prompt 库管理",
    description: "归档图片、Prompt、拆解模块和风格迁移记录，方便运营人员复用成熟方案。",
  },
  {
    title: "导入已有 Prompt",
    description: "把外部英文 Prompt 直接保存到库中，可选择参考图，再继续拆解和风格迁移。",
  },
  {
    title: "模板编辑与版本",
    description: "在库详情中手动替换 Prompt 模块，组合新版本，并可继续 AI 润色和生成测试图。",
  },
  {
    title: "标签、合集与导出",
    description: "按用途、风格、题材和项目整理资产，批量加入合集，并导出 JSON 或 Markdown。",
  },
];

const imageFlow = ["上传图片", "AI 分析", "逆向 Prompt", "拆解 Prompt", "输入新需求", "风格迁移生成新 Prompt"];
const importFlow = ["导入已有 Prompt", "补充中文结构信息", "拆解 Prompt", "用于风格迁移"];

export default function Home() {
  return (
    <AppShell>
      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-cyan-700">中文图片 Prompt 工作台</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            图像 Prompt 创作器
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            上传图片，逆向分析风格，生成可迁移的 image2 Prompt
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-md bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              开始逆向分析
            </Link>
            <Link
              href="/import"
              className="rounded-md border border-cyan-200 bg-white px-5 py-3 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
            >
              导入已有 Prompt
            </Link>
            <Link
              href="/library"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              查看 Prompt 库
            </Link>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">核心流程</h2>
          <div className="mt-5 grid gap-3">
            {imageFlow.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-900">已有 Prompt 也可以直接进入工作流</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {importFlow.map((item) => (
                <span key={item} className="rounded-md bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-800">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {features.map((feature) => (
          <article key={feature.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">{feature.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
