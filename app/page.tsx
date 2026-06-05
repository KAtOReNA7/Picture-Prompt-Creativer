import { AppShell } from "@/components/layout/app-shell";

const features = [
  {
    title: "图片逆向分析",
    description: "上传参考图片，提取主体、风格、构图、色彩和光影等关键视觉信息。",
  },
  {
    title: "Prompt 模块拆解",
    description: "把逆向 Prompt 拆成可替换模块，明确哪些内容建议保留，哪些内容适合迁移。",
  },
  {
    title: "风格迁移融合",
    description: "输入新的中文需求，沿用原图风格，生成适合 image2 的英文 Prompt。",
  },
  {
    title: "Prompt 库管理",
    description: "归档图片、Prompt、风格标签和评分，方便运营人员复用成熟方案。",
  },
];

const flow = ["上传图片", "AI 分析", "逆向 Prompt", "拆解 Prompt", "输入新需求", "风格迁移生成新 Prompt"];

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
            <a
              href="/analyze"
              className="rounded-md bg-cyan-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-700"
            >
              开始逆向分析
            </a>
            <a
              href="/library"
              className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
            >
              查看 Prompt 库
            </a>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">核心流程</h2>
          <div className="mt-5 grid gap-3">
            {flow.map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-slate-50 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
