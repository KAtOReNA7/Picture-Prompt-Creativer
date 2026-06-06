import "server-only";
import { prisma } from "@/lib/db/prisma";
import { analyzeImageById } from "@/lib/analysis/image-analysis-service";

const TASK_STATUSES = ["draft", "uploading", "ready", "running", "paused", "completed", "failed", "canceled"] as const;

export type BatchTaskStatus = (typeof TASK_STATUSES)[number];
export type BatchItemStatus = "waiting_upload" | "uploaded" | "pending" | "processing" | "success" | "failed" | "canceled";

export function assertTaskStatus(value: string): asserts value is BatchTaskStatus {
  if (!TASK_STATUSES.includes(value as BatchTaskStatus)) {
    throw new Error("任务状态不支持");
  }
}

function serializeTask<T extends { createdAt: Date; updatedAt: Date; startedAt?: Date | null; finishedAt?: Date | null }>(task: T) {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    startedAt: task.startedAt?.toISOString() ?? null,
    finishedAt: task.finishedAt?.toISOString() ?? null,
  };
}

function serializeItem<T extends { createdAt: Date; updatedAt: Date; startedAt?: Date | null; finishedAt?: Date | null }>(item: T) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    startedAt: item.startedAt?.toISOString() ?? null,
    finishedAt: item.finishedAt?.toISOString() ?? null,
  };
}

export async function recomputeBatchTaskCounts(taskId: string) {
  const items = await prisma.batchAnalysisItem.findMany({
    where: { taskId },
    select: { status: true },
  });

  const counts = {
    pendingCount: items.filter((item) => item.status === "pending").length,
    uploadingCount: items.filter((item) => item.status === "waiting_upload" || item.status === "uploaded").length,
    processingCount: items.filter((item) => item.status === "processing").length,
    successCount: items.filter((item) => item.status === "success").length,
    failedCount: items.filter((item) => item.status === "failed").length,
    canceledCount: items.filter((item) => item.status === "canceled").length,
  };
  const terminalCount = counts.successCount + counts.failedCount + counts.canceledCount;
  const task = await prisma.batchAnalysisTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("批量任务不存在");

  const status =
    task.status !== "canceled" && items.length > 0 && terminalCount === items.length
      ? "completed"
      : task.status !== "canceled" && items.length > 0 && ["draft", "completed", "failed"].includes(task.status)
        ? "ready"
        : task.status;

  return prisma.batchAnalysisTask.update({
    where: { id: taskId },
    data: {
      ...counts,
      status,
      finishedAt: status === "completed" || status === "canceled" ? (task.finishedAt ?? new Date()) : task.finishedAt,
    },
  });
}

export async function createBatchTask(input: { name: string; totalCount: number; concurrency: number }) {
  if (input.totalCount < 1 || input.totalCount > 100) throw new Error("单个批量任务最多 100 张图片");
  if (input.concurrency < 1 || input.concurrency > 2) throw new Error("并发数只能是 1 或 2");

  const task = await prisma.batchAnalysisTask.create({
    data: {
      name: input.name.trim() || "未命名批量逆向任务",
      status: "draft",
      totalCount: input.totalCount,
      concurrency: input.concurrency,
      maxItems: 100,
      maxFileSizeMB: 40,
    },
  });

  return serializeTask(task);
}

export async function listBatchTasks(input: { status?: string | null; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const status = input.status?.trim();
  if (status) assertTaskStatus(status);

  const tasks = await prisma.batchAnalysisTask.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { _count: { select: { items: true } } },
  });

  return tasks.map(serializeTask);
}

