# 验收测试清单

每次准备长期使用或交付前，按本清单做一次人工验收。测试过程中不要在截图、日志或聊天中暴露完整 `OPENAI_API_KEY`。

## 1. 环境诊断

- 前置条件：已安装依赖，已配置 `.env.local`。
- 操作步骤：运行 `npm run check:env`，打开 `/diagnostics`。
- 预期结果：Node/npm/Git/npm registry 正常，OpenAI `/models` 可访问，API Key 只显示掩码。
- 失败排查：检查 npm registry、代理、`OPENAI_BASE_URL`、`OPENAI_API_KEY`。

## 2. 图片上传

- 前置条件：准备 jpg/png/webp，大小小于 `MAX_UPLOAD_MB`。
- 操作步骤：打开 `/analyze`，上传图片。
- 预期结果：显示图片预览、文件名、格式、大小和上传时间。
- 失败排查：检查文件格式、大小、`uploads/images/` 权限和 `/api/images/upload`。

## 3. 图片逆向分析

- 前置条件：已有上传图片，视觉模型配置正确。
- 操作步骤：点击“开始 AI 分析”。
- 预期结果：显示中文结构化分析，reverse prompt / negative prompt 为英文，并保存 PromptAnalysis。
- 失败排查：检查 `OPENAI_VISION_MODEL`、模型是否支持图片输入、日志 `/maintenance`。

## 4. Prompt 拆解

- 前置条件：已有分析结果和 reverse prompt。
- 操作步骤：点击“拆解 Prompt”。
- 预期结果：生成 11 个模块，content 为英文，label/replaceHint 为中文，并保存 PromptSegment。
- 失败排查：检查 `OPENAI_TEXT_MODEL`、JSON 返回格式、PromptAnalysis 是否有 reversePrompt。

## 5. 风格迁移

- 前置条件：已有分析记录。
- 操作步骤：打开 `/fusion`，选择分析，输入新需求，生成融合 Prompt。
- 预期结果：生成英文 finalPromptEnglish 和 negativePromptEnglish，并保存 PromptFusion。
- 失败排查：检查文本模型、分析记录是否存在、输入需求是否为空。

## 6. 测试图生成

- 前置条件：已有英文 prompt，图片模型配置正确。
- 操作步骤：在 `/fusion` 或 `/library/[id]` 点击生成测试图。
- 预期结果：生成图片，保存到 `uploads/generated/`，新增 GeneratedImage。
- 失败排查：检查 `OPENAI_IMAGE_MODEL`、Prompt 是否主要为英文、size/quality/format。

## 7. 生成图评估

- 前置条件：已有 GeneratedImage。
- 操作步骤：打开 `/generated-images/[id]`，点击评估。
- 预期结果：显示评分、优点、问题、改良建议和英文 improvedPrompt。
- 失败排查：检查视觉模型是否支持图片输入，生成图文件是否存在。

## 8. 改良 Prompt 再生成

- 前置条件：已有生成图评估。
- 操作步骤：点击“用改良 Prompt 再生成”。
- 预期结果：新增 custom_prompt 来源生成图。
- 失败排查：检查 improvedPrompt 是否英文，图片模型是否可用。

## 9. Prompt 模板编辑

- 前置条件：已有 11 个 PromptSegment。
- 操作步骤：打开 `/library/[id]`，修改 subject/scene 等模块，组合新 Prompt。
- 预期结果：生成英文 composedPrompt，保存 PromptVariant。
- 失败排查：至少启用 3 个英文模块，negative prompt 应主要为英文。

## 10. PromptVariant AI 润色

- 前置条件：已有 PromptVariant。
- 操作步骤：点击 AI 润色。
- 预期结果：新增 AI 润色版 PromptVariant，不覆盖原版本。
- 失败排查：检查文本模型、模型 JSON 输出、日志。

## 11. 无图 Prompt 导入

- 前置条件：准备英文 prompt。
- 操作步骤：打开 `/import`，填写标题和 Prompt，提交。
- 预期结果：生成无图 PromptAnalysis，可拆解、迁移、加入库。
- 失败排查：检查 reversePrompt 是否为空，表单必填项。

## 12. 标签创建与绑定

- 前置条件：已有分析记录。
- 操作步骤：在 `/library/[id]` 新建标签并绑定。
- 预期结果：标签显示在详情和 `/library` 卡片上。
- 失败排查：检查标签重名、tagIds 是否存在。

## 13. AI 推荐标签

