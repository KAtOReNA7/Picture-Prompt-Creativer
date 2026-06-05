import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

const resultItems = [
  ["画面主体", "一位穿复古风衣的女性站在雨夜街角，背景有霓虹招牌和湿润路面反光。"],
  ["风格", "电影感写实摄影，带有轻微赛博复古气质。"],
  ["构图", "中景竖构图，主体居中偏左，街道透视线引导视线。"],
  ["色彩", "青蓝色环境光搭配暖橙色霓虹，高对比但不过度饱和。"],
  ["光影", "侧后方霓虹轮廓光，路面反射形成柔和补光。"],
  [
    "逆向英文 Prompt",
    "cinematic realistic portrait of a woman in a vintage trench coat on a rainy neon street, wet pavement reflections, teal and warm orange lighting, shallow depth of field, high detail",
  ],
  ["可替换字段", "主体人物、服装、街道场景、时代背景、主色调、镜头距离。"],
];

export default function AnalyzePage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">图片到 Prompt</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">图片逆向分析</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          上传图片后，系统会用视觉模型分析画面要素，并生成中文结构化结果和英文 reverse prompt。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-md border border-dashed border-cyan-300 bg-white p-6">
          <div className="flex min-h-72 flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-cyan-50 text-lg font-semibold text-cyan-700">
              图
            </div>
            <h2 className="text-lg font-semibold text-slate-950">上传图片区域</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
              这里将接入图片上传功能，当前展示 mock 状态，支持拖拽或点击选择图片。
            </p>
            <button className="mt-5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
              选择图片
            </button>
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">分析结果 mock</h2>
              <p className="mt-1 text-sm text-slate-500">真实模型接入前用于确认信息结构。</p>
            </div>
            <span className="rounded-md bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">已生成</span>
          </div>
          <dl className="mt-6 grid gap-4">
            {resultItems.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-4">
                <dt className="text-sm font-semibold text-slate-900">{label}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-600">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <LoadingState title="分析状态示例" description="上传完成后会显示 AI 分析进度。" />
        <EmptyState title="暂无上传图片" description="还没有选择参考图片时，会展示这个空状态。" actionLabel="上传图片" />
        <ErrorState title="图片解析失败" description="当图片格式不支持或模型返回异常时，会显示中文错误说明。" />
      </section>
    </AppShell>
  );
}
