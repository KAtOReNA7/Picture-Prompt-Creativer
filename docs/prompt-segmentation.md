# Prompt 拆解 API 说明

## 接口地址

- `POST /api/prompts/segment`

## 请求体

```json
{
  "analysisId": "PromptAnalysis ID"
}
```

`analysisId` 来自图片逆向分析接口 `POST /api/images/analyze` 返回的 `analysis.id`。

## 成功返回

```json
{
  "ok": true,
  "analysisId": "...",
  "segments": [
    {
      "id": "...",
      "type": "subject",
      "label": "主体",
      "content": "English prompt fragment",
      "isReplaceable": true,
      "replaceHint": "中文替换建议",
      "sortOrder": 1
    }
  ],
  "templateSummary": "中文模板总结",
  "replacementStrategy": "中文替换策略"
}
```

## 11 个模块 type

- `subject`：主体，例如人物、产品、动物、建筑。
- `scene`：场景，例如街道、室内、自然环境、商业空间。
- `composition`：构图，例如中心构图、三分法、透视线、留白。
- `style`：风格，例如电影感、复古商业、极简图标、写实摄影。
- `color`：色彩，例如主色、辅助色、冷暖关系和饱和度。
- `lighting`：光影，例如自然光、轮廓光、霓虹反射、柔光。
- `camera`：镜头和画面语言，例如 close-up、wide shot、shallow depth of field。
- `texture`：材质和画面质感，例如 film grain、glossy surface、paper texture。
- `mood`：情绪氛围，例如 calm、dramatic、premium、playful。
- `text_area`：适合营销封面或海报放字的区域建议。
- `negative`：来自 negativePrompt 的负面约束。

## 通常适合替换的模块

- `subject`
- `scene`
- `mood`
- `color`
- 部分 `text_area`

这些模块更接近用户的新需求和商业题材，替换后更容易迁移到新主题。

## 通常建议保留的模块

- `composition`
- `style`
- `lighting`
- `camera`
- `texture`
- `negative`

这些模块更接近原图的核心风格资产，过度替换会让迁移结果失去参考图的视觉特征。

## 为什么基于 reversePrompt 而不是重新分析图片

阶段 5 的目标是拆解已经生成的 prompt 模板，而不是重新理解图片。基于 `PromptAnalysis.reversePrompt` 和相关风格字段拆解，可以保证模块拆解和已保存分析结果一致，也能避免重复消耗视觉模型调用。

## 常见错误

- `analysisId 不存在`：数据库中没有对应的 `PromptAnalysis`。
- `reversePrompt 为空`：该分析记录没有可拆解的英文 prompt。
- `AI 配置缺失`：`OPENAI_API_KEY` 或 `OPENAI_TEXT_MODEL` 等环境变量未配置。
- `模型返回格式异常`：模型没有返回严格 JSON。
- `segments 缺少必要 type`：模型返回没有覆盖 11 个必需模块。
