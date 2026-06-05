"use client";

import { useRef, useState } from "react";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";

export type UploadedImage = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  localPath: string;
  publicPath: string | null;
  createdAt?: string;
};

type ImageUploaderProps = {
  onUploaded?: (image: UploadedImage) => void;
};

type UploadResponse =
  | {
      ok: true;
      image: UploadedImage;
    }
  | {
      ok: false;
      error: string;
    };

function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: string | undefined): string {
  if (!value) return "刚刚";

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ImageUploader({ onUploaded }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<UploadedImage | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/images/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.ok) {
        setError(data.ok ? "上传失败" : data.error);
        return;
      }

      setImage(data.image);
      onUploaded?.(data.image);
    } catch {
      setError("上传失败，请检查网络或稍后重试。");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleSelect(files: FileList | null) {
    const file = files?.[0];
    if (file) void uploadFile(file);
  }

  return (
    <section className="rounded-md border border-dashed border-cyan-300 bg-white p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleSelect(event.target.files)}
      />

      <div
        className="flex min-h-72 flex-col items-center justify-center rounded-md bg-cyan-50/40 p-5 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleSelect(event.dataTransfer.files);
        }}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-md bg-cyan-100 text-lg font-semibold text-cyan-700">
          图
        </div>
        <h2 className="text-lg font-semibold text-slate-950">上传参考图片</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
          支持 JPG、PNG、WebP，默认最大 15MB。可以点击选择图片，也可以拖拽图片到这里。
        </p>
        <button
          type="button"
          className="mt-5 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "正在上传" : "选择图片"}
        </button>
      </div>

      {isUploading ? (
        <div className="mt-5">
          <LoadingState title="正在上传图片" description="请稍候，系统正在保存图片文件和数据库记录。" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-5">
          <ErrorState title="上传失败" description={error} actionLabel="重新选择" />
        </div>
      ) : null}

      {image ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
          {image.publicPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.publicPath} alt={image.originalName} className="max-h-80 w-full rounded-md object-contain" />
          ) : null}
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">原文件名</dt>
              <dd className="mt-1 break-all text-slate-600">{image.originalName}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">文件格式</dt>
              <dd className="mt-1 text-slate-600">{image.mimeType}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">文件大小</dt>
              <dd className="mt-1 text-slate-600">{formatBytes(image.size)}</dd>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="font-semibold text-slate-900">上传时间</dt>
              <dd className="mt-1 text-slate-600">{formatDate(image.createdAt)}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
