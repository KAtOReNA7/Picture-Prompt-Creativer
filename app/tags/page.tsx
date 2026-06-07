import { AppShell } from "@/components/layout/app-shell";
import { TagGovernanceDashboard } from "@/components/tags/tag-governance-dashboard";

export default function TagsPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">标签治理</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">标签管理</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          统计标签使用情况，按分类和等级管理素材标签，并在人工确认后合并近义或重复标签。
        </p>
      </div>
      <TagGovernanceDashboard />
    </AppShell>
  );
}
