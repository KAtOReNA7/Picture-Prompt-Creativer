import { AppShell } from "@/components/layout/app-shell";
import { MaintenanceDashboard } from "@/components/maintenance/maintenance-dashboard";

export default function MaintenancePage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">本地运维</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">运维</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          检查数据库、文件存储、AI 配置、备份、孤儿文件和最近错误，降低长期使用时的数据丢失风险。
        </p>
      </div>

      <MaintenanceDashboard />
    </AppShell>
  );
}
