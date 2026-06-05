export type PromptFusionInputSegment = {
  type: string;
  label: string;
  content: string;
  isReplaceable: boolean;
  replaceHint: string | null;
  sortOrder: number;
};

export type PromptFusionInput = {
  userRequirement: string;
  title: string | null;
  styleSummary: string | null;
  visualSubject: string | null;
  composition: string | null;
  colorPalette: string | null;
  lighting: string | null;
  texture: string | null;
  eraFeeling: string | null;
  topicPotential: string | null;
  reversePrompt: string;
  negativePrompt: string | null;
  segments: PromptFusionInputSegment[];
};

export type PromptFusionResult = {
  title: string;
  finalPromptEnglish: string;
  negativePromptEnglish: string;
  changeSummary: string;
  preservedElements: string[];
  replacedElements: string[];
  usageAdvice: string;
  riskNotes: string[];
  styleRetentionScore: number;
  requirementMatchScore: number;
  commercialPotentialScore: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`模型返回格式异常：${field} 必须是非空字符串。`);
  }

  return value.trim();
}

function assertStringArray(value: unknown, field: string, minLength: number): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`模型返回格式异常：${field} 必须是数组。`);
  }

  const list = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());

  if (list.length < minLength) {
    throw new Error(`模型返回格式异常：${field} 至少需要 ${minLength} 条。`);
  }

  return list;
}

function assertScore(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`模型返回格式异常：${field} 必须是 1-10 的数字。`);
  }

  const score = Math.round(value);

  if (score < 1 || score > 10) {
    throw new Error(`模型返回格式异常：${field} 必须在 1-10 范围内。`);
  }

  return score;
}

function ensureEnglish(value: string, field: string): string {
  const chineseCount = (value.match(/[\u4e00-\u9fa5]/g) ?? []).length;

  if (chineseCount > 0) {
    throw new Error(`模型返回格式异常：${field} 必须是英文。`);
  }

  if (value.split(/\s+/).length < 12) {
    throw new Error(`模型返回格式异常：${field} 必须是完整英文 prompt，不能只列关键词。`);
  }

  return value;
}

export function validatePromptFusionResult(value: unknown): PromptFusionResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  const finalPromptEnglish = ensureEnglish(assertString(value.finalPromptEnglish, "finalPromptEnglish"), "finalPromptEnglish");
  const negativePromptEnglish = ensureEnglish(assertString(value.negativePromptEnglish, "negativePromptEnglish"), "negativePromptEnglish");

  return {
    title: assertString(value.title, "title"),
    finalPromptEnglish,
    negativePromptEnglish,
    changeSummary: assertString(value.changeSummary, "changeSummary"),
    preservedElements: assertStringArray(value.preservedElements, "preservedElements", 3),
    replacedElements: assertStringArray(value.replacedElements, "replacedElements", 2),
    usageAdvice: assertString(value.usageAdvice, "usageAdvice"),
    riskNotes: assertStringArray(value.riskNotes, "riskNotes", 1),
    styleRetentionScore: assertScore(value.styleRetentionScore, "styleRetentionScore"),
    requirementMatchScore: assertScore(value.requirementMatchScore, "requirementMatchScore"),
    commercialPotentialScore: assertScore(value.commercialPotentialScore, "commercialPotentialScore"),
  };
}
