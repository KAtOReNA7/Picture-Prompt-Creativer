import { AppShell } from "@/components/layout/app-shell";

const configs = [
  ["OPENAI_BASE_URL", "https://linkapi.shop/v1"],
  ["OPENAI_TEXT_MODEL", "稍后配置"],
  ["OPENAI_VISION_MODEL", "稍后配置"],
  ["OPENAI_IMAGE_MODEL", "image2"],
  ["OPENAI_API_KEY", "已隐藏，不显示明文"],
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">运行配置</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">系统设置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          当前页面展示模型配置 mock，后续会接入真实环境变量检测和连通性校验。
        </p>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">模型配置 mock</h2>
        <div className="mt-6 grid gap-3">
          {configs.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-2 rounded-md bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm font-semibold text-slate-900">{key}</span>
              <span className="text-sm text-slate-600">{value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-5">
        <p className="text-sm font-medium text-amber-900">稍后接入真实配置检测。</p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          API Key 只允许在服务端读取，前端页面不会展示明文，也不会把密钥发送到浏览器。
        </p>
      </section>
    </AppShell>
  );
}
