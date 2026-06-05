import type { PromptSegmentationInput } from "@/lib/ai/schemas/prompt-segmentation";

export const PROMPT_SEGMENTATION_SYSTEM_PROMPT = `
你是专业 AI 图像 prompt 工程师和视觉风格模板设计师。
你的任务是将一段 image2 / GPT Image 类模型可用的英文 prompt 拆解成可复用的结构化模块。
拆解目标不是改写 prompt，而是让用户知道哪些部分应该保留，哪些部分可以替换。
输出必须是严格 JSON，不要 Markdown，不要额外解释。
字段 label 和 replaceHint 使用中文。
字段 content 保留英文 prompt 片段。
isReplaceable 表示该模块是否适合被用户替换。
如果该模块是核心风格、构图、光影，应谨慎标为不可替换或低替换建议。
如果该模块是主体、场景、情绪、题材符号，可以标为可替换。
`.trim();

export function buildPromptSegmentationUserPrompt(input: PromptSegmentationInput): string {
  return `
请基于以下已完成的图片逆向分析结果，拆解英文 reverse prompt 和 negative prompt。
不要重新分析图片，不要发散生成新的图片内容。

分析标题：
${input.title ?? "未命名分析"}

风格摘要：
${input.styleSummary ?? "无"}

画面主体：
${input.visualSubject ?? "无"}

构图：
${input.composition ?? "无"}

色彩：
${input.colorPalette ?? "无"}

光影：
${input.lighting ?? "无"}

材质：
${input.texture ?? "无"}

年代感：
${input.eraFeeling ?? "无"}

选题传播潜力：
${input.topicPotential ?? "无"}

reversePrompt：
${input.reversePrompt}

negativePrompt：
${input.negativePrompt ?? "low quality, blurry, distorted composition, text artifacts, watermark"}

必须严格输出以下 JSON：
{
  "segments": [
    {
      "type": "subject",
      "label": "主体",
      "content": "English prompt fragment",
      "isReplaceable": true,
      "replaceHint": "中文替换建议",
      "sortOrder": 1
    }
  ],
  "templateSummary": "中文，说明该 prompt 模板最值得保留的风格资产",
  "replacementStrategy": "中文，说明用户替换时应该优先替换什么、保留什么"
}

segments 必须且只能覆盖以下 11 个 type，并按 sortOrder 1 到 11 排序：
1. subject
2. scene
3. composition
4. style
5. color
6. lighting
7. camera
8. texture
9. mood
10. text_area
11. negative

硬性要求：
- type 必须是上述 11 种之一。
- label 使用中文。
- content 使用英文 prompt 片段，不要翻译成中文。
- replaceHint 使用中文。
- sortOrder 从 1 到 11。
- negative 模块必须来自 negativePrompt。
- 如果原 prompt 中没有明显 text_area，也要生成一个适合营销封面使用的英文 text_area 建议。
- 每个模块 content 不要为空。
- 不要输出 Markdown，不要输出代码块，不要输出 JSON 以外的任何解释。
`.trim();
}
