export type GeneratedImageEvaluationResult = {
  overallScore: number;
  promptMatchScore: number;
  styleRetentionScore: number;
  requirementMatchScore: number;
  compositionScore: number;
  colorScore: number;
  lightingScore: number;
  subjectScore: number;
  commercialPotentialScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  improvementAdvice: string[];
  improvedPrompt: string;
  improvedNegativePrompt: string;
};

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("模型返回格式异常：结果必须是 JSON 对象");
  }

  return value as Record<string, unknown>;
}

function numberScore(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`模型返回格式异常：${field} 必须是数字`);
  }

  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 10) {
    throw new Error(`模型返回格式异常：${field} 必须在 1-10 之间`);
  }

  return rounded;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`模型返回格式异常：${field} 不能为空`);
  }

  return value.trim();
}

function stringArray(value: unknown, field: string, minLength: number): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`模型返回格式异常：${field} 必须是数组`);
  }

  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  if (items.length < minLength) {
    throw new Error(`模型返回格式异常：${field} 至少需要 ${minLength} 条`);
  }

  return items;
}

function looksEnglish(text: string): boolean {
  const chineseChars = (text.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinWords = (text.match(/[A-Za-z][A-Za-z'-]*/g) ?? []).length;
  return latinWords >= 8 && chineseChars <= Math.max(3, text.length * 0.05);
}

export function validateGeneratedImageEvaluationResult(value: unknown): GeneratedImageEvaluationResult {
  const object = asObject(value);
  const improvedPrompt = requiredString(object.improvedPrompt, "improvedPrompt");
  const improvedNegativePrompt = requiredString(object.improvedNegativePrompt, "improvedNegativePrompt");

  if (!looksEnglish(improvedPrompt)) {
    throw new Error("模型返回格式异常：improvedPrompt 必须是完整英文 prompt");
  }

  if (!looksEnglish(improvedNegativePrompt)) {
    throw new Error("模型返回格式异常：improvedNegativePrompt 必须是英文");
  }

  return {
    overallScore: numberScore(object.overallScore, "overallScore"),
    promptMatchScore: numberScore(object.promptMatchScore, "promptMatchScore"),
    styleRetentionScore: numberScore(object.styleRetentionScore, "styleRetentionScore"),
    requirementMatchScore: numberScore(object.requirementMatchScore, "requirementMatchScore"),
    compositionScore: numberScore(object.compositionScore, "compositionScore"),
    colorScore: numberScore(object.colorScore, "colorScore"),
    lightingScore: numberScore(object.lightingScore, "lightingScore"),
    subjectScore: numberScore(object.subjectScore, "subjectScore"),
    commercialPotentialScore: numberScore(object.commercialPotentialScore, "commercialPotentialScore"),
    summary: requiredString(object.summary, "summary"),
    strengths: stringArray(object.strengths, "strengths", 2),
    weaknesses: stringArray(object.weaknesses, "weaknesses", 1),
    improvementAdvice: stringArray(object.improvementAdvice, "improvementAdvice", 2),
    improvedPrompt,
    improvedNegativePrompt,
  };
}
