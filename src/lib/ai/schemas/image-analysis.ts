export type ReplaceableField = {
  field: string;
  currentValue: string;
  replaceHint: string;
};

export type ImageAnalysisResult = {
  title: string;
  imageSummary: string;
  subject: string;
  style: string;
  eraFeeling: string;
  composition: string;
  colorPalette: string;
  lighting: string;
  texture: string;
  mood: string;
  topicPotential: string;
  reversePromptEnglish: string;
  negativePromptEnglish: string;
  replaceableFields: ReplaceableField[];
  tags: string[];
  qualityScore: number;
  commercialPotentialScore: number;
};

const requiredStringFields = [
  "title",
  "imageSummary",
  "subject",
  "style",
  "eraFeeling",
  "composition",
  "colorPalette",
  "lighting",
  "texture",
  "mood",
  "topicPotential",
  "reversePromptEnglish",
  "negativePromptEnglish",
] as const;

const requiredReplaceableFields = ["subject", "scene", "mood", "color", "style_strength"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertStringField(value: Record<string, unknown>, field: string): string {
  const fieldValue = value[field];

  if (typeof fieldValue !== "string" || !fieldValue.trim()) {
    throw new Error(`模型返回格式异常：字段 ${field} 缺失或不是字符串。`);
  }

  return fieldValue.trim();
}

function assertScore(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`模型返回格式异常：字段 ${field} 必须是 1-10 的数字。`);
  }

  const score = Math.round(value);

  if (score < 1 || score > 10) {
    throw new Error(`模型返回格式异常：字段 ${field} 必须在 1-10 范围内。`);
  }

  return score;
}

function validateReplaceableFields(value: unknown): ReplaceableField[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("模型返回格式异常：replaceableFields 必须是非空数组。");
  }

  const fields = value.map((item) => {
    if (!isRecord(item)) {
      throw new Error("模型返回格式异常：replaceableFields 中存在无效对象。");
    }

    return {
      field: assertStringField(item, "field"),
      currentValue: assertStringField(item, "currentValue"),
      replaceHint: assertStringField(item, "replaceHint"),
    };
  });

  const fieldNames = new Set(fields.map((item) => item.field));
  const missing = requiredReplaceableFields.filter((field) => !fieldNames.has(field));

  if (missing.length > 0) {
    throw new Error(`模型返回格式异常：replaceableFields 缺少 ${missing.join("、")}。`);
  }

  return fields;
}

function validateTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("模型返回格式异常：tags 必须是数组。");
  }

  return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
}

function ensureEnglishPrompt(value: string, field: string): string {
  const chineseCharCount = (value.match(/[\u4e00-\u9fa5]/g) ?? []).length;

  if (chineseCharCount > 0) {
    throw new Error(`模型返回格式异常：${field} 必须使用英文。`);
  }

  if (value.split(/\s+/).length < 12) {
    throw new Error(`模型返回格式异常：${field} 必须是完整英文 prompt，不能只列少量关键词。`);
  }

  return value;
}

export function validateImageAnalysisResult(value: unknown): ImageAnalysisResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  const result = Object.fromEntries(requiredStringFields.map((field) => [field, assertStringField(value, field)])) as Pick<
    ImageAnalysisResult,
    (typeof requiredStringFields)[number]
  >;

  return {
    ...result,
    reversePromptEnglish: ensureEnglishPrompt(result.reversePromptEnglish, "reversePromptEnglish"),
    negativePromptEnglish: ensureEnglishPrompt(result.negativePromptEnglish, "negativePromptEnglish"),
    replaceableFields: validateReplaceableFields(value.replaceableFields),
    tags: validateTags(value.tags),
    qualityScore: assertScore(value.qualityScore, "qualityScore"),
    commercialPotentialScore: assertScore(value.commercialPotentialScore, "commercialPotentialScore"),
  };
}
