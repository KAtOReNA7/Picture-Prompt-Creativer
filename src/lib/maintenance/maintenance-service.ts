import "server-only";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { getAiConfig } from "@/lib/ai/models";
import { prisma } from "@/lib/db/prisma";
import { appLog } from "@/lib/logging/app-logger";

const ROOT = /* turbopackIgnore: true */ process.cwd();
export const DIRS = {
  uploads: path.join(ROOT, "uploads"),
  uploadImages: path.join(ROOT, "uploads", "images"),
  generated: path.join(ROOT, "uploads", "generated"),
  exports: path.join(ROOT, "exports"),
  backups: path.join(ROOT, "backups"),
  logs: path.join(ROOT, "logs"),
  prismaDb: path.join(ROOT, "prisma", "dev.db"),
  docs: path.join(ROOT, "docs"),
};

export type FileEntry = {
  filename: string;
  sizeMB: number;
  createdAt: string;
};

function toMB(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(3));
}

export async function exists(pathname: string): Promise<boolean> {
  try {
    await stat(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function dirSizeBytes(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let total = 0;
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await dirSizeBytes(fullPath);
      } else if (entry.isFile()) {
        total += (await stat(fullPath)).size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export async function listFiles(dir: string): Promise<FileEntry[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const fullPath = path.join(dir, entry.name);
          const fileStat = await stat(fullPath);
          return {
            filename: entry.name,
            sizeMB: toMB(fileStat.size),
            createdAt: fileStat.birthtime.toISOString(),
          };
        }),
    );
    return files.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function getMaintenanceStatus() {
  const aiConfig = getAiConfig();
  let modelsEndpointReachable = false;
  const warnings: string[] = [];

  if (aiConfig.baseURL) {
    try {
      const response = await fetch(`${aiConfig.baseURL.replace(/\/$/, "")}/models`, {
        headers: aiConfig.hasApiKey ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      modelsEndpointReachable = response.ok;
      if (!response.ok) warnings.push(`/models 返回 HTTP ${response.status}`);
    } catch (error) {
      warnings.push("OpenAI /models 连通性检查失败");
      await appLog({ level: "warn", scope: "maintenance.status", message: "AI 配置检查失败", safeDetail: error });
    }
  }

  try {
    const [images, analyses, segments, fusions, generatedImages, evaluations, variants, tags, collections] = await Promise.all([
      prisma.imageAsset.count(),
      prisma.promptAnalysis.count(),
      prisma.promptSegment.count(),
      prisma.promptFusion.count(),
      prisma.generatedImage.count(),
      prisma.generatedImageEvaluation.count(),
      prisma.promptVariant.count(),
      prisma.tag.count(),
      prisma.collection.count(),
    ]);

    return {
      ok: true,
      database: {
        connected: true,
        counts: { images, analyses, segments, fusions, generatedImages, evaluations, variants, tags, collections },
        warnings,
      },
      storage: {
        uploadsDirExists: await exists(DIRS.uploads),
        generatedDirExists: await exists(DIRS.generated),
        exportsDirExists: await exists(DIRS.exports),
        backupsDirExists: await exists(DIRS.backups),
        uploadsSizeMB: toMB(await dirSizeBytes(DIRS.uploadImages)),
        generatedSizeMB: toMB(await dirSizeBytes(DIRS.generated)),
        exportsSizeMB: toMB(await dirSizeBytes(DIRS.exports)),
        backupsSizeMB: toMB(await dirSizeBytes(DIRS.backups)),
      },
      ai: {
        hasApiKey: aiConfig.hasApiKey,
        maskedApiKey: aiConfig.maskedApiKey,
        baseURL: aiConfig.baseURL,
        modelsEndpointReachable,
      },
    };
  } catch (error) {
    await appLog({ level: "error", scope: "maintenance.status", message: "数据库状态检查失败", safeDetail: error });
    return {
      ok: true,
      database: {
        connected: false,
        counts: { images: 0, analyses: 0, segments: 0, fusions: 0, generatedImages: 0, evaluations: 0, variants: 0, tags: 0, collections: 0 },
        warnings: ["数据库连接异常，请检查 prisma/dev.db 是否存在。"],
      },
      storage: {
        uploadsDirExists: await exists(DIRS.uploads),
        generatedDirExists: await exists(DIRS.generated),
        exportsDirExists: await exists(DIRS.exports),
        backupsDirExists: await exists(DIRS.backups),
        uploadsSizeMB: toMB(await dirSizeBytes(DIRS.uploadImages)),
        generatedSizeMB: toMB(await dirSizeBytes(DIRS.generated)),
        exportsSizeMB: toMB(await dirSizeBytes(DIRS.exports)),
        backupsSizeMB: toMB(await dirSizeBytes(DIRS.backups)),
      },
      ai: {
        hasApiKey: aiConfig.hasApiKey,
        maskedApiKey: aiConfig.maskedApiKey,
        baseURL: aiConfig.baseURL,
        modelsEndpointReachable,
      },
    };
  }
}

type ZipWriter = {
  addLocalFolder(dir: string, zipPath: string): void;
  addLocalFile(file: string, zipPath?: string, zipName?: string): void;
  writeZip(target: string): void;
};

function addDirectory(zip: ZipWriter, dir: string, zipPath: string) {
  if (existsSync(dir)) {
    zip.addLocalFolder(dir, zipPath);
  }
}

function addFile(zip: ZipWriter, file: string, zipPath: string) {
  if (existsSync(file)) {
    zip.addLocalFile(file, path.dirname(zipPath), path.basename(zipPath));
  }
}

export async function createBackup() {
  await mkdir(DIRS.backups, { recursive: true });
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  const filename = `backup-${datePart}-${timePart}-${randomUUID().slice(0, 8)}.zip`;
  const fullPath = path.join(DIRS.backups, filename);

  try {
    const { default: AdmZip } = await import("adm-zip");
    const zip = new AdmZip();
    addFile(zip, DIRS.prismaDb, "prisma/dev.db");
    addDirectory(zip, DIRS.uploads, "uploads");
    addDirectory(zip, DIRS.exports, "exports");
    addFile(zip, path.join(ROOT, "docs", "progress.md"), "docs/progress.md");

    if (existsSync(DIRS.docs)) {
      const docs = await readdir(DIRS.docs);
      for (const doc of docs.filter((item) => item.endsWith(".md") && item !== "progress.md")) {
        addFile(zip, path.join(DIRS.docs, doc), `docs/${doc}`);
      }
    }

    zip.writeZip(fullPath);
    const fileStat = await stat(fullPath);
    return {
      filename,
      sizeMB: toMB(fileStat.size),
      downloadUrl: `/api/maintenance/backups/${filename}`,
    };
  } catch (error) {
    await appLog({ level: "error", scope: "maintenance.backup", message: "创建备份失败", safeDetail: error });
    throw new Error("创建备份失败");
  }
}

async function filenamesInDir(dir: string): Promise<Set<string>> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
  } catch {
    return new Set();
  }
}

export async function getOrphanReport() {
  const imageFiles = await filenamesInDir(DIRS.uploadImages);
  const generatedFiles = await filenamesInDir(DIRS.generated);
  const [imageAssets, generatedImages] = await Promise.all([
    prisma.imageAsset.findMany({ select: { id: true, filename: true, localPath: true } }),
    prisma.generatedImage.findMany({ select: { id: true, filename: true, localPath: true } }),
  ]);

  const imageFilenames = new Set(imageAssets.map((item) => item.filename));
  const generatedFilenames = new Set(generatedImages.map((item) => item.filename));
  const orphanFiles = [
    ...[...imageFiles].filter((filename) => !imageFilenames.has(filename)).map((filename) => ({ type: "upload_image", filename })),
    ...[...generatedFiles].filter((filename) => !generatedFilenames.has(filename)).map((filename) => ({ type: "generated_image", filename })),
  ];

  const missingFiles = [];
  for (const image of imageAssets) {
    if (!(await exists(image.localPath))) missingFiles.push({ type: "ImageAsset", id: image.id, filename: image.filename });
  }
  for (const image of generatedImages) {
    if (!(await exists(image.localPath))) missingFiles.push({ type: "GeneratedImage", id: image.id, filename: image.filename });
  }

  return {
    ok: true,
    orphanFiles,
    missingFiles,
    exportFiles: await listFiles(DIRS.exports),
    backupFiles: await listFiles(DIRS.backups),
  };
}

export async function cleanupMaintenance(input: {
  deleteOrphanUploadFiles?: boolean;
  deleteOrphanGeneratedFiles?: boolean;
  deleteOldExports?: boolean;
  deleteOldBackups?: boolean;
  olderThanDays?: number;
}) {
  const olderThanDays = Math.max(1, Number(input.olderThanDays ?? 30));
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const report = await getOrphanReport();
  const deleted: Array<{ type: string; filename: string }> = [];

  async function deleteFileIfOld(dir: string, filename: string, type: string, checkAge: boolean) {
    const fullPath = path.join(dir, filename);
    const fileStat = await stat(fullPath);
    if (!checkAge || fileStat.mtime.getTime() < cutoff) {
      await rm(fullPath, { force: true });
      deleted.push({ type, filename });
    }
  }

  if (input.deleteOrphanUploadFiles) {
    for (const file of report.orphanFiles.filter((item) => item.type === "upload_image")) {
      await deleteFileIfOld(DIRS.uploadImages, file.filename, file.type, false);
    }
  }

  if (input.deleteOrphanGeneratedFiles) {
    for (const file of report.orphanFiles.filter((item) => item.type === "generated_image")) {
      await deleteFileIfOld(DIRS.generated, file.filename, file.type, false);
    }
  }

  if (input.deleteOldExports) {
    for (const file of await listFiles(DIRS.exports)) {
      await deleteFileIfOld(DIRS.exports, file.filename, "export", true);
    }
  }

  if (input.deleteOldBackups) {
    for (const file of await listFiles(DIRS.backups)) {
      await deleteFileIfOld(DIRS.backups, file.filename, "backup", true);
    }
  }

  return {
    ok: true,
    deleted,
    deletedCount: deleted.length,
    dryRun: !input.deleteOrphanUploadFiles && !input.deleteOrphanGeneratedFiles && !input.deleteOldExports && !input.deleteOldBackups,
  };
}

export function resolveBackupFile(filename: string): string {
  if (!/^backup-[a-zA-Z0-9_.-]+\.zip$/.test(filename)) {
    throw new Error("备份文件名不合法");
  }
  return path.join(DIRS.backups, filename);
}
