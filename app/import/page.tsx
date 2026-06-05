import { AppShell } from "@/components/layout/app-shell";
import { ImportPromptForm } from "@/components/import/import-prompt-form";

export default function ImportPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">手动归档</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">导入 Prompt</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          将已有英文 Prompt 保存到 Prompt 库。你可以选择上传参考图，也可以只导入纯 Prompt 模板。
        </p>
      </div>

      <ImportPromptForm />
    </AppShell>
  );
}
