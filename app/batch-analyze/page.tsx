import { AppShell } from "@/components/layout/app-shell";
import { BatchAnalyzeWorkspace } from "@/components/batch/batch-analyze-workspace";
import { listBatchTasks } from "@/lib/batch/batch-analysis-service";

export default async function BatchAnalyzePage() {
  const tasks = await listBatchTasks({ limit: 20 });

  return (
    <AppShell>
      <BatchAnalyzeWorkspace initialTasks={tasks} />
    </AppShell>
  );
}
