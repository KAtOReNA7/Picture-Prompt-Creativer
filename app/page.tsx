const features = [
  "图片上传与视觉模型逆向分析",
  "中文结构化 Prompt 模块拆解",
  "新需求与原图风格融合",
  "图片和已有 Prompt 归类保存",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-10 px-6 py-12">
        <div className="space-y-5">
          <p className="text-sm font-medium text-cyan-300">项目骨架已初始化</p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white sm:text-5xl">
            中文图片 Prompt 逆向分析与风格迁移工具
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-300">
            当前阶段先完成 Next.js App Router、TypeScript、Tailwind CSS、Prisma 和 SQLite 的基础工程配置。
            后续阶段会逐步接入图片上传、服务端 OpenAI 兼容接口调用、Prompt 模块化拆解和资料归档。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature}
              className="rounded-md border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-200"
            >
              {feature}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
