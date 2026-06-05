# 生成图效果评估与 Prompt 迭代优化

阶段 9 用于评估已生成的测试图，并生成改良版英文 Prompt。评估会结合生成图本身、原始 prompt、negative prompt、sourceType 以及可用的 PromptAnalysis / PromptFusion 上下文。

本阶段不做：

- 批量生成
- 图片编辑
- 局部重绘
- mask

## 评估接口

接口地址：`POST /api/generated-images/[id]/evaluate`

请求体为空。

成功返回：

```json
{
  "ok": true,
  "evaluation": {
    "id": "...",
    "generatedImageId": "...",
    "overallScore": 8,
    "promptMatchScore": 8,
    "styleRetentionScore": 8,
    "requirementMatchScore": 8,
    "compositionScore": 8,
    "colorScore": 8,
    "lightingScore": 8,
    "subjectScore": 8,
    "commercialPotentialScore": 8,
    "summary": "...",
    "strengths": "...",
    "weaknesses": "...",
    "improvementAdvice": "...",
    "improvedPrompt": "...",
    "improvedNegativePrompt": "...",
    "createdAt": "..."
  },
  "result": {
    "overallScore": 8,
    "promptMatchScore": 8,
    "styleRetentionScore": 8,
    "requirementMatchScore": 8,
    "compositionScore": 8,
    "colorScore": 8,
    "lightingScore": 8,
    "subjectScore": 8,
    "commercialPotentialScore": 8,
    "summary": "中文总体评价",
    "strengths": ["中文优点"],
    "weaknesses": ["中文问题"],
    "improvementAdvice": ["中文建议"],
    "improvedPrompt": "English improved prompt",
    "improvedNegativePrompt": "English improved negative prompt"
  }
}
```

失败返回：

```json
{
  "ok": false,
  "error": "中文错误信息"
}
```

## 评估字段说明

- `overallScore`：综合评分。
- `promptMatchScore`：生成图是否符合原始 prompt。
- `styleRetentionScore`：是否保留目标风格资产。
- `requirementMatchScore`：是否满足用户新需求；没有新需求时可近似参考 prompt 匹配度。
- `compositionScore`：构图质量。
- `colorScore`：色彩质量。
- `lightingScore`：光影质量。
- `subjectScore`：主体清晰度与准确性。
- `commercialPotentialScore`：作为小红书封面、图书营销图、有声书视觉素材等商业传播图的潜力。
- `summary`：中文总体评价。
- `strengths`：中文优点列表。
- `weaknesses`：中文问题列表。
- `improvementAdvice`：中文优化建议列表。
- `improvedPrompt`：改良版英文 prompt。
- `improvedNegativePrompt`：改良版英文 negative prompt。

评分范围均为 1-10。

## improvedPrompt 的用途

`improvedPrompt` 用于在不做图片编辑、不做局部重绘的前提下，通过重新生成来迭代图片效果。生成图详情页提供“用改良 Prompt 再生成”按钮，会调用 `/api/images/generate`：

- `prompt = improvedPrompt`
- `negativePrompt = improvedNegativePrompt`
- `sourceType = custom_prompt`
- `sourceId = GeneratedImageEvaluation.id`

## 评估不是绝对审美判断

评估结果是模型基于图片和上下文给出的结构化判断，适合用于快速筛选和 Prompt 迭代，不等于绝对审美结论。运营场景仍应结合目标受众、投放渠道、品牌规范和人工审美复核。

## 为什么要结合 prompt 和生成图一起看

单看图片只能判断视觉质量，无法判断它是否完成了 prompt 中的主体、场景、构图、风格和商业用途要求。结合 prompt、negative prompt、PromptAnalysis 和 PromptFusion 上下文，才能判断“生成得好不好”以及“是否生成对了”。

## 常见错误

- `生成图不存在`：generatedImageId 不存在。
- `生成图文件不存在`：数据库记录存在，但本地文件丢失。
- `模型不支持图片输入`：OPENAI_VISION_MODEL 不支持图像理解。
- `模型返回格式异常`：模型没有返回严格 JSON，或字段不完整。
- `模型返回内容为空`：视觉模型没有返回有效内容。
- `网络超时`：中转站或模型服务响应超时。
