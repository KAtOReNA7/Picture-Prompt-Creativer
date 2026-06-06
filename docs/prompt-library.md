# Prompt 库、详情页与导入说明

## Prompt 库

页面地址：`/library`

支持能力：

- 搜索：通过 `q` 搜索标题、风格摘要、画面主体和英文 Prompt。
- 拆解状态筛选：`hasSegments=true` 表示已有 PromptSegment，`hasSegments=false` 表示未拆解。
- 风格迁移筛选：`hasFusions=true` 表示已有 PromptFusion，`hasFusions=false` 表示未生成风格迁移。
- 排序：`sort=latest` 最新优先，`sort=oldest` 最早优先，`sort=mostFusions` 风格迁移次数最多。

列表卡片会展示参考图缩略图、标题、风格摘要、画面主体、Prompt 模块数量、风格迁移数量和创建时间。

## 分析详情接口

接口地址：`GET /api/analyses/[id]`

成功返回：

```json
{
  "ok": true,
  "analysis": {
    "id": "...",
    "title": "...",
    "image": {
      "id": "...",
      "originalName": "...",
      "mimeType": "image/png",
      "size": 123,
      "previewUrl": "/api/images/.../file"
    },
    "segments": [],
    "fusions": []
  }
}
```

如果该记录没有参考图，`image` 为 `null`，页面会显示“无参考图”。

找不到记录时返回：

```json
{
  "ok": false,
  "error": "未找到该 Prompt 分析记录"
}
```

## 删除分析记录

接口地址：`DELETE /api/analyses/[id]`

删除策略：

- 只删除 `PromptAnalysis`。
- 通过 Prisma 级联删除关联的 `PromptSegment` 和 `PromptFusion`。
- 不删除 `ImageAsset`。
- 不删除本地图片文件。

## 导入已有 Prompt

页面地址：`/import`

接口地址：`POST /api/prompts/import`

导入支持三类输入：

- 中文 Prompt：例如“冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面”。
- 英文 Prompt：可以直接粘贴已有 image prompt。
- 模糊描述：只写画面方向、题材卖点或风格关键词也可以。

导入模式：

- `semantic`：AI 语义整理导入，默认模式。系统会识别中文、英文或中英混合内容，生成中文结构化分析，并把 `reversePrompt` / `negativePrompt` 整理为英文，适合后续拆解、风格迁移和生成测试图。
- `direct`：直接导入。不调用 AI，不拒绝中文 Prompt，适合先归档。该模式不会自动转英文，后续用于生成图前建议重新使用 AI 语义整理。

中文 / 模糊 Prompt 导入时，系统会尽量自动英文化 `reversePrompt` 和 `negativePrompt`。如果模型首次返回了中英混合或包含中文字符的 `reversePromptEnglish`，系统会自动进行一次二次英文化修复，并在导入详情页显示修复说明。直接导入模式不会强制英文化，会原样保存用户输入。

请求体：

```json
{
  "title": "冷色电影感悬疑封面",
  "rawPrompt": "冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面",
  "negativePrompt": "不要模糊、不要低清、不要错误文字",
  "tags": ["封面", "悬疑", "电影感"],
  "imageId": "optional",
  "importMode": "semantic"
}
```

兼容旧字段：如果传入旧版 `reversePrompt`，接口会当作 `rawPrompt` 处理。

规则：

- `rawPrompt` 必填。
- `title` 可选；语义整理模式会自动生成中文标题，直接导入模式默认标题为“手动导入 Prompt”。
- `negativePrompt` 可选；语义整理模式允许中文或英文，并会整理成英文 negative prompt。
- `tags` 可选，导入后会自动创建并绑定标签。
- `imageId` 可选；如果提供，系统会校验对应图片是否存在。
- 导入成功后会创建 `PromptAnalysis`，并跳转到 `/library/[id]`。

字段关系：

- `importedRawPrompt`：保存用户原始粘贴的 Prompt 或模糊描述，不做英文化处理。
- `importedPromptLanguage`：记录检测语言，可能是 `zh`、`en`、`mixed` 或 `unknown`。
- `importMode`：记录导入模式，可能是 `semantic` 或 `direct`。
- `reversePrompt`：语义整理模式下保存 AI 整理后的英文 image2 prompt；直接导入模式下保存原始 Prompt。
- `negativePrompt`：语义整理模式下保存英文 negative prompt；直接导入模式下保存用户原文。
- `rawJson.repair` / `rawJson.repairNotes`：如果语义整理阶段触发二次英文化修复，会记录修复结果和中文说明。

导入后的 Prompt 可以继续执行：

- 重新拆解 Prompt：`POST /api/prompts/segment`
- 风格迁移：`POST /api/prompts/fuse`

## 常见错误

- `请填写原始 Prompt 或画面描述`：rawPrompt 为空。
- `关联的参考图片不存在`：传入的 imageId 无效。
- `AI 语义整理失败`：OPENAI_TEXT_MODEL 调用失败或模型返回为空。
- `模型返回格式异常`：模型没有返回严格 JSON，或字段不完整。
- `AI 已尝试整理 Prompt，但英文 Prompt 仍未通过校验`：系统已经进行二次英文化修复，但结果仍包含中文或英文比例过低。请简化原始描述后重试。
- `未找到该 Prompt 分析记录`：详情或删除接口中的 id 不存在。
