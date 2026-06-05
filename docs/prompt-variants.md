# Prompt 模板版本与变量替换

阶段 10 引入 `PromptVariant`，用于保存基于 PromptSegment 的人工组合版本和 AI 润色版本。

## PromptVariant 和 PromptFusion 的区别

- `PromptFusion`：由 AI 根据“原图风格 + 用户新需求”做语义融合。
- `PromptVariant`：由用户基于拆解后的模块进行替换、启用/禁用和人工组合，也可以选择再让 AI 润色。

PromptVariant 更适合快速替换主体、场景、情绪、色彩和文字区域，不一定每次都需要调用 AI。

## 组合接口

接口地址：`POST /api/prompt-variants/compose`

请求体：

```json
{
  "analysisId": "xxx",
  "title": "古风女刺客替换版",
  "userNote": "主体替换为古风女刺客，保留冷色电影感",
  "editedSegments": [
    {
      "type": "subject",
      "label": "主体",
      "content": "a mysterious female assassin in ancient Chinese black robes",
      "isEnabled": true,
      "sortOrder": 1
    }
  ],
  "negativePrompt": "blurry, low quality"
}
```

规则：

- `analysisId` 必填。
- `title` 必填。
- 至少启用 3 个 segment。
- 启用的 segment 内容应主要为英文。
- `negativePrompt` 也应为英文。
- 保存时 `source=manual_compose`。

## AI 润色接口

接口地址：`POST /api/prompt-variants/[id]/polish`

请求体可以为空。

功能：

- 读取已有 PromptVariant。
- 调用 `OPENAI_TEXT_MODEL`。
- 在不改变核心内容的前提下润色 `composedPrompt`。
- 保存新的 PromptVariant，`source=ai_polished`。
- 不覆盖原版本。

## 查询接口

接口地址：`GET /api/prompt-variants`

支持 query：

- `analysisId`
- `limit`，默认 20，最大 50

单条详情：

```text
GET /api/prompt-variants/[id]
```

## 模板编辑器使用说明

位置：`/library/[id]`

使用方式：

1. 确保当前 PromptAnalysis 已有 PromptSegment。
2. 在“模板编辑器”中编辑各模块。
3. 可启用或禁用模块。
4. 可替换主体、场景、情绪、色彩、风格、镜头和文字区域。
5. composition、lighting、texture 默认建议保留，以维持原图风格资产。
6. negative 模块会作为独立 Negative Prompt 编辑。
7. 点击“组合新 Prompt”保存 PromptVariant。
8. 可继续点击“AI 润色”生成 AI 润色版。
9. 可点击“生成测试图”，以 `custom_prompt` 来源保存 GeneratedImage。

## 适合替换的模块

- subject
- scene
- mood
- color
- style
- camera
- text_area

## 建议保留的模块

- composition
- lighting
- texture

这些模块通常承载原图风格和画面质感，替换过多会削弱风格一致性。

## 人工组合不等于 AI 风格迁移

人工组合是基于模块的显式替换，适合快速、可控地改局部语义。AI 风格迁移会综合理解原图风格、用户新需求和模块上下文，语义融合更强，但可控性相对更低。

## 用 PromptVariant 生成测试图

调用 `/api/images/generate`：

```json
{
  "prompt": "PromptVariant.composedPrompt",
  "negativePrompt": "PromptVariant.negativePrompt",
  "sourceType": "custom_prompt",
  "sourceId": "PromptVariant.id"
}
```

## 常见错误

- `analysisId 不存在`：传入的分析记录不存在。
- `至少需要启用 3 个 Prompt 模块`：启用模块过少。
- `模块内容需要使用英文`：启用 segment 内容明显为中文。
- `Negative Prompt 需要使用英文`：负面提示词明显为中文。
- `AI 润色失败`：文本模型调用失败或返回格式异常。
- `生成测试图失败`：图片模型调用失败或参数不支持。
