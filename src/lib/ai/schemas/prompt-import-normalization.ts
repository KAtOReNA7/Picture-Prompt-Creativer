export type PromptImportMode = "semantic_preserve" | "semantic" | "direct";
export type PromptImportLanguage = "zh" | "en" | "mixed" | "unknown";

export type PromptImportNormalizationInput = {
  title?: string;
  rawPrompt: string;
  negativePrompt?: string;
  imageId?: string;
  tags: string[];
  importMode: PromptImportMode;
};

export type PromptImportNormalizationResult = {
  title: string;
  detectedLanguage: PromptImportLanguage;
  styleSummary: string;
  visualSubject: string | null;
  composition: string | null;
  colorPalette: string | null;
  lighting: string | null;
  texture: string | null;
  eraFeeling: string | null;
  topicPotential: string | null;
  tags: string[];
  analysisNotes: string | null;
};

const LANGUAGES: PromptImportLanguage[] = ["zh", "en", "mixed", "unknown"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`模型返回格式异常：${field} 必须是非空字符串。`);
  }

  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function assertLanguage(value: unknown): PromptImportLanguage {
  const language = requiredString(value, "detectedLanguage");

  if (!LANGUAGES.includes(language as PromptImportLanguage)) {
    throw new Error("模型返回格式异常：detectedLanguage 只能是 zh、en、mixed 或 unknown。");
  }

  return language as PromptImportLanguage;
}

function parseTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("模型返回格式异常：tags 必须是数组。");
  }

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index)
    .slice(0, 10);
}

export function validatePromptImportNormalizationResult(value: unknown): PromptImportNormalizationResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  return {
    title: requiredString(value.title, "title"),
    detectedLanguage: assertLanguage(value.detectedLanguage),
    styleSummary: requiredString(value.styleSummary, "styleSummary"),
    visualSubject: optionalString(value.visualSubject),
    composition: optionalString(value.composition),
    colorPalette: optionalString(value.colorPalette),
    lighting: optionalString(value.lighting),
    texture: optionalString(value.texture),
    eraFeeling: optionalString(value.eraFeeling),
    topicPotential: optionalString(value.topicPotential),
    tags: parseTags(value.tags),
    analysisNotes: optionalString(value.analysisNotes),
  };
}

export function detectPromptLanguage(text: string): PromptImportLanguage {
  const hasChinese = /[\u3400-\u9fff]/.test(text);
  const hasEnglish = /[A-Za-z]/.test(text);

  if (hasChinese && hasEnglish) return "mixed";
  if (hasChinese) return "zh";
  if (hasEnglish) return "en";
  return "unknown";
}
