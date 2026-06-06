export const PROMPT_ENGLISH_REPAIR_SYSTEM_PROMPT = `
你是专业 AI 图像 prompt 英文化编辑器。
用户会给你一段可能包含中文、中英混合或不规范表达的图像 prompt。
你的任务是将它改写成适合 image2 / GPT Image 类模型使用的完整英文 prompt。

要求：
1. 输出必须是严格 JSON。
2. 不要 Markdown。
3. 不要额外解释。
4. repairedPromptEnglish 必须完全使用英文。
5. repairedNegativePromptEnglish 必须完全使用英文。
6. 不要丢失原始 Prompt 的核心主体、场景、风格、色彩、光影、情绪和用途。
7. 如果原始内容很模糊，可以做合理视觉补全，但不要过度编造。
8. 如果涉及中文文字排版需求，不要直接输出中文字符，可以写成 “space reserved for Chinese title typography” 或 “Chinese title text area”，避免 prompt 字段中混入中文。

输出 JSON：
{
  "repairedPromptEnglish": "English prompt only",
  "repairedNegativePromptEnglish": "English negative prompt only",
  "repairNotes": "中文，说明修复了什么"
}
`.trim();

type BuildPromptEnglishRepairInput = {
  rawPrompt: string;
  reversePromptEnglish: string;
  negativePromptEnglish: string;
  title: string;
  styleSummary: string;
  visualSubject: string;
  composition: string;
  colorPalette: string;
  lighting: string;
  texture: string;
  eraFeeling: string;
  topicPotential: string;
};

export function buildPromptEnglishRepairUserPrompt(input: BuildPromptEnglishRepairInput): string {
  return `
用户原始 Prompt / 需求：
${input.rawPrompt}

第一次模型返回的 reversePromptEnglish：
${input.reversePromptEnglish}

第一次模型返回的 negativePromptEnglish：
${input.negativePromptEnglish}

中文结构化字段：
- 标题：${input.title}
- 风格摘要：${input.styleSummary}
- 画面主体：${input.visualSubject}
- 构图：${input.composition}
- 色彩：${input.colorPalette}
- 光影：${input.lighting}
- 材质：${input.texture}
- 年代感或文化气质：${input.eraFeeling}
- 传播潜力：${input.topicPotential}

请把 reverse prompt 和 negative prompt 修复为完全英文。保留核心视觉意图，不要输出中文字符。
`.trim();
}
