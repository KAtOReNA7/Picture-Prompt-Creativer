import { AppShell } from "@/components/layout/app-shell";
import { ImportPromptForm } from "@/components/import/import-prompt-form";

export default function ImportPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">手动归档</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">导入 Prompt</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          将中文、英文、中英混合 Prompt 或模糊画面描述保存到 Prompt 库。语义整理模式会生成适合 image2 的英文 reverse prompt。
        </p>
      </div>

      <ImportPromptForm />
    </AppShell>
  );
}
