export type PromptImportMode = "semantic" | "direct";
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
  visualSubject: string;
  composition: string;
  colorPalette: string;
  lighting: string;
  texture: string;
  eraFeeling: string;
  topicPotential: string;
  reversePromptEnglish: string;
  negativePromptEnglish: string;
  tags: string[];
  normalizationNotes: string;
};

const LANGUAGES: PromptImportLanguage[] = ["zh", "en", "mixed", "unknown"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`模型返回格式异常：${field} 必须是非空字符串。`);
  }

  return value.trim();
}

export function isEnglishImagePrompt(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  if (/[\u3400-\u9fff]/.test(text)) return false;

  const latinChars = (text.match(/[A-Za-z]/g) ?? []).length;
  const nonSpaceChars = text.replace(/\s/g, "").length;
  const latinWords = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];

  if (latinWords.length < 3) return false;
  return nonSpaceChars > 0 && latinChars / nonSpaceChars >= 0.45;
}

function assertEnglish(value: unknown, field: string): string {
  const text = assertString(value, field);

  if (!isEnglishImagePrompt(text)) {
    throw new Error(`模型返回格式异常：${field} 必须是英文。`);
  }

  return text;
}

function assertLanguage(value: unknown): PromptImportLanguage {
  const language = assertString(value, "detectedLanguage");

  if (!LANGUAGES.includes(language as PromptImportLanguage)) {
    throw new Error("模型返回格式异常：detectedLanguage 只能是 zh、en、mixed 或 unknown。");
  }

  return language as PromptImportLanguage;
}

function assertTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("模型返回格式异常：tags 必须是数组。");
  }

  const tags = value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean)
    .filter((tag, index, list) => list.indexOf(tag) === index);

  if (tags.length < 5 || tags.length > 10) {
    throw new Error("模型返回格式异常：tags 必须包含 5 到 10 个中文标签。");
  }

  return tags;
}

export function validatePromptImportNormalizationResult(
  value: unknown,
  options: { validateEnglish?: boolean } = {},
): PromptImportNormalizationResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  return {
    title: assertString(value.title, "title"),
    detectedLanguage: assertLanguage(value.detectedLanguage),
    styleSummary: assertString(value.styleSummary, "styleSummary"),
    visualSubject: assertString(value.visualSubject, "visualSubject"),
    composition: assertString(value.composition, "composition"),
    colorPalette: assertString(value.colorPalette, "colorPalette"),
    lighting: assertString(value.lighting, "lighting"),
    texture: assertString(value.texture, "texture"),
    eraFeeling: assertString(value.eraFeeling, "eraFeeling"),
    topicPotential: assertString(value.topicPotential, "topicPotential"),
    reversePromptEnglish:
      options.validateEnglish === false
        ? assertString(value.reversePromptEnglish, "reversePromptEnglish")
        : assertEnglish(value.reversePromptEnglish, "reversePromptEnglish"),
    negativePromptEnglish:
      options.validateEnglish === false
        ? assertString(value.negativePromptEnglish, "negativePromptEnglish")
        : assertEnglish(value.negativePromptEnglish, "negativePromptEnglish"),
    tags: assertTags(value.tags),
    normalizationNotes: assertString(value.normalizationNotes, "normalizationNotes"),
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
