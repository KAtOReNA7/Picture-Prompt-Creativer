"use client";

import { useEffect, useState } from "react";

type MaintenanceStatus = {
  ok: boolean;
  database: {
    connected: boolean;
    counts: Record<string, number>;
    warnings?: string[];
  };
  storage: {
    uploadsDirExists: boolean;
    generatedDirExists: boolean;
    exportsDirExists: boolean;
    backupsDirExists: boolean;
    uploadsSizeMB: number;
    generatedSizeMB: number;
    exportsSizeMB: number;
    backupsSizeMB: number;
  };
  ai: {
    hasApiKey: boolean;
    maskedApiKey?: string;
    baseURL: string;
    modelsEndpointReachable: boolean;
  };
};

type BackupItem = {
  filename: string;
  sizeMB: number;
  createdAt: string;
  downloadUrl: string;
};

type OrphanReport = {
  orphanFiles: Array<{ type: string; filename: string }>;
  missingFiles: Array<{ type: string; id: string; filename: string }>;
  exportFiles: BackupItem[];
  backupFiles: BackupItem[];
};

type AppLog = {
  time: string;
  level: string;
  scope: string;
  message: string;
  safeDetail?: string;
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"}>{label}</span>;
}

export function MaintenanceDashboard() {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [orphans, setOrphans] = useState<OrphanReport | null>(null);
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [statusRes, backupsRes, orphansRes, logsRes] = await Promise.all([
        fetch("/api/maintenance/status"),
        fetch("/api/maintenance/backups"),
        fetch("/api/maintenance/orphans"),
        fetch("/api/maintenance/logs"),
      ]);
      const statusData = await statusRes.json();
      const backupsData = await backupsRes.json();
      const orphansData = await orphansRes.json();
      const logsData = await logsRes.json();
      setStatus(statusData);
      setBackups(backupsData.backups ?? []);
      setOrphans(orphansData.ok ? orphansData : null);
      setLogs(logsData.logs ?? []);
    } catch {
      setError("加载运维状态失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAll();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createBackup() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/maintenance/backup", { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "创建备份失败");
      setMessage(`备份已生成：${data.backup.filename}`);
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "创建备份失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function dryRunCleanup() {
    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/maintenance/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olderThanDays: 30 }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? "清理检查失败");
      setMessage(`默认清理验证完成：未删除任何文件，待删除数量 ${data.deletedCount}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "清理检查失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={isLoading} onClick={loadAll} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
          刷新状态
        </button>
        {message ? <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</span> : null}
        {error ? <span className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</span> : null}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">数据库状态</h2>
          {status ? (
            <>
              <div className="mt-3"><StatusBadge ok={status.database.connected} label={status.database.connected ? "已连接" : "连接异常"} /></div>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                {Object.entries(status.database.counts).map(([key, value]) => (
                  <div key={key} className="rounded-md bg-slate-50 p-3">
                    <span className="font-medium text-slate-700">{key}</span>
                    <span className="ml-2 text-slate-500">{value}</span>
                  </div>
                ))}
              </div>
              {status.database.warnings?.length ? <p className="mt-3 text-sm text-amber-700">{status.database.warnings.join("；")}</p> : null}
            </>
          ) : <p className="mt-3 text-sm text-slate-500">正在加载...</p>}
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">文件存储状态</h2>
          {status ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-3"><span>uploads/images</span><span>{status.storage.uploadsSizeMB} MB</span></div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-3"><span>uploads/generated</span><span>{status.storage.generatedSizeMB} MB</span></div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-3"><span>exports</span><span>{status.storage.exportsSizeMB} MB</span></div>
              <div className="flex items-center justify-between rounded-md bg-slate-50 p-3"><span>backups</span><span>{status.storage.backupsSizeMB} MB</span></div>
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">正在加载...</p>}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">备份与恢复</h2>
            <button type="button" disabled={isLoading} onClick={createBackup} className="rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">创建备份</button>
          </div>
          <div className="mt-4 grid gap-2">
            {backups.length > 0 ? backups.slice(0, 8).map((backup) => (
              <a key={backup.filename} href={backup.downloadUrl} className="rounded-md bg-slate-50 p-3 text-sm text-cyan-700 hover:underline">
                {backup.filename}（{backup.sizeMB} MB）
              </a>
            )) : <p className="text-sm text-slate-500">暂无备份</p>}
          </div>
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">API 配置检查</h2>
          {status ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-md bg-slate-50 p-3">API Key：{status.ai.hasApiKey ? `已配置（${status.ai.maskedApiKey ?? "已掩码"}）` : "未配置"}</div>
              <div className="rounded-md bg-slate-50 p-3">Base URL：{status.ai.baseURL}</div>
              <div className="rounded-md bg-slate-50 p-3">/models：{status.ai.modelsEndpointReachable ? "可访问" : "不可访问"}</div>
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">正在加载...</p>}
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">孤儿文件检查</h2>
          {orphans ? (
            <div className="mt-4 grid gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-3">孤儿文件：{orphans.orphanFiles.length}</div>
              <div className="rounded-md bg-slate-50 p-3">缺失文件记录：{orphans.missingFiles.length}</div>
              <div className="rounded-md bg-slate-50 p-3">导出文件：{orphans.exportFiles.length}</div>
              <div className="rounded-md bg-slate-50 p-3">备份文件：{orphans.backupFiles.length}</div>
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">正在加载...</p>}
        </article>

        <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-950">安全清理</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">默认验证不会删除任何文件。真正删除必须在接口中显式传入 true，前端保留二次确认边界。</p>
          <button type="button" disabled={isLoading} onClick={dryRunCleanup} className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-60">
            验证默认不删除
          </button>
        </article>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950">最近错误记录</h2>
        <div className="mt-4 grid gap-2">
          {logs.length > 0 ? logs.slice(0, 100).map((log, index) => (
            <div key={`${log.time}-${index}`} className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap gap-2 font-medium text-slate-900">
                <span>{log.time}</span>
                <span>{log.level}</span>
                <span>{log.scope}</span>
              </div>
              <p className="mt-1 text-slate-600">{log.message}</p>
              {log.safeDetail ? <p className="mt-1 break-all text-xs text-slate-500">{log.safeDetail}</p> : null}
            </div>
          )) : <p className="text-sm text-slate-500">暂无错误日志</p>}
        </div>
      </section>
    </div>
  );
}
