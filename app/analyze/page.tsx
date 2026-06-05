import { AnalyzeWorkspace } from "@/components/analysis/analyze-workspace";
import { AppShell } from "@/components/layout/app-shell";

export default function AnalyzePage() {
  return (
    <AppShell>
      <div className="mb-8">
        <p className="text-sm font-semibold text-cyan-700">图片到 Prompt</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">图片逆向分析</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          上传参考图片后，系统会调用视觉模型生成中文结构化分析，并输出适合 image2 / GPT Image 类模型使用的英文 reverse prompt。
        </p>
      </div>

      <AnalyzeWorkspace />
    </AppShell>
  );
}
