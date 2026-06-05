# 标签、合集与导出说明

## 标签系统

标签用于给 `PromptAnalysis` 做分类，适合按风格、题材、用途、色彩、情绪、构图、平台和商业场景整理素材。

标签模型：

- `Tag`：标签基础信息，包含名称、颜色、说明。
- `PromptAnalysisTag`：Prompt 分析和标签的绑定关系。

## AI 推荐标签

`POST /api/analyses/[id]/suggest-tags` 会读取分析、拆解模块、风格迁移和模板版本上下文，调用 `OPENAI_TEXT_MODEL` 推荐 5-10 个中文标签。

注意：

- AI 推荐标签只返回建议。
- 不会自动保存。
- 用户需要在前端手动选择建议标签后添加。
- AI 调用只发生在服务端，不会暴露 `OPENAI_API_KEY`。

## 合集系统

合集用于按项目、用途或风格整理不同类型素材。

`CollectionItem.itemType` 支持：

- `analysis`：Prompt 分析记录。
- `prompt_variant`：模板编辑器生成的 PromptVariant。
- `generated_image`：生成测试图。

删除合集只删除合集和合集条目，不删除原始素材。

## 批量管理

`/library` 支持：

- 多选 Prompt 分析记录。
- 批量添加标签。
- 批量加入合集。
- 批量导出 JSON / Markdown。
- 按标签筛选 Prompt 库。

## 导出

`POST /api/export` 支持：

```json
{
  "type": "analyses",
  "ids": ["analysis_id"],
  "format": "json"
}
```

或：

```json
{
  "type": "collection",
  "collectionId": "collection_id",
  "format": "markdown"
}
```

支持格式：

- `json`：完整结构化数据。
- `markdown`：适合人工阅读的标题、标签、风格摘要、Prompt、模块、模板版本、风格迁移和生成图信息。

导出文件保存到 `exports/`，该目录已加入 `.gitignore`。前端只拿到下载地址，不会暴露本地绝对路径。

下载接口：

```http
GET /api/export/[filename]
```

## API 摘要

标签：

- `GET /api/tags`
- `POST /api/tags`
- `PATCH /api/tags/[id]`
- `DELETE /api/tags/[id]`

分析标签绑定：

- `POST /api/analyses/[id]/tags`
- `POST /api/analyses/[id]/tags/quick-add`
- `POST /api/analyses/[id]/suggest-tags`

合集：

- `GET /api/collections`
- `POST /api/collections`
- `GET /api/collections/[id]`
- `PATCH /api/collections/[id]`
- `DELETE /api/collections/[id]`
- `POST /api/collections/[id]/items`
- `DELETE /api/collections/[id]/items/[itemId]`

导出：

- `POST /api/export`
- `GET /api/export/[filename]`

## 常见错误

- 标签名称为空：填写标签名称后重试。
- 标签重名：使用不同名称，或绑定已有标签。
- analysisId 不存在：确认 Prompt 记录未被删除。
- itemType 不合法：只使用 `analysis`、`prompt_variant`、`generated_image`。
- itemId 不存在：确认原始素材仍存在。
- AI 推荐失败：检查 `OPENAI_API_KEY`、`OPENAI_TEXT_MODEL` 和中转服务连通性。
- 导出文件不存在：确认导出接口成功返回文件名，并使用返回的下载地址。
