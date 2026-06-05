# 风格迁移 Prompt API 说明

## 接口地址

- `POST /api/prompts/fuse`

## 请求体

```json
{
  "analysisId": "PromptAnalysis ID",
  "userRequirement": "把主体换成古风女刺客，适合小红书悬疑小说封面，保留原图冷色电影感、强对比光影和紧张构图"
}
```

## 返回结构

```json
{
  "ok": true,
  "fusion": {
    "id": "...",
    "analysisId": "...",
    "userRequirement": "...",
    "fusedPrompt": "...",
    "changeSummary": "...",
    "createdAt": "..."
  },
  "result": {
    "title": "中文标题",
    "finalPromptEnglish": "English prompt",
    "negativePromptEnglish": "English negative prompt",
    "changeSummary": "中文变更说明",
    "preservedElements": [],
    "replacedElements": [],
    "usageAdvice": "中文使用建议",
    "riskNotes": [],
    "styleRetentionScore": 8,
    "requirementMatchScore": 8,
    "commercialPotentialScore": 8
  }
}
```

## 风格迁移逻辑

风格迁移基于已保存的 `PromptAnalysis` 和 `PromptSegment`，不会重新分析图片。系统会保留原图中最有价值的视觉资产，同时根据用户新需求替换主体、场景、题材符号和用途。

## 应该保留的元素

- 构图张力
- 色彩体系
- 光影方式
- 镜头语言
- 画面质感
- 情绪氛围
- 商业传播潜力

## 适合替换的元素

- 主体
- 场景
- 题材符号
- 人物身份
- 情绪表达
- 文案空间需求
- 画面用途

## 为什么本阶段只生成 prompt，不生成图片

阶段 6 的目标是验证“风格模板 + 新需求”的 prompt 融合能力，并把结果保存到 `PromptFusion`。图片生成会引入模型调用、成本、队列和结果管理等额外复杂度，因此留到后续阶段处理。本阶段不会调用 `OPENAI_IMAGE_MODEL`。

## 常见错误

- `analysisId 不存在`：数据库中没有对应的 `PromptAnalysis`。
- `userRequirement 为空`：没有输入新的中文需求。
- `reversePrompt 为空`：原分析记录缺少可融合的英文 prompt。
- `AI 配置缺失`：`OPENAI_API_KEY` 或 `OPENAI_TEXT_MODEL` 等环境变量未配置。
- `模型返回格式异常`：模型没有返回严格 JSON。
- `网络超时`：中转站、代理或模型服务响应超时。
