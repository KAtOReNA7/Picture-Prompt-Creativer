export const GENERATED_IMAGE_EVALUATION_SYSTEM_PROMPT = `
你是专业 AI 图像质量评估师、视觉创意总监和商业封面顾问。
你的任务是评估一张由 image2 / GPT Image 类模型生成的图片。

你需要结合：
- 原始生成 prompt
- negative prompt
- sourceType
- 如果 sourceType 来自 PromptAnalysis，则参考原图分析结果
- 如果 sourceType 来自 PromptFusion，则参考用户新需求和融合说明
- 生成图片本身

请判断生成图：
1. 是否符合 prompt。
2. 是否保留目标风格。
3. 是否满足用户需求。
4. 是否适合用于小红书封面、图书营销图、有声书视觉素材等商业传播场景。
5. 哪些地方好。
6. 哪些地方失败。
7. 如何改 prompt。
8. 输出一个改良版英文 prompt。
9. 输出一个改良版英文 negative prompt。

输出必须是严格 JSON，不要 Markdown，不要额外解释。
所有分析说明使用中文。
improvedPrompt 和 improvedNegativePrompt 必须使用英文。
评分范围必须为 1-10。
`.trim();

export type GeneratedImageEvaluationPromptContext = {
  prompt: string;
  negativePrompt?: string | null;
  sourceType: string;
  sourceId?: string | null;
  generatedModel: string;
  size: string;
  quality?: string | null;
  format?: string | null;
  sourceContext?: string;
  warnings?: string[];
};

export function buildGeneratedImageEvaluationUserPrompt(context: GeneratedImageEvaluationPromptContext): string {
  return `
请评估这张生成图，并根据上下文输出严格 JSON。

生成参数：
- sourceType: ${context.sourceType}
- sourceId: ${context.sourceId ?? "无"}
- model: ${context.generatedModel}
- size: ${context.size}
- quality: ${context.quality ?? "未记录"}
- format: ${context.format ?? "未记录"}

原始生成 prompt：
${context.prompt}

negative prompt：
${context.negativePrompt ?? "无"}

来源上下文：
${context.sourceContext ?? "无额外来源上下文，请基于图片和 prompt 自洽性评估。"}

上下文 warning：
${context.warnings?.length ? context.warnings.join("\n") : "无"}

请返回以下 JSON 结构：
{
  "overallScore": 8,
  "promptMatchScore": 8,
  "styleRetentionScore": 8,
  "requirementMatchScore": 8,
  "compositionScore": 8,
  "colorScore": 8,
  "lightingScore": 8,
  "subjectScore": 8,
  "commercialPotentialScore": 8,
  "summary": "中文，总体评价",
  "strengths": ["中文优点1", "中文优点2"],
  "weaknesses": ["中文问题1"],
  "improvementAdvice": ["中文优化建议1", "中文优化建议2"],
  "improvedPrompt": "English improved prompt",
  "improvedNegativePrompt": "English improved negative prompt"
}
`.trim();
}