export async function getBatchTaskDetail(taskId: string) {
  const task = await prisma.batchAnalysisTask.findUnique({
    where: { id: taskId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          image: { select: { id: true, publicPath: true } },
          analysis: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!task) throw new Error("批量任务不存在");

  return {
    ...serializeTask(task),
    items: task.items.map((item) =>
      serializeItem({
        ...item,
        imagePreviewUrl: item.image?.publicPath ?? (item.imageId ? `/api/images/${item.imageId}/file` : null),
      }),
    ),
  };
}

export async function updateBatchTask(taskId: string, input: { name?: string; status?: string }) {
  const task = await prisma.batchAnalysisTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("批量任务不存在");

  const data: { name?: string; status?: string; startedAt?: Date; finishedAt?: Date | null } = {};
  if (typeof input.name === "string" && input.name.trim()) data.name = input.name.trim();
  if (input.status) {
    assertTaskStatus(input.status);
    if (!["running", "paused", "canceled"].includes(input.status)) throw new Error("当前只支持开始、暂停或取消任务");
    data.status = input.status;
    if (input.status === "running" && !task.startedAt) data.startedAt = new Date();
    if (input.status === "running") data.finishedAt = null;
    if (input.status === "canceled") data.finishedAt = new Date();
  }

  if (input.status === "canceled") {
    await prisma.batchAnalysisItem.updateMany({
      where: { taskId, status: { in: ["pending", "uploaded", "waiting_upload"] } },
      data: { status: "canceled", finishedAt: new Date() },
    });
  }

  await prisma.batchAnalysisTask.update({ where: { id: taskId }, data });
  const updated = await recomputeBatchTaskCounts(taskId);
  return serializeTask(updated);
}

export async function addItemToBatchTask(input: { taskId: string; imageId: string; originalName: string; sortOrder: number }) {
  const [task, image, count] = await Promise.all([
    prisma.batchAnalysisTask.findUnique({ where: { id: input.taskId } }),
    prisma.imageAsset.findUnique({ where: { id: input.imageId } }),
    prisma.batchAnalysisItem.count({ where: { taskId: input.taskId } }),
  ]);
  if (!task) throw new Error("批量任务不存在");
  if (!image) throw new Error("图片不存在");
  if (count >= task.maxItems) throw new Error("单个任务最多只能加入 100 张图片");

  const item = await prisma.batchAnalysisItem.create({
    data: {
      taskId: input.taskId,
      imageId: input.imageId,
      originalName: input.originalName.trim() || image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      status: "pending",
      sortOrder: input.sortOrder,
    },
  });
  await recomputeBatchTaskCounts(input.taskId);
  return serializeItem(item);
}

export async function retryBatchItem(taskId: string, itemId: string) {
  const item = await prisma.batchAnalysisItem.findUnique({ where: { id: itemId } });
  if (!item || item.taskId !== taskId) throw new Error("任务图片不存在");
  if (item.status !== "failed") throw new Error("只有失败项可以重试");

  const updated = await prisma.batchAnalysisItem.update({
    where: { id: itemId },
    data: {
      status: "pending",
      errorMessage: null,
      startedAt: null,
      finishedAt: null,
      analysisId: null,
    },
  });
  await recomputeBatchTaskCounts(taskId);
  return serializeItem(updated);
}

export async function processNextBatchItem(taskId: string) {
  const task = await prisma.batchAnalysisTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("批量任务不存在");
  if (["paused", "canceled", "completed"].includes(task.status)) {
    return { processed: false, reason: "当前任务状态不会继续处理", task: serializeTask(task), item: null };
  }

  const item = await prisma.batchAnalysisItem.findFirst({
    where: { taskId, status: "pending" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  if (!item) {
    const updatedTask = await recomputeBatchTaskCounts(taskId);
    return { processed: false, reason: "没有待处理图片", task: serializeTask(updatedTask), item: null };
  }

  const processing = await prisma.batchAnalysisItem.update({
    where: { id: item.id },
    data: { status: "processing", errorMessage: null, startedAt: new Date(), finishedAt: null },
  });
  await prisma.batchAnalysisTask.update({
    where: { id: taskId },
    data: { status: "running", startedAt: task.startedAt ?? new Date(), finishedAt: null },
  });
  await recomputeBatchTaskCounts(taskId);

  if (!processing.imageId) {
    const failed = await prisma.batchAnalysisItem.update({
      where: { id: item.id },
      data: { status: "failed", errorMessage: "图片记录不存在", finishedAt: new Date() },
    });
    const updatedTask = await recomputeBatchTaskCounts(taskId);
    return { processed: true, ok: false, task: serializeTask(updatedTask), item: serializeItem(failed) };
  }

  try {
    const result = await analyzeImageById(processing.imageId);
    const success = await prisma.batchAnalysisItem.update({
      where: { id: item.id },
      data: { status: "success", analysisId: result.analysis.id, finishedAt: new Date() },
    });
    const updatedTask = await recomputeBatchTaskCounts(taskId);
    return { processed: true, ok: true, task: serializeTask(updatedTask), item: serializeItem(success), analysis: result.analysis };
  } catch (error) {
    const message = error instanceof Error ? error.message : "图片分析失败";
    const failed = await prisma.batchAnalysisItem.update({
      where: { id: item.id },
      data: { status: "failed", errorMessage: message, finishedAt: new Date() },
    });
    const updatedTask = await recomputeBatchTaskCounts(taskId);
    return { processed: true, ok: false, task: serializeTask(updatedTask), item: serializeItem(failed) };
  }
}
