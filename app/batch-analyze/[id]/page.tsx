import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BatchAnalyzeWorkspace } from "@/components/batch/batch-analyze-workspace";
import { getBatchTaskDetail, listBatchTasks } from "@/lib/batch/batch-analysis-service";

type BatchAnalyzeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BatchAnalyzeDetailPage({ params }: BatchAnalyzeDetailPageProps) {
  const { id } = await params;
  let task;
  let tasks;

  try {
    [task, tasks] = await Promise.all([getBatchTaskDetail(id), listBatchTasks({ limit: 20 })]);
  } catch {
    notFound();
  }

  return (
    <AppShell>
      <BatchAnalyzeWorkspace initialTask={task} initialTasks={tasks} />
    </AppShell>
  );
}
