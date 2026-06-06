# API 回归清单

用于回归测试和排查问题。所有错误返回都应为中文，不应包含完整 API Key、本地绝对路径或英文堆栈。

| 方法 | 路径 | 用途 | 必填参数 | 成功返回 | 常见失败 | AI Key | 文件系统 | 写数据库 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/settings/ai-status` | AI 配置检测 | 无 | 配置状态、模型数量、warning | `/models` 不通、Key 缺失 | 是 | 否 | 否 |
| POST | `/api/images/upload` | 上传图片 | form-data `file` | ImageAsset | 未上传、类型不支持、过大、保存失败 | 否 | 是 | 是 |
| GET | `/api/images/[id]/file` | 读取上传图片 | image id | 图片文件 | 图片不存在、文件不存在 | 否 | 是 | 否 |
| POST | `/api/images/analyze` | 图片逆向分析 | `imageId` | PromptAnalysis + 结构化结果 | 图片不存在、AI 失败、非 JSON | 是 | 是 | 是 |
| POST | `/api/prompts/segment` | Prompt 拆解，保留原语言 | `analysisId` | 11 个 segments | analysis 不存在、reversePrompt 为空、AI 失败 | 是 | 否 | 是 |
| POST | `/api/prompts/fuse` | 风格迁移 | `analysisId`,`userRequirement` | PromptFusion + finalPrompt | analysis 不存在、需求为空、AI 失败 | 是 | 否 | 是 |
| POST | `/api/prompts/import` | Prompt 保真导入 | `rawPrompt`；可选 `importMode=semantic_preserve/direct` | PromptAnalysis + normalization | Prompt 为空、AI 失败、数据库失败 | 语义整理需要 | 可选图片 | 是 |
| GET | `/api/analyses` | Prompt 库列表 | 无 | analyses 列表 | 查询参数异常 | 否 | 否 | 否 |
| GET | `/api/analyses/[id]` | Prompt 详情 | id | analysis 详情 | 记录不存在 | 否 | 否 | 否 |
| DELETE | `/api/analyses/[id]` | 删除 PromptAnalysis | id | 删除成功 | 记录不存在 | 否 | 否 | 是 |
| POST | `/api/analyses/[id]/tags` | 覆盖绑定标签 | `tagIds` | tags | tagId 不存在、analysis 不存在 | 否 | 否 | 是 |
| POST | `/api/analyses/[id]/tags/quick-add` | 快速新建并绑定标签 | `tagNames` | tags | tagNames 空、analysis 不存在 | 否 | 否 | 是 |
| POST | `/api/analyses/[id]/suggest-tags` | AI 推荐标签 | id | suggestedTags | AI 失败、格式异常 | 是 | 否 | 否 |
| GET | `/api/tags` | 标签列表 | 无 | tags + analysisCount | 无 | 否 | 否 | 否 |
| POST | `/api/tags` | 创建标签 | `name` | tag | 名称为空、重名 | 否 | 否 | 是 |
| PATCH | `/api/tags/[id]` | 更新标签 | id | tag | 标签不存在、重名 | 否 | 否 | 是 |
| DELETE | `/api/tags/[id]` | 删除标签 | id | 删除成功 | 标签不存在 | 否 | 否 | 是 |
| POST | `/api/prompt-variants/compose` | 组合 PromptVariant | `analysisId`,`title`,`editedSegments` | PromptVariant | 模块不足、analysis 不存在 | 否 | 否 | 是 |
| GET | `/api/prompt-variants` | 模板版本列表 | 可选 `analysisId` | variants | 无 | 否 | 否 | 否 |
| GET | `/api/prompt-variants/[id]` | 模板版本详情 | id | variant + generatedImages | 版本不存在 | 否 | 否 | 否 |
| POST | `/api/prompt-variants/[id]/polish` | AI 润色 PromptVariant | id | 新 PromptVariant | 版本不存在、AI 失败 | 是 | 否 | 是 |
| POST | `/api/images/generate` | 生成测试图 | `prompt`,`sourceType`；可选 `originAnalysisId` | GeneratedImage，含 `originAnalysisId` | Prompt 非英文、模型不支持、保存失败 | 是 | 是 | 是 |
| GET | `/api/generated-images` | 生成图列表 | 可选 `sourceType`,`sourceId`,`originAnalysisId` | images，含 `originAnalysisId` | 无 | 否 | 否 | 否 |
| GET | `/api/generated-images/[id]/file` | 读取生成图 | id | 图片文件 | 文件不存在 | 否 | 是 | 否 |
| POST | `/api/generated-images/[id]/evaluate` | 生成图评估 | id | GeneratedImageEvaluation | 图片不存在、AI 失败 | 是 | 是 | 是 |
| GET | `/api/collections` | 合集列表 | 无 | collections | 无 | 否 | 否 | 否 |
| POST | `/api/collections` | 创建合集 | `name` | collection | 名称为空 | 否 | 否 | 是 |
| GET | `/api/collections/[id]` | 合集详情 | id | collection + items | 合集不存在 | 否 | 否 | 否 |
| PATCH | `/api/collections/[id]` | 更新合集 | id | collection | 合集不存在 | 否 | 否 | 是 |
| DELETE | `/api/collections/[id]` | 删除合集 | id | 删除成功 | 合集不存在 | 否 | 否 | 是 |
| POST | `/api/collections/[id]/items` | 批量加入合集 | `items` | created/skipped | itemType 不合法、itemId 不存在 | 否 | 否 | 是 |
| DELETE | `/api/collections/[id]/items/[itemId]` | 移除合集 item | CollectionItem id | 删除成功 | item 不存在 | 否 | 否 | 是 |
| POST | `/api/export` | 导出 JSON/Markdown | `type`,`format` | filename + downloadUrl | 类型/格式不支持、记录不存在 | 否 | 是 | 否 |
| GET | `/api/export/[filename]` | 下载导出文件 | filename | 文件下载 | 文件不存在、文件名非法 | 否 | 是 | 否 |
| GET | `/api/maintenance/status` | 运维状态 | 无 | 数据库/存储/AI 状态 | 数据库异常 warning | 可选 | 是 | 否 |
| POST | `/api/maintenance/backup` | 创建 zip 备份 | 无 | backup filename | 备份失败 | 否 | 是 | 否 |
| GET | `/api/maintenance/backups` | 备份列表 | 无 | backups | 无 | 否 | 是 | 否 |
| GET | `/api/maintenance/backups/[filename]` | 下载备份 | filename | zip 文件 | 文件不存在 | 否 | 是 | 否 |
| GET | `/api/maintenance/orphans` | 孤儿文件检查 | 无 | orphanFiles/missingFiles | 检查失败 | 否 | 是 | 否 |
| POST | `/api/maintenance/cleanup` | 安全清理 | 删除开关可选 | deleted/dryRun | 文件删除失败 | 否 | 是 | 否 |
| GET | `/api/maintenance/logs` | 最近日志 | 无 | logs | 无 | 否 | 是 | 否 |

## 回归重点

- 所有 AI API 必须只在服务端读取 `OPENAI_API_KEY`。
- 所有下载 API 只允许安全文件名，不能接受任意路径。
- 所有上传、生成、导出、备份目录都必须被 `.gitignore` 忽略。
- 清理接口默认不能删除任何文件。
