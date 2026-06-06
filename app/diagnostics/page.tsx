import { AppShell } from "@/components/layout/app-shell";
import { AiStatusPanel } from "@/components/settings/ai-status-panel";
import { readRecentLogs } from "@/lib/logging/app-logger";
import { getMaintenanceStatus } from "@/lib/maintenance/maintenance-service";

const diagnostics = [
  ["Node.js", "正常", "v24.16.0"],
  ["npm", "正常", "11.13.0"],
  ["Git", "正常", "已初始化 main 分支"],
  ["npm registry", "正常", "https://registry.npmjs.org/"],
  ["GitHub 远程仓库", "正常", "origin 已绑定并推送 main"],
  ["代理端口", "警告", "10808 可连接，7890 和 10809 未监听"],
  ["OpenAI API", "未配置", "请查看下方 AI 配置检测区块"],
];

const badgeClass: Record<string, string> = {
  正常: "bg-emerald-50 text-emerald-700 border-emerald-200",
  警告: "bg-amber-50 text-amber-800 border-amber-200",
  未配置: "bg-slate-100 text-slate-700 border-slate-200",
};

export default async function DiagnosticsPage() {
  const maintenance = await getMaintenanceStatus();
  const logs = await readRecentLogs(5);

  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">环境健康度</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">环境诊断</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          保留阶段 0 的诊断项目展示，并新增 AI 配置检测区块。
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {diagnostics.map(([name, status, detail]) => (
          <article key={name} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{name}</h2>
              <span className={`rounded-md border px-3 py-1 text-sm font-medium ${badgeClass[status]}`}>
                {status}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{detail}</p>
          </article>
        ))}
      </section>

      <div className="mt-8">
        <AiStatusPanel compact />
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">数据库记录数量</h2>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(maintenance.database.counts).map(([key, value]) => (
              <div key={key} className="rounded-md bg-slate-50 p-3">
                <span className="font-medium text-slate-700">{key}</span>
                <span className="ml-2 text-slate-500">{value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">文件夹大小</h2>
          <div className="mt-4 grid gap-2 text-sm">
            <div className="rounded-md bg-slate-50 p-3">uploads/images：{maintenance.storage.uploadsSizeMB} MB</div>
            <div className="rounded-md bg-slate-50 p-3">uploads/generated：{maintenance.storage.generatedSizeMB} MB</div>
            <div className="rounded-md bg-slate-50 p-3">exports：{maintenance.storage.exportsSizeMB} MB</div>
            <div className="rounded-md bg-slate-50 p-3">backups：{maintenance.storage.backupsSizeMB} MB</div>
          </div>
        </article>
      </section>

      <section className="mt-8 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">最近 5 条错误日志</h2>
        <div className="mt-4 grid gap-2">
          {logs.length > 0 ? (
            logs.map((log, index) => (
              <div key={`${log.time}-${index}`} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex flex-wrap gap-2 font-medium text-slate-900">
                  <span>{log.time}</span>
                  <span>{log.level}</span>
                  <span>{log.scope}</span>
                </div>
                <p className="mt-1 text-slate-600">{log.message}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">暂无错误日志</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
