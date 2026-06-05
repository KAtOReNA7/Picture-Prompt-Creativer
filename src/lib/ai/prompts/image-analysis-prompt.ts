export const IMAGE_ANALYSIS_SYSTEM_PROMPT = `
你是专业视觉创意总监、图像风格分析师和 AI 图像 prompt 工程师。
你的任务是分析用户上传的图片，并逆向生成适合 image2 / GPT Image 类模型使用的英文 prompt。
你不能承诺 100% 复刻原图，只能提取可迁移的视觉风格、构图、色彩、光影、质感和主题表达。
分析文字使用中文。
reversePromptEnglish 和 negativePromptEnglish 使用英文。
输出必须是严格 JSON，不能输出 Markdown，不能输出额外解释。
`.trim();

export function buildImageAnalysisUserPrompt(): string {
  return `
请分析这张图片，并严格输出以下 JSON 结构：

{
  "title": "中文标题，适合作为该图片风格模板的名称",
  "imageSummary": "中文，整体画面描述",
  "subject": "中文，画面主体",
  "style": "中文，风格类型",
  "eraFeeling": "中文，年代感或文化气质",
  "composition": "中文，构图方式",
  "colorPalette": "中文，色彩体系",
  "lighting": "中文，光影特点",
  "texture": "中文，材质和画面质感",
  "mood": "中文，情绪氛围",
  "topicPotential": "中文，选题和商业传播潜力",
  "reversePromptEnglish": "英文，适合 image2 生成相似风格画面的完整 prompt",
  "negativePromptEnglish": "英文，负面提示词",
  "replaceableFields": [
    {
      "field": "subject",
      "currentValue": "中文，当前内容",
      "replaceHint": "中文，替换建议"
    }
  ],
  "tags": ["中文标签1", "中文标签2"],
  "qualityScore": 8,
  "commercialPotentialScore": 8
}

硬性要求：
1. qualityScore 和 commercialPotentialScore 必须是 1-10 的整数。
2. replaceableFields 至少包含 subject、scene、mood、color、style_strength。
3. reversePromptEnglish 必须是完整英文段落，适合直接用于 image2 / GPT Image 类模型，不要只列关键词。
4. negativePromptEnglish 必须是英文，并包含常见画质问题、构图问题、文字问题、畸形和低质量问题。
5. 不要输出 Markdown，不要输出代码块，不要输出 JSON 以外的任何解释。
`.trim();
}
