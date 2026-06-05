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

请求体：

```json
{
  "title": "冷调电影感产品封面",
  "reversePrompt": "A cinematic product cover image with dramatic cool lighting...",
  "negativePrompt": "low quality, blurry, distorted, unreadable text",
  "styleSummary": "冷调电影感，强对比光影",
  "visualSubject": "产品主体",
  "composition": "中心构图",
  "colorPalette": "冷色调",
  "lighting": "强侧光",
  "texture": "细腻高质感",
  "eraFeeling": "现代商业视觉",
  "topicPotential": "适合封面与营销物料",
  "imageId": "optional"
}
```

规则：

- `title` 必填。
- `reversePrompt` 必填，且必须是英文。
- `negativePrompt` 可选，但如果填写也应使用英文。
- `imageId` 可选；如果提供，系统会校验对应图片是否存在。
- 导入成功后会创建 `PromptAnalysis`，并跳转到 `/library/[id]`。

导入后的 Prompt 可以继续执行：

- 重新拆解 Prompt：`POST /api/prompts/segment`
- 风格迁移：`POST /api/prompts/fuse`

## 常见错误

- `请填写 Prompt 标题`：标题为空。
- `请填写英文 Prompt`：reversePrompt 为空。
- `英文 Prompt 看起来不符合要求`：reversePrompt 包含中文或英文词数量过少。
- `Negative Prompt 应使用英文`：negativePrompt 包含中文。
- `关联的参考图片不存在`：传入的 imageId 无效。
- `未找到该 Prompt 分析记录`：详情或删除接口中的 id 不存在。
