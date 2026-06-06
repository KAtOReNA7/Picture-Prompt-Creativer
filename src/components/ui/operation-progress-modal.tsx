"use client";

export type OperationProgressStatus = "idle" | "running" | "success" | "failed";

export type OperationProgressModalState = {
  visible: boolean;
  title: string;
  stepLabel: string;
  percent: number;
  status: OperationProgressStatus;
  message?: string;
};

type OperationProgressModalProps = OperationProgressModalState & {
  onClose: () => void;
};

function statusLabel(status: OperationProgressStatus): string {
  if (status === "success") return "已完成";
  if (status === "failed") return "操作失败";
  if (status === "running") return "进行中";
  return "等待中";
}

function statusClassName(status: OperationProgressStatus): string {
  if (status === "success") return "bg-emerald-50 text-emerald-700";
  if (status === "failed") return "bg-rose-50 text-rose-700";
  return "bg-cyan-50 text-cyan-700";
}

function barClassName(status: OperationProgressStatus): string {
  if (status === "success") return "bg-emerald-500";
  if (status === "failed") return "bg-rose-500";
  return "bg-cyan-500";
}

export function OperationProgressModal({
  visible,
  title,
  stepLabel,
  percent,
  status,
  message,
  onClose,
}: OperationProgressModalProps) {
  if (!visible || status === "idle") return null;

  const normalizedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-slate-950/30" aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className="relative w-full max-w-lg rounded-md border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-lg font-semibold text-slate-950">{title}</h2>
              <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClassName(status)}`}>{statusLabel(status)}</span>
            </div>
            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{message ?? stepLabel}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={onClose}
          >
            关闭
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="break-words font-medium text-slate-900">当前步骤：{stepLabel}</span>
            <span className="shrink-0 font-semibold text-slate-950">{normalizedPercent}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barClassName(status)}`}
              style={{ width: `${normalizedPercent}%` }}
            />
          </div>
        </div>

        <p className="mt-4 break-words rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          此为预估进度，实际耗时取决于模型响应和网络情况。
        </p>
        {status === "running" ? (
          <p className="mt-3 text-xs leading-5 text-slate-500">关闭弹窗只会隐藏提示，不会取消当前请求。</p>
        ) : null}
      </section>
    </div>
  );
}
