"use client";

import { useState } from "react";

type CopyButtonProps = {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyButton({ text, label = "一键复制", copiedLabel = "已复制", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setError(false);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(true);
      setCopied(false);
      window.setTimeout(() => setError(false), 1800);
    }
  }

  return (
    <button
      type="button"
      className={
        className ??
        "rounded-md border border-cyan-200 bg-white px-3 py-2 text-sm font-medium text-cyan-700 transition hover:bg-cyan-50"
      }
      onClick={() => void copy()}
    >
      {error ? "复制失败" : copied ? copiedLabel : label}
    </button>
  );
}
