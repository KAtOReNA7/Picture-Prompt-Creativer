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
