import { isEnglishImagePrompt } from "@/lib/ai/schemas/prompt-import-normalization";

export type PromptEnglishRepairResult = {
  repairedPromptEnglish: string;
  repairedNegativePromptEnglish: string;
  repairNotes: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`模型返回格式异常：${field} 必须是非空字符串。`);
  }

  return value.trim();
}

function optionalEnglish(value: unknown, field: string): string {
  if (value === undefined || value === null) return "";
  const text = stringField(value, field);

  if (!isEnglishImagePrompt(text)) {
    throw new Error(`模型返回格式异常：${field} 必须是英文。`);
  }

  return text;
}

export function validatePromptEnglishRepairResult(value: unknown): PromptEnglishRepairResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  const repairedPromptEnglish = stringField(value.repairedPromptEnglish, "repairedPromptEnglish");

  if (!isEnglishImagePrompt(repairedPromptEnglish)) {
    throw new Error("模型返回格式异常：repairedPromptEnglish 必须是英文。");
  }

  return {
    repairedPromptEnglish,
    repairedNegativePromptEnglish: optionalEnglish(value.repairedNegativePromptEnglish, "repairedNegativePromptEnglish"),
    repairNotes: typeof value.repairNotes === "string" ? value.repairNotes.trim() : "",
  };
}
