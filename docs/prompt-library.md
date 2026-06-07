# Prompt 库、详情页与导入说明

## Prompt 库

页面地址：`/library`

支持能力：

- 搜索：通过 `q` 搜索标题、风格摘要、画面主体和 Prompt。
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
- 通过 Prisma 级联删除关联的 `PromptSegment`、`PromptFusion`、`PromptVariant` 和 `PromptAnalysisTag`。
- 删除前会清理合集中的 `analysis` 引用，以及该记录下 `PromptVariant` 对应的合集引用。
- 不删除 `ImageAsset`。
- 不删除原始上传图片文件。
- 不删除 `GeneratedImage`。
- 不删除生成图片文件。

返回说明：

```json
{
  "ok": true,
  "message": "已删除 Prompt 记录，原始图片和生成图已保留。"
}
```

## 批量删除 Prompt 记录

接口地址：`POST /api/analyses/batch-delete`

请求体：

```json
{
  "ids": ["analysisId1", "analysisId2"]
}
```

规则：

- `ids` 必须是非空数组。
- 系统会自动去重。
- 单次最多删除 100 条记录，超过会返回“单次最多删除 100 条记录，请分批操作。”。
- 不存在的 id 会返回到 `notFoundIds`，不会影响其他有效记录删除。
- 删除范围与单条删除一致：只删除 Prompt 记录及其拆解、风格迁移、模板版本和标签绑定。
- 原始图片、生成图、本地文件、备份、导出和日志都不会删除。
- 删除前会清理合集中的 `analysis` 和 `prompt_variant` 弱引用，避免合集出现无效条目。
- 如需检查孤儿文件，可进入 `/maintenance` 使用孤儿文件检查和安全清理工具。

成功返回示例：

```json
{
  "ok": true,
  "deletedCount": 3,
  "notFoundIds": [],
  "skippedGeneratedImagesCount": 5,
  "message": "已删除 3 条 Prompt 记录，原始图片和生成图已保留。"
}
```

## 导入已有 Prompt

页面地址：`/import`

接口地址：`POST /api/prompts/import`

导入支持三类输入：

- 中文 Prompt：例如“冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面”。
- 英文 Prompt：可以直接粘贴已有 image prompt。
- 模糊描述：只写画面方向、题材卖点或风格关键词也可以。

导入原则：

- 原始 Prompt 是核心资产，系统会原样保存，不翻译、不润色、不重排。
- `semantic_preserve`：AI 语义整理入库，默认模式。系统只分析主体、场景、构图、色彩、光影、材质、风格、商业用途和标签，不改写 Prompt。
- `direct`：直接入库。不调用 AI，不做结构化分析。
- 兼容旧值：如果传入 `importMode=semantic`，系统会按 `semantic_preserve` 处理。

请求体：

```json
{
  "title": "冷色电影感悬疑封面",
  "rawPrompt": "冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面",
  "negativePrompt": "不要模糊、不要低清、不要错误文字",
  "tags": ["封面", "悬疑", "电影感"],
  "imageId": "optional",
  "importMode": "semantic_preserve"
}
```

兼容旧字段：如果传入旧版 `reversePrompt`，接口会当作 `rawPrompt` 处理。

规则：

- `rawPrompt` 必填。
- `title` 可选；语义整理模式会自动生成中文标题，直接导入模式默认标题为“手动导入 Prompt”。
- `negativePrompt` 可选；系统会原样保存，不强制英文化。
- `tags` 可选，导入后会自动创建并绑定标签。
- `imageId` 可选；如果提供，系统会校验对应图片是否存在。
- 导入成功后会创建 `PromptAnalysis`，并跳转到 `/library/[id]`。

字段关系：

- `importedRawPrompt`：保存用户原始粘贴的 Prompt 或模糊描述，不做英文化处理。
- `importedPromptLanguage`：记录检测语言，可能是 `zh`、`en`、`mixed` 或 `unknown`。
- `importMode`：记录导入模式，可能是 `semantic_preserve` 或 `direct`；旧数据中的 `semantic` 视为 `semantic_preserve`。
- `reversePrompt`：导入记录中表示“当前可执行 Prompt”，保存用户原始 Prompt，不保证英文；图片逆向分析记录中的 `reversePrompt` 仍通常是英文。
- `negativePrompt`：保存用户输入的 negative prompt 原文。
- `rawJson.normalization`：语义整理分析结果，不包含对原始 Prompt 的改写。

导入后的 Prompt 可以继续执行：

- 重新拆解 Prompt：`POST /api/prompts/segment`
- 风格迁移：`POST /api/prompts/fuse`

## 批量删除

`/library` 支持多选 PromptAnalysis 后批量删除。

删除范围：

- 删除选中的 PromptAnalysis。
- 删除其下属 PromptSegment、PromptFusion、PromptVariant、PromptAnalysisTag。
- 清理合集中的 `analysis` 和 `prompt_variant` 弱引用。

不会删除：

- ImageAsset。
- 原始上传图片文件。
- GeneratedImage。
- 生成图片文件。

如果删除后需要检查本地孤儿文件，可打开 `/maintenance` 使用孤儿文件检查。

## 标签治理

Prompt 库标签筛选默认只显示未归档标签，并按分类分组。可在 `/tags` 页面查看标签统计、分类、等级、使用次数和别名数量。

标签合并必须人工确认。AI 只会提出建议，不会自动合并标签。确认合并后，系统会把 source tags 关联的 PromptAnalysis 迁移到 target tag，并把 source tags 归档为历史标签。

## Prompt 库分页

`/library` 使用服务端分页，不会一次性加载全部 Prompt 记录。

分页参数：

- `page`：当前页，默认 `1`。
- `pageSize`：每页数量，支持 `24`、`48`、`96`，默认 `24`。
- `q`：搜索标题、风格、主体或 Prompt。
- `tagId`：按标签筛选。
- `hasSegments`：是否已有 Prompt 拆解。
- `hasFusions`：是否已有风格迁移。
- `sort`：排序，支持最新、最早、迁移次数最多。

列表页只展示快速定位所需字段：

- 预览图
- 标题
- 最多 4 个标签
- Prompt 模块数量
- 风格迁移次数
- 模板版本数量
- 生成图数量
- 创建时间
- 查看详情
- 删除

完整信息仍在 `/library/[id]`：

- 结构化分析
- Reverse Prompt
- Negative Prompt
- Prompt 拆解模块
- 风格迁移历史
- 模板版本
- 生成图历史
- 标签管理

列表页不展示完整 Prompt 和长篇风格摘要，是为了提高大量素材管理时的信息密度和加载效率。

批量操作只作用于当前页已选择的记录。翻页、搜索、筛选或切换每页数量后，当前选择会清空，避免跨页误删。

## 常见错误

- `请填写原始 Prompt 或画面描述`：rawPrompt 为空。
- `关联的参考图片不存在`：传入的 imageId 无效。
- `AI 语义整理失败`：OPENAI_TEXT_MODEL 调用失败或模型返回为空。
- `模型返回格式异常`：模型没有返回严格 JSON，或字段不完整。
- `未找到该 Prompt 分析记录`：详情或删除接口中的 id 不存在。
