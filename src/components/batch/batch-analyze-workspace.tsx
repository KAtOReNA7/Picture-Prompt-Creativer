"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

type BatchTask = {
  id: string;
  name: string;
  status: string;
  totalCount: number;
  pendingCount: number;
  uploadingCount: number;
  processingCount: number;
  successCount: number;
  failedCount: number;
  canceledCount: number;
  maxFileSizeMB: number;
  concurrency: number;
  createdAt: string;
  items?: BatchItem[];
};

type BatchItem = {
  id: string;
  imageId: string | null;
  analysisId: string | null;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  status: string;
  errorMessage: string | null;
  sortOrder: number;
  imagePreviewUrl?: string | null;
};

type BatchAnalyzeWorkspaceProps = {
  initialTasks?: BatchTask[];
  initialTask?: BatchTask | null;
};

type LocalUploadItem = {
  id: string;
  file: File;
  status: "等待上传" | "上传中" | "已加入任务" | "失败";
  error?: string;
};

const MAX_ITEMS = 100;
const MAX_BATCH_MB = 40;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function formatBytes(size: number | null | undefined): string {
  if (!size) return "未知";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "草稿",
    uploading: "上传中",
    ready: "待开始",
    running: "分析中",
    paused: "已暂停",
    completed: "已完成",
    failed: "失败",
    canceled: "已取消",
    pending: "待处理",
    processing: "处理中",
    success: "成功",
    canceled_item: "已取消",
  };
  if (status === "canceled") return "已取消";
  return labels[status] ?? status;
}

function itemBadgeClass(status: string): string {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  if (status === "processing") return "bg-cyan-50 text-cyan-700";
  if (status === "canceled") return "bg-slate-100 text-slate-500";
  return "bg-amber-50 text-amber-700";
}

function failureAdvice(message: string | null): string | null {
  if (!message) return null;
  if (message.includes("过小") || message.includes("内容过少") || message.includes("可识别视觉内容") || message.includes("无法处理该图片")) {
    return "建议更换更清晰或更大尺寸图片。重试可能仍会失败。";
  }
  if (message.includes("格式") || message.includes("文件损坏")) {
    return "建议重新导出为 JPG、PNG 或 WebP 后再上传。重试可能仍会失败。";
  }
  if (message.includes("超时") || message.includes("服务端异常") || message.includes("请求过快")) {
    return "建议稍后重试，批量任务可先降低并发为 1。";
  }
  if (message.includes("内容安全")) {
    return "建议更换图片内容或忽略该项。重试可能仍会失败。";
  }
  return "可以先重试一次；如果仍失败，建议更换图片或忽略该项。";
}

