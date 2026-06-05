export const PROMPT_SEGMENT_TYPES = [
  "subject",
  "scene",
  "composition",
  "style",
  "color",
  "lighting",
  "camera",
  "texture",
  "mood",
  "text_area",
  "negative",
] as const;

export type PromptSegmentType = (typeof PROMPT_SEGMENT_TYPES)[number];

export type PromptSegmentationInput = {
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
};

export type PromptSegmentationSegment = {
  type: PromptSegmentType;
  label: string;
  content: string;
  isReplaceable: boolean;
  replaceHint: string;
  sortOrder: number;
};

export type PromptSegmentationResult = {
  segments: PromptSegmentationSegment[];
  templateSummary: string;
  replacementStrategy: string;
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

function assertBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`模型返回格式异常：${field} 必须是布尔值。`);
  }

  return value;
}

function assertSortOrder(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 11) {
    throw new Error("模型返回格式异常：sortOrder 必须是 1 到 11 的整数。");
  }

  return value;
}

function assertSegmentType(value: unknown): PromptSegmentType {
  const type = assertString(value, "type");

  if (!PROMPT_SEGMENT_TYPES.includes(type as PromptSegmentType)) {
    throw new Error(`模型返回格式异常：不支持的 segment type：${type}。`);
  }

  return type as PromptSegmentType;
}

function ensureEnglishContent(value: string, type: string): string {
  const chineseCount = (value.match(/[\u4e00-\u9fa5]/g) ?? []).length;

  if (chineseCount > 0) {
    throw new Error(`模型返回格式异常：${type} 模块 content 必须保留英文 prompt 片段。`);
  }

  return value;
}

export function validatePromptSegmentationResult(value: unknown): PromptSegmentationResult {
  if (!isRecord(value)) {
    throw new Error("模型返回格式异常：根节点必须是 JSON 对象。");
  }

  const rawSegments = value.segments;

  if (!Array.isArray(rawSegments)) {
    throw new Error("模型返回格式异常：segments 必须是数组。");
  }

  const segments = rawSegments.map((item) => {
    if (!isRecord(item)) {
      throw new Error("模型返回格式异常：segments 中存在无效对象。");
    }

    const type = assertSegmentType(item.type);

    return {
      type,
      label: assertString(item.label, "label"),
      content: ensureEnglishContent(assertString(item.content, "content"), type),
      isReplaceable: assertBoolean(item.isReplaceable, "isReplaceable"),
      replaceHint: assertString(item.replaceHint, "replaceHint"),
      sortOrder: assertSortOrder(item.sortOrder),
    };
  });

  const typeSet = new Set(segments.map((item) => item.type));
  const missingTypes = PROMPT_SEGMENT_TYPES.filter((type) => !typeSet.has(type));

  if (missingTypes.length > 0) {
    throw new Error(`模型返回格式异常：segments 缺少必要 type：${missingTypes.join("、")}。`);
  }

  if (segments.length !== PROMPT_SEGMENT_TYPES.length) {
    throw new Error("模型返回格式异常：segments 必须包含 11 个模块。");
  }

  const orderSet = new Set(segments.map((item) => item.sortOrder));

  if (orderSet.size !== PROMPT_SEGMENT_TYPES.length) {
    throw new Error("模型返回格式异常：sortOrder 必须从 1 到 11 且不能重复。");
  }

  return {
    segments: segments.sort((a, b) => a.sortOrder - b.sortOrder),
    templateSummary: assertString(value.templateSummary, "templateSummary"),
    replacementStrategy: assertString(value.replacementStrategy, "replacementStrategy"),
  };
}
