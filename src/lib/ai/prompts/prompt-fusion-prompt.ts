import type { PromptFusionInput } from "@/lib/ai/schemas/prompt-fusion";

export const PROMPT_FUSION_SYSTEM_PROMPT = `
你是专业 AI 图像 prompt 工程师、视觉创意总监和商业封面设计顾问。
你的任务是将“原图风格模板”和“用户新需求”融合，生成适合 image2 / GPT Image 类模型使用的高质量英文 prompt。
你必须保留原图中最有价值的风格资产，包括：构图张力、色彩体系、光影方式、镜头语言、画面质感、情绪氛围和商业传播潜力。
你应该根据用户新需求替换：主体、场景、题材符号、人物身份、情绪表达、文案空间需求和画面用途。

要求：
1. 输出必须是严格 JSON。
2. 不要 Markdown。
3. 不要额外解释。
4. finalPromptEnglish 必须是完整英文 prompt，不要只是关键词。
5. negativePromptEnglish 必须是英文。
6. changeSummary、preservedElements、replacedElements、usageAdvice、riskNotes 使用中文。
7. 不能承诺 100% 复刻原图。
8. 不能直接复制原图主体，除非用户明确要求保留主体。
9. 必须让 prompt 适合“风格迁移”，而不是简单拼接用户新需求。
`.trim();

export function buildPromptFusionUserPrompt(input: PromptFusionInput): string {
  const segmentsText =
    input.segments.length > 0
      ? input.segments
          .map(
            (segment) =>
              `- ${segment.type} / ${segment.label} / ${segment.isReplaceable ? "可替换" : "建议保留"}：${segment.content}\n  替换建议：${segment.replaceHint ?? "无"}`,
          )
          .join("\n")
      : "当前缺少模块拆解，只基于完整 reversePrompt 融合。";

  return `
请基于以下“原图风格模板”和“用户新需求”，生成新的风格迁移 prompt。

用户新需求：
${input.userRequirement}

原图分析标题：
${input.title ?? "未命名分析"}

原图风格摘要：
${input.styleSummary ?? "无"}

原图主体：
${input.visualSubject ?? "无"}

原图构图：
${input.composition ?? "无"}

原图色彩：
${input.colorPalette ?? "无"}

原图光影：
${input.lighting ?? "无"}

原图材质：
${input.texture ?? "无"}

原图年代感：
${input.eraFeeling ?? "无"}

原图传播潜力：
${input.topicPotential ?? "无"}

原始 reversePrompt：
${input.reversePrompt}

原始 negativePrompt：
${input.negativePrompt ?? "low quality, blurry, bad composition, text artifacts, watermark"}

已有 Prompt 模块：
${segmentsText}

必须严格输出以下 JSON：
{
  "title": "中文，融合后的 prompt 标题",
  "finalPromptEnglish": "英文，适合 image2 使用的完整融合 prompt",
  "negativePromptEnglish": "英文，负面提示词",
  "changeSummary": "中文，说明这次融合做了什么变化",
  "preservedElements": ["中文，保留的风格资产1", "中文，保留的风格资产2", "中文，保留的风格资产3"],
  "replacedElements": ["中文，替换的元素1", "中文，替换的元素2"],
  "usageAdvice": "中文，使用这个 prompt 生成图片时的建议",
  "riskNotes": ["中文，可能不稳定或需要人工微调的点"],
  "styleRetentionScore": 8,
  "requirementMatchScore": 8,
  "commercialPotentialScore": 8
}

硬性要求：
- finalPromptEnglish 必须是完整英文 prompt，适合直接用于 image2 / GPT Image 类模型。
- negativePromptEnglish 必须是英文，并包含低质量、构图、文字、水印、畸形等常见问题。
- preservedElements 至少 3 条。
- replacedElements 至少 2 条。
- riskNotes 至少 1 条。
- styleRetentionScore、requirementMatchScore、commercialPotentialScore 都必须是 1-10 的整数。
- 不要输出 JSON 以外的任何内容。
`.trim();
}
