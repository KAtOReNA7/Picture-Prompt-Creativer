import { AppShell } from "@/components/layout/app-shell";
import { AiStatusPanel } from "@/components/settings/ai-status-panel";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">运行配置</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">系统设置</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          这里读取服务端 AI 配置状态，检查 OpenAI 兼容接口、模型名称和 /models 连通性。
        </p>
      </div>

      <AiStatusPanel />

      <section className="mt-6 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-900">安全说明</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          API Key 只允许在服务端读取。页面只展示是否配置和掩码结果，不会显示完整密钥。
        </p>
      </section>
    </AppShell>
  );
}
