"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

type MatchedModel = {
  id: string;
  matchedAs: string[];
};

type AiStatus = {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  baseURL: string;
  textModel: string | null;
  visionModel: string | null;
  imageModel: string | null;
  modelsEndpointReachable: boolean;
  availableModelCount: number;
  matchedModels: MatchedModel[];
  warnings: string[];
};

type AiStatusPanelProps = {
  compact?: boolean;
};

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "未配置";
  }

  return String(value);
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-md border px-3 py-1 text-sm font-medium ${
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {label}
    </span>
  );
}

export function AiStatusPanel({ compact = false }: AiStatusPanelProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/ai-status", {
        cache: "no-store",
      });

      if (!response.ok) {
        setError("AI 配置检测失败，请稍后重试。");
        return;
      }

      const data = (await response.json()) as AiStatus;
      setStatus(data);
    } catch {
      setError("无法连接到 AI 配置检测接口。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    fetch("/api/settings/ai-status", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("AI 配置检测失败，请稍后重试。");
        }

        return (await response.json()) as AiStatus;
      })
      .then((data) => {
        if (isActive) {
          setStatus(data);
        }
      })
      .catch(() => {
        if (isActive) {
          setError("无法连接到 AI 配置检测接口。");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingState title="正在检测 AI 配置" description="系统正在读取服务端环境变量并检测 /models 连通性。" />;
  }

  if (error) {
    return <ErrorState title="检测失败" description={error} actionLabel="重新检测" />;
  }

  if (!status) {
    return <EmptyState title="暂无 AI 配置状态" description="还没有获取到配置检测结果。" actionLabel="重新检测" />;
  }

  const rows = [
    ["API Key", status.hasApiKey ? "已配置" : "未配置"],
    ["maskedApiKey", status.maskedApiKey ?? "未配置"],
    ["OPENAI_BASE_URL", status.baseURL],
    ["文本模型", displayValue(status.textModel)],
    ["视觉模型", displayValue(status.visionModel)],
    ["图片模型", displayValue(status.imageModel)],
    ["/models 连通性", status.modelsEndpointReachable ? "正常" : "未连通"],
    ["可用模型数量", status.availableModelCount],
  ];

  return (
    <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">AI 配置检测</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            检测结果来自服务端，前端不会接触或展示完整 API Key。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={status.hasApiKey} label={status.hasApiKey ? "API Key 已配置" : "API Key 未配置"} />
          <StatusBadge
            ok={status.modelsEndpointReachable}
            label={status.modelsEndpointReachable ? "/models 正常" : "/models 未连通"}
          />
          <button
            type="button"
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
            onClick={() => void loadStatus()}
          >
            重新检测
          </button>
        </div>
      </div>

      <div className={`mt-6 grid gap-3 ${compact ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-md bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="mt-2 break-all text-sm leading-6 text-slate-600">{displayValue(value)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h3 className="text-base font-semibold text-slate-950">匹配到的目标模型</h3>
        {status.matchedModels.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {status.matchedModels.map((model) => (
              <div key={model.id} className="rounded-md border border-cyan-100 bg-cyan-50 p-4">
                <p className="break-all text-sm font-semibold text-cyan-900">{model.id}</p>
                <p className="mt-1 text-sm text-cyan-700">匹配用途：{model.matchedAs.join("、")}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-md bg-slate-50 p-4 text-sm text-slate-600">暂未匹配到目标模型。</p>
        )}
      </div>

      {status.warnings.length > 0 ? (
        <div className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-base font-semibold text-amber-950">中文 warning</h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-800">
            {status.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          未发现配置 warning。
        </p>
      )}
    </section>
  );
}