- 前置条件：文本模型可用。
- 操作步骤：点击“AI 推荐标签”。
- 预期结果：只显示建议和理由，不自动保存；选择后才绑定。
- 失败排查：检查文本模型、返回 JSON、日志。

## 14. 合集创建与三类 item 添加

- 前置条件：至少有 analysis、PromptVariant、GeneratedImage。
- 操作步骤：创建合集，分别添加三类 item。
- 预期结果：`/collections/[id]` 显示三类素材，可跳转原始详情。
- 失败排查：检查 itemType 是否为 `analysis`、`prompt_variant`、`generated_image`，itemId 是否存在。

## 15. JSON 导出

- 前置条件：已有 analysis 或 collection。
- 操作步骤：执行导出 JSON。
- 预期结果：下载 JSON，包含基础信息、tags、prompts、segments、fusions、variants、generatedImages、evaluations 摘要。
- 失败排查：检查 `/api/export` 请求体、`exports/` 权限。

## 16. Markdown 导出

- 前置条件：已有 analysis 或 collection。
- 操作步骤：执行导出 Markdown。
- 预期结果：下载 `.md`，可人工阅读主要 Prompt 资产。
- 失败排查：检查 format 是否为 `markdown`。

## 17. 备份创建与下载

- 前置条件：项目可正常访问 `/maintenance`。
- 操作步骤：点击创建备份并下载。
- 预期结果：`backups/` 生成 zip，下载接口可用，备份不包含 `.env.local`。
- 失败排查：检查 `backups/` 权限、zip 依赖、日志。

## 18. 孤儿文件检查

- 前置条件：已有数据库和文件。
- 操作步骤：打开 `/maintenance` 或请求 `/api/maintenance/orphans`。
- 预期结果：列出孤儿文件、缺失文件、导出文件、备份文件。
- 失败排查：检查本地文件路径、数据库 localPath。

## 19. 安全清理 dry-run

- 前置条件：已有维护页面。
- 操作步骤：点击默认清理验证，或 POST `/api/maintenance/cleanup` 不传删除开关。
- 预期结果：`dryRun=true`，删除数量为 0。
- 失败排查：确认没有传入 `deleteOldExports=true` 等删除开关。

## 20. GitHub 推送与 tag 检查

- 前置条件：Git remote 已绑定。
- 操作步骤：运行 `git status`、`git log --oneline -5`、`git push origin main`。
- 预期结果：工作区干净，最新提交已推送。
- 失败排查：检查网络、GitHub 权限、远程仓库是否有冲突。

## 21. 预估进度弹窗

- 前置条件：OpenAI 配置可用，已有可执行耗时操作的数据。
- 操作步骤：分别在 `/analyze` 执行图片分析和 Prompt 拆解，在 `/fusion` 执行风格迁移和生成测试图，在 `/generated-images/[id]` 执行生成图评估，在 `/import` 执行 AI 语义整理导入，在 `/prompt-variants/[id]` 执行 AI 润色和生成测试图。
- 预期结果：操作开始后显示中文弹窗，包含操作名称、当前步骤、预估百分比和“此为预估进度”的说明；成功后进度到 100% 并显示已完成；失败后显示中文错误，页面按钮恢复可点击。
- 失败排查：检查对应客户端组件是否渲染 `OperationProgressModal`，检查 hook 是否调用 `startProgress`、`completeProgress` 和 `failProgress`，确认错误信息没有英文堆栈或完整 API Key。

## 22. Prompt 导入保真整理

- 前置条件：OPENAI_TEXT_MODEL 可用。
- 操作步骤：打开 `/import`，选择“AI 语义整理入库，保留原文”，分别测试中文 Prompt、英文 Prompt 和中英混合 Prompt。中文示例：“小红书封面图，一个穿红裙的女人站在雨夜街头，冷色电影感，强对比光影，悬疑小说氛围，标题区留在画面上方”。
- 预期结果：导入成功；`importedRawPrompt` 与原始输入一致；导入记录的 `reversePrompt` 与原始输入一致；不再出现“reversePromptEnglish 必须是英文”；详情页显示“系统保留原始 Prompt 内容，仅做结构化分析整理”；Prompt 拆解能生成 11 个模块，中文 Prompt 的 segment content 可以是中文；PromptVariant 可以用中文模块组合成功。
- 失败排查：检查 `prompt-import-normalization-prompt` 是否仍要求英文化，检查 `PromptSegment.content` 和 `PromptVariant` 组合服务是否仍有英文校验，确认 direct 模式仍不调用 AI。

## 23. Prompt 库批量删除

