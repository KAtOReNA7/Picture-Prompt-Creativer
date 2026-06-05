import { FusionWorkspace } from "@/components/fusion/fusion-workspace";
import { AppShell } from "@/components/layout/app-shell";

export default function FusionPage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">风格复用</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">风格迁移</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          选择历史图片分析记录，输入新的中文需求，生成适合 image2 / GPT Image 类模型使用的英文迁移 Prompt。
        </p>
      </div>

      <FusionWorkspace />
    </AppShell>
  );
}
