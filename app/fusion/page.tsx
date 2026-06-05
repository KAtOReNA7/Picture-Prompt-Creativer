import { AppShell } from "@/components/layout/app-shell";

const styleItems = [
  ["风格", "电影感写实摄影，雨夜霓虹氛围"],
  ["色彩", "青蓝环境光与暖橙霓虹对比"],
  ["光影", "侧后方轮廓光，湿润路面反射"],
  ["可保留", "镜头语言、材质反光、浅景深、高细节"],
];

export default function FusionPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">风格复用</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">风格迁移</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          将原图风格与新的中文需求融合，生成新的英文 image2 Prompt。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">原图风格摘要 mock</h2>
          <dl className="mt-5 grid gap-3">
            {styleItems.map(([label, value]) => (
              <div key={label} className="rounded-md bg-slate-50 p-4">
                <dt className="text-sm font-semibold text-slate-900">{label}</dt>
                <dd className="mt-1 text-sm leading-6 text-slate-600">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">输入新文字需求</h2>
          <textarea
            className="mt-5 min-h-56 w-full resize-none rounded-md border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            placeholder="例如：把主体替换成一台复古咖啡机，场景改为清晨街边咖啡店橱窗。"
            defaultValue="把主体替换成一款透明玻璃香水瓶，保留雨夜霓虹、湿润反光和电影感构图。"
          />
          <button className="mt-4 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700">
            生成融合 Prompt
          </button>
        </section>
      </div>

      <section className="mt-6 rounded-md border border-cyan-200 bg-cyan-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-950">融合后的英文 Prompt mock</h2>
          <span className="rounded-md bg-white px-3 py-1 text-sm font-medium text-cyan-700">image2 适配</span>
        </div>
        <p className="mt-4 rounded-md bg-white p-4 text-sm leading-7 text-slate-700">
          cinematic realistic product shot of a transparent glass perfume bottle on a rainy neon street,
          wet pavement reflections, teal ambient light with warm orange neon accents, elegant commercial
          composition, shallow depth of field, premium material details, high resolution, refined highlights
        </p>
      </section>
    </AppShell>
  );
}