- 前置条件：`/library` 至少有 2 条可删除的测试 PromptAnalysis；其中至少 1 条包含 PromptSegment、PromptFusion、PromptVariant、标签绑定和合集引用；至少 1 条有关联 ImageAsset 或 GeneratedImage。
- 操作步骤：打开 `/library`，勾选 2 条测试记录，点击“批量删除”，先在确认弹窗点击“取消”，确认记录仍存在；再次点击“批量删除”并点击“确认删除”。
- 预期结果：确认前不会删除任何记录；确认后 `/library` 列表移除被删除记录并清空选择状态；数据库中 PromptAnalysis 被删除；关联 PromptSegment、PromptFusion、PromptVariant、PromptAnalysisTag 被删除；ImageAsset 和 GeneratedImage 仍保留；合集中的 `analysis` 和 `prompt_variant` 引用被清理；未选中的记录不受影响。
- 失败排查：检查 `/api/analyses/batch-delete` 是否只使用前端传入的 selected ids；检查删除服务是否先查询 PromptVariant 再清理 CollectionItem；确认 Prisma cascade 是否仍配置在 PromptAnalysis 关系上。

## 24. 批量逆向 Prompt

- 前置条件：OPENAI_VISION_MODEL 可用，准备 3 张 JPG/PNG/WebP 图片。
- 操作步骤：打开 `/batch-analyze`，尝试选择 101 张图片，确认前端阻止；尝试选择一张超过 40MB 的图片，确认前端阻止；创建任务并上传 3 张正常图片；点击开始分析。
- 预期结果：图片逐张上传，逐张加入 BatchAnalysisItem；前端循环调用 `/api/batch-analyses/[id]/process-next`；每张成功后生成独立 PromptAnalysis 并能跳转 `/library/[analysisId]`；失败项显示错误且不影响其他图片；失败项可重试；刷新 `/batch-analyze/[id]` 后可以继续 pending 项。
- 失败排查：检查上传是否传 `mode=batch_analysis`，检查 `BATCH_MAX_UPLOAD_MB`，检查任务 item 状态和 `process-next` 是否每次只处理 1 张，确认 `/analyze` 单图分析仍可用。

## 25. 批量逆向失败原因提示

- 前置条件：已有批量逆向任务，准备一张极小、空白或内容很少的 PNG。
- 操作步骤：上传该图片并调用 `process-next`，观察 item 失败状态。
- 预期结果：`item.errorMessage` 不再是“未知 AI 错误”；页面显示中文“失败原因”和“建议操作”；如果属于图片过小或不可识别，显示“建议更换更清晰或更大尺寸图片。重试可能仍会失败。”；失败不影响其他 item；重试按钮仍可用。
- 失败排查：检查 `src/lib/ai/errors.ts`、`src/lib/analysis/image-analysis-service.ts` 和批量页面失败提示逻辑。

## 26. 标签治理与合并

- 前置条件：Prompt 库中存在多个近义标签，例如“冷色电影感”“冷色调电影”“蓝绿色电影感”，且这些标签已绑定不同 PromptAnalysis。
- 操作步骤：打开 `/tags`，确认标签统计、分类和等级显示正常。
- 预期结果：页面显示全部标签、活跃标签、已归档标签和未分类标签统计。
- 失败排查：检查 `GET /api/tags/stats` 和 Tag 迁移字段。

- 操作步骤：点击“AI 标签治理”。
- 预期结果：页面只显示合并、分类、层级建议，不自动修改数据库。
- 失败排查：检查 `OPENAI_TEXT_MODEL`、`POST /api/tags/suggest-governance` 和模型 JSON 返回。

- 操作步骤：选择一组合并建议，点击“人工确认合并”。
- 预期结果：source tags 被归档，`mergedIntoId` 指向目标标签，`PromptAnalysisTag` 关联迁移到 target tag，`TagAlias` 创建成功。
- 失败排查：检查 `POST /api/tags/merge` 的去重迁移逻辑和 `@@unique([analysisId, tagId])`。

- 操作步骤：打开 `/library?tagId=目标标签 id`。
- 预期结果：能够找到原来多个近义标签下的 Prompt 图片。
- 失败排查：检查关联是否迁移、归档标签是否仍被错误筛选。

- 操作步骤：打开 `/library/[id]` 的标签管理区。
- 预期结果：已绑定标签显示分类；新增标签下拉按分类分组，并默认不显示已归档标签。
- 失败排查：检查详情页 `allTags` 查询条件和 `AnalysisTagManager`。
