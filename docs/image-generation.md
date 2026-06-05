# 图片生成测试图说明

阶段 8 只实现“根据已有 Prompt 生成单张测试图”，用于验证 reverse prompt 或风格迁移 prompt 的可用性。

本阶段不做：

- 图片编辑
- 局部重绘
- mask
- 批量生成

## 生成接口

接口地址：`POST /api/images/generate`

请求体：

```json
{
  "prompt": "English prompt...",
  "negativePrompt": "English negative prompt...",
  "sourceType": "fusion_prompt",
  "sourceId": "xxx",
  "size": "1024x1024",
  "quality": "medium",
  "format": "png"
}
```

成功返回：

```json
{
  "ok": true,
  "image": {
    "id": "...",
    "prompt": "...",
    "negativePrompt": "...",
    "sourceType": "fusion_prompt",
    "sourceId": "...",
    "model": "...",
    "size": "1024x1024",
    "quality": "medium",
    "format": "png",
    "fileUrl": "/api/generated-images/xxx/file",
    "createdAt": "..."
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

## 图片访问接口

接口地址：`GET /api/generated-images/[id]/file`

功能：

- 根据 `GeneratedImage.id` 查询数据库。
- 读取 `uploads/generated/` 下的本地图片文件。
- 按记录中的 `format` 返回正确 `Content-Type`。
- 文件不存在时返回中文错误。

## 生成记录查询接口

接口地址：`GET /api/generated-images`

支持 query：

- `sourceType`
- `sourceId`
- `limit`，默认 20，最大 50

返回最近生成记录，包括：

- id
- prompt
- negativePrompt
- sourceType
- sourceId
- model
- size
- quality
- format
- fileUrl
- createdAt

## sourceType 说明

- `analysis_reverse_prompt`：基于 `PromptAnalysis.reversePrompt` 生成。
- `fusion_prompt`：基于 `PromptFusion.fusedPrompt` 生成。
- `custom_prompt`：基于自定义 Prompt、PromptVariant 或 GeneratedImageEvaluation 改良 Prompt 生成。

`sourceId` 可对应：

- `PromptAnalysis.id`
- `PromptFusion.id`
- `PromptVariant.id`
- `GeneratedImageEvaluation.id`
- `null`

本阶段不建立外键，避免多态来源关系复杂化。

## 参数说明

允许的 `size`：

- `1024x1024`
- `1024x1536`
- `1536x1024`
- `auto`

允许的 `quality`：

- `low`
- `medium`
- `high`
- `auto`

允许的 `format`：

- `png`
- `jpeg`
- `webp`

默认参数：

- `size=1024x1024`
- `quality=medium`
- `format=png`

## 保存位置

生成结果保存到：

```text
uploads/generated/
```

文件名使用 `crypto.randomUUID()`，避免中文名和重复名问题。

数据库记录保存到 `GeneratedImage` 表。

## 返回格式兼容

服务端兼容中转站返回：

- `data[0].b64_json`
- `data[0].url`

如果返回 `b64_json`，服务端会直接解码保存。

如果返回 `url`，服务端会下载图片二进制后保存。

## 常见错误

- `Prompt 不能为空`：请求没有传入 prompt。
- `Prompt 必须是英文或主要为英文`：prompt 明显是中文。
- `OPENAI_IMAGE_MODEL 未配置`：`.env.local` 缺少图片模型配置。
- `当前模型不支持 images.generate`：模型不支持图片生成接口。
- `内容审核拒绝生成`：Prompt 触发安全策略。
- `中转站返回格式异常`：没有返回 `b64_json` 或 `url`。
- `图片下载失败`：返回 URL 不可访问或下载失败。
- `图片保存失败`：本地写入 `uploads/generated/` 失败。
- `网络超时`：中转站或模型服务响应超时。
