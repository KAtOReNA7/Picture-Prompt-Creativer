import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { appLog } from "@/lib/logging/app-logger";

const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function getMaxUploadBytes(mode: string | null): number {
  const envName = mode === "batch_analysis" ? "BATCH_MAX_UPLOAD_MB" : "MAX_UPLOAD_MB";
  const fallback = mode === "batch_analysis" ? 40 : 15;
  const value = Number.parseInt(process.env[envName] || String(fallback), 10);
  const maxMb = Number.isFinite(value) && value > 0 ? value : fallback;
  return maxMb * 1024 * 1024;
}

function jsonError(message: string, status = 400): Response {
  return Response.json({ ok: false, error: message }, { status });
}

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("保存失败：请求格式不是有效的 multipart/form-data。");
  }

  const file = formData.get("file");
  const mode = typeof formData.get("mode") === "string" ? String(formData.get("mode")) : null;

  if (!(file instanceof File)) {
    return jsonError("未上传文件");
  }

  const extension = allowedTypes.get(file.type);

  if (!extension) {
    return jsonError("文件类型不支持");
  }

  const maxBytes = getMaxUploadBytes(mode);

  if (file.size > maxBytes) {
    return jsonError(`文件过大，当前最大允许 ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }

  const filename = `${randomUUID()}.${extension}`;
  const uploadDir = path.join(process.cwd(), "uploads", "images");
  const localPath = path.join(uploadDir, filename);

  try {
    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(localPath, buffer);
  } catch (error) {
    await appLog({ level: "error", scope: "images.upload.save", message: "上传图片保存失败", safeDetail: error });
    return jsonError("保存失败", 500);
  }

  try {
    const image = await prisma.imageAsset.create({
      data: {
        filename,
        originalName: file.name || filename,
        mimeType: file.type,
        size: file.size,
        localPath,
      },
    });
    const publicPath = `/api/images/${image.id}/file`;
    const updatedImage = await prisma.imageAsset.update({
      where: { id: image.id },
      data: { publicPath },
      select: {
        id: true,
        filename: true,
        originalName: true,
        mimeType: true,
        size: true,
        localPath: true,
        publicPath: true,
        createdAt: true,
      },
    });

    return Response.json({
      ok: true,
      image: {
        ...updatedImage,
        createdAt: updatedImage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    await appLog({ level: "error", scope: "images.upload.db", message: "上传图片数据库写入失败", safeDetail: error });
    return jsonError("数据库写入失败", 500);
  }
}