export function BatchAnalyzeWorkspace({ initialTasks = [], initialTask = null }: BatchAnalyzeWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tasks, setTasks] = useState(initialTasks);
  const [task, setTask] = useState<BatchTask | null>(initialTask);
  const [name, setName] = useState(initialTask?.name ?? "批量逆向任务");
  const [concurrency, setConcurrency] = useState<1 | 2>((initialTask?.concurrency as 1 | 2 | undefined) ?? 1);
  const [localFiles, setLocalFiles] = useState<LocalUploadItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showFailedOnly, setShowFailedOnly] = useState(false);

  const items = useMemo(() => task?.items ?? [], [task?.items]);
  const completedCount = (task?.successCount ?? 0) + (task?.failedCount ?? 0) + (task?.canceledCount ?? 0);
  const totalForProgress = Math.max(task?.totalCount ?? items.length, items.length, 1);
  const progress = Math.min(100, Math.round((completedCount / totalForProgress) * 100));
  const visibleItems = useMemo(() => (showFailedOnly ? items.filter((item) => item.status === "failed") : items), [items, showFailedOnly]);

  async function refreshTask(taskId = task?.id) {
    if (!taskId) return null;
    const response = await fetch(`/api/batch-analyses/${taskId}`);
    const data = (await response.json()) as { ok: boolean; task?: BatchTask; error?: string };
    if (!response.ok || !data.ok || !data.task) throw new Error(data.error ?? "刷新任务失败");
    setTask(data.task);
    return data.task;
  }

  async function createTask(totalCount?: number) {
    const count = totalCount ?? Math.max(localFiles.length, 1);
    setIsCreating(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/batch-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, totalCount: count, concurrency }),
      });
      const data = (await response.json()) as { ok: boolean; task?: BatchTask; error?: string };
      if (!response.ok || !data.ok || !data.task) throw new Error(data.error ?? "创建任务失败");
      setTask(data.task);
      setTasks((current) => [data.task as BatchTask, ...current.filter((item) => item.id !== data.task?.id)]);
      setMessage("批量任务已创建，可以开始上传图片。");
      router.replace(`/batch-analyze/${data.task.id}`);
      return data.task;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建任务失败");
      return null;
    } finally {
      setIsCreating(false);
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    setError(null);
    if (files.length > MAX_ITEMS) {
      setError("单个批量任务最多选择 100 张图片，请分批处理。");
      return;
    }
    const nextFiles = files.map((file) => {
      if (!ALLOWED_TYPES.has(file.type)) {
        return { id: `${file.name}-${file.size}-${Math.random()}`, file, status: "失败" as const, error: "文件类型不支持" };
      }
      if (file.size > MAX_BATCH_MB * 1024 * 1024) {
        return { id: `${file.name}-${file.size}-${Math.random()}`, file, status: "失败" as const, error: "单张图片不能超过 40MB" };
      }
      return { id: `${file.name}-${file.size}-${Math.random()}`, file, status: "等待上传" as const };
    });
    setLocalFiles(nextFiles);
    if (nextFiles.some((item) => item.status === "失败")) {
      setMessage("部分文件未通过前端校验，请移除或重新选择。");
    } else {
      setMessage(`已选择 ${nextFiles.length} 张图片。`);
    }
  }

  async function uploadFiles() {
    const validFiles = localFiles.filter((item) => item.status === "等待上传");
    if (validFiles.length === 0) {
      setError("没有可上传的图片");
      return;
    }
    const currentTask = task ?? (await createTask(validFiles.length));
    if (!currentTask) return;

    setIsUploading(true);
    setError(null);
    setMessage(null);
    try {
      await fetch(`/api/batch-analyses/${currentTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running", name }),
      }).catch(() => undefined);

      for (let index = 0; index < validFiles.length; index++) {
        const local = validFiles[index];
        setLocalFiles((current) => current.map((item) => (item.id === local.id ? { ...item, status: "上传中" } : item)));

        const formData = new FormData();
        formData.append("file", local.file);
        formData.append("mode", "batch_analysis");
        const uploadResponse = await fetch("/api/images/upload", { method: "POST", body: formData });
        const uploadData = (await uploadResponse.json()) as { ok: boolean; image?: { id: string }; error?: string };
        if (!uploadResponse.ok || !uploadData.ok || !uploadData.image) throw new Error(uploadData.error ?? "上传失败");

        const itemResponse = await fetch(`/api/batch-analyses/${currentTask.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageId: uploadData.image.id, originalName: local.file.name, sortOrder: index + 1 }),
        });
        const itemData = (await itemResponse.json()) as { ok: boolean; error?: string };
        if (!itemResponse.ok || !itemData.ok) throw new Error(itemData.error ?? "加入任务失败");

        setLocalFiles((current) => current.map((item) => (item.id === local.id ? { ...item, status: "已加入任务" } : item)));
        await refreshTask(currentTask.id);
      }
      await fetch(`/api/batch-analyses/${currentTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paused" }),
      }).catch(() => undefined);
      await refreshTask(currentTask.id);
      setMessage("图片已逐张上传并加入任务。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function updateTaskStatus(status: "running" | "paused" | "canceled") {
    if (!task) return;
    const response = await fetch(`/api/batch-analyses/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await response.json()) as { ok: boolean; task?: BatchTask; error?: string };
    if (!response.ok || !data.ok || !data.task) throw new Error(data.error ?? "更新任务状态失败");
    setTask(data.task);
    return data.task;
  }

  async function startProcessing() {
    if (!task) {
      setError("请先创建任务并上传图片");
      return;
    }
    setIsProcessing(true);
    setError(null);
    setMessage("批量分析已开始，耗时取决于图片数量、模型响应和网络情况。");
    try {
      await updateTaskStatus("running");
      let keepGoing = true;
      while (keepGoing) {
        const latest = await refreshTask(task.id);
        if (!latest || ["paused", "canceled", "completed"].includes(latest.status)) break;
        const pending = latest.items?.filter((item) => item.status === "pending").length ?? latest.pendingCount;
        if (pending <= 0) break;

        const workers = Array.from({ length: Math.min(latest.concurrency, pending) }, async () => {
          const response = await fetch(`/api/batch-analyses/${latest.id}/process-next`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ limit: 1 }),
          });
          const data = (await response.json()) as { ok: boolean; error?: string };
          if (!response.ok || !data.ok) throw new Error(data.error ?? "处理下一张图片失败");
        });
        await Promise.all(workers);
        const after = await refreshTask(task.id);
        keepGoing = Boolean(after && after.pendingCount > 0 && after.status === "running");
      }
      const finalTask = await refreshTask(task.id);
      setMessage(finalTask?.status === "completed" ? "批量分析已完成。" : "批量分析已停止。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "批量分析失败");
    } finally {
      setIsProcessing(false);
    }
  }

  async function pauseTask() {
    try {
      await updateTaskStatus("paused");
      setMessage("已暂停任务，正在处理的单张图片会自然结束。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "暂停任务失败");
    }
  }

  async function retryItem(itemId: string) {
    if (!task) return;
    setError(null);
    try {
      const response = await fetch(`/api/batch-analyses/${task.id}/items/${itemId}/retry`, { method: "POST" });
      const data = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "重试失败项失败");
      await refreshTask(task.id);
      setMessage("失败项已改为待处理，可以继续分析。");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "重试失败项失败");
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-cyan-700">批量逆向 Prompt</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">批量图片逆向分析</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              最多 100 张，单张最大 40MB。前端逐张上传，服务端逐张调用视觉模型，单张失败不会影响其他图片。
            </p>
          </div>
          <Link href="/library" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            查看 Prompt 库
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.7fr]">
        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">创建任务</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
            <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" placeholder="任务名称" />
            <select value={concurrency} onChange={(event) => setConcurrency(Number(event.target.value) as 1 | 2)} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
              <option value={1}>并发 1</option>
              <option value={2}>并发 2</option>
            </select>
            <button type="button" disabled={isCreating || Boolean(task)} onClick={() => void createTask()} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">
              {task ? "任务已创建" : isCreating ? "创建中" : "创建任务"}
            </button>
          </div>
          {task ? (
            <p className="mt-3 text-sm text-slate-500">
              当前任务：{task.name}，状态：{statusLabel(task.status)}。页面刷新后可从任务详情继续处理。
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">历史任务</h2>
          <div className="mt-3 max-h-44 space-y-2 overflow-auto">
            {tasks.length > 0 ? tasks.map((item) => (
              <Link key={item.id} href={`/batch-analyze/${item.id}`} className="block rounded-md bg-slate-50 p-3 text-sm text-slate-700 hover:bg-cyan-50">
                {item.name} · {statusLabel(item.status)} · 成功 {item.successCount} / 失败 {item.failedCount}
              </Link>
            )) : <p className="text-sm text-slate-500">暂无历史批量任务。</p>}
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <div
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          onDragOver={(event) => event.preventDefault()}
          className="rounded-md border border-dashed border-cyan-300 bg-cyan-50/40 p-6 text-center"
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => event.target.files && addFiles(event.target.files)} />
          <p className="text-base font-semibold text-slate-950">选择或拖拽多张图片</p>
          <p className="mt-2 text-sm text-slate-600">支持 JPG、PNG、WebP；最多 100 张，单张最大 40MB。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white">
              选择图片
            </button>
            <button type="button" disabled={isUploading || localFiles.length === 0} onClick={() => void uploadFiles()} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">
              {isUploading ? "上传中" : "逐张上传并加入任务"}
            </button>
          </div>
        </div>
        {localFiles.length > 0 ? (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {localFiles.map((item) => (
              <div key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="break-all font-medium text-slate-800">{item.file.name}</span>
                  <span className={item.status === "失败" ? "text-rose-700" : "text-cyan-700"}>{item.status}</span>
                </div>
                <p className="mt-1 text-slate-500">{formatBytes(item.file.size)} {item.error ? `· ${item.error}` : ""}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {task ? (
        <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">任务进度</h2>
              <p className="mt-2 text-sm text-slate-600">批量分析耗时取决于图片数量、模型响应和网络情况。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={isProcessing || task.pendingCount <= 0} onClick={() => void startProcessing()} className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300">
                {task.status === "paused" ? "继续分析" : isProcessing ? "分析中" : "开始分析"}
              </button>
              <button type="button" disabled={!isProcessing && task.status !== "running"} onClick={() => void pauseTask()} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">
                暂停
              </button>
              <button type="button" onClick={() => setShowFailedOnly((value) => !value)} className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700">
                {showFailedOnly ? "查看全部" : "只看失败项"}
              </button>
            </div>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-cyan-600 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-6">
            <div className="rounded-md bg-slate-50 p-3">总数：{task.totalCount}</div>
            <div className="rounded-md bg-emerald-50 p-3 text-emerald-700">成功：{task.successCount}</div>
            <div className="rounded-md bg-rose-50 p-3 text-rose-700">失败：{task.failedCount}</div>
            <div className="rounded-md bg-amber-50 p-3 text-amber-700">待处理：{task.pendingCount}</div>
            <div className="rounded-md bg-cyan-50 p-3 text-cyan-700">处理中：{task.processingCount}</div>
            <div className="rounded-md bg-slate-50 p-3">进度：{progress}%</div>
          </div>
        </section>
      ) : null}

      {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      {task ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {visibleItems.length > 0 ? visibleItems.map((item) => (
            <article key={item.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              {item.imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imagePreviewUrl} alt={item.originalName} className="h-44 w-full rounded-md object-cover" />
              ) : (
                <div className="flex h-44 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500">无预览</div>
              )}
              <div className="mt-4 flex items-start justify-between gap-3">
                <h3 className="break-all text-sm font-semibold text-slate-950">{item.originalName}</h3>
                <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${itemBadgeClass(item.status)}`}>{statusLabel(item.status)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{item.mimeType ?? "未知格式"} · {formatBytes(item.size)}</p>
              {item.errorMessage ? (
                <div className="mt-3 rounded-md bg-rose-50 p-2 text-xs text-rose-700">
                  <p className="font-medium">失败原因：{item.errorMessage}</p>
                  {failureAdvice(item.errorMessage) ? <p className="mt-1 text-rose-600">建议操作：{failureAdvice(item.errorMessage)}</p> : null}
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {item.analysisId ? (
                  <Link href={`/library/${item.analysisId}`} className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                    查看分析
                  </Link>
                ) : null}
                {item.status === "failed" ? (
                  <button type="button" onClick={() => void retryItem(item.id)} className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-700">
                    重试
                  </button>
                ) : null}
              </div>
            </article>
          )) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-8 text-center lg:col-span-3">
              <p className="text-sm text-slate-500">当前任务还没有图片，请先选择并逐张上传。</p>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
