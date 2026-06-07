# 开发进度

## 2026-06-06 阶段 0：环境诊断

已完成：

- 实现 `scripts/check-env.ts`，输出中文环境诊断报告。
- 新增 npm script：`check:env`。
- 保留兼容 script：`check-env`，内部转发到 `check:env`。
- 确认已有 npm script：`typecheck`、`lint`、`build`。
- 诊断脚本会读取 `.env.local`，但不会打印完整 `OPENAI_API_KEY`，只显示是否存在和前后各 4 位。
- 当 `.env.local` 或进程环境中存在 `OPENAI_BASE_URL` 时，脚本会请求 `${OPENAI_BASE_URL}/models` 测试 API 连通性。

本次运行命令：

- `npm run check:env`
- `npm run lint`
- `npm run build`

验证结果：

- `npm run check:env`：通过 7 项，失败 4 项，跳过 4 项；脚本本身执行成功。
- `npm run lint`：通过。
- `npm run build`：通过。

环境诊断摘要：

- `node -v`：v24.16.0，通过。
- `npm -v`：11.13.0，通过。
- `git --version`：git version 2.54.0.windows.1，通过。
- `git remote -v`：失败，当前目录不是 Git 仓库。
- `git ls-remote origin HEAD`：失败，未配置可用的 `origin`。
- `npm config get registry`：`https://registry.npmjs.org/`，通过。
- `https://registry.npmjs.org`：HTTP 200，通过。
- `https://registry.npmmirror.com`：HTTP 200，通过。
- `127.0.0.1:7890`：失败，连接被拒绝。
- `127.0.0.1:10808`：通过，端口可连接。
- `127.0.0.1:10809`：失败，连接被拒绝。
- `.env.local`：不存在，跳过读取环境变量详情。
- `OPENAI_BASE_URL /models`：因 `OPENAI_BASE_URL` 不存在而跳过。

下一步建议：

- 初始化 Git 仓库并配置 GitHub `origin`。
- 创建 `.env.local`，写入 `OPENAI_BASE_URL` 和 `OPENAI_API_KEY` 后重新运行 `npm run check:env`。
- 继续阶段 1：服务端环境变量模块、Prisma Client 初始化和 SQLite 迁移。

## 2026-06-06 阶段 0.5：修复 Git 仓库绑定

已完成：

- 检查当前目录内容，确认 `D:\porject\Picture Prompt Creativer` 是 Picture-Prompt-Creativer 项目根目录。
- 执行 `git init` 初始化本地 Git 仓库。
- 设置默认分支为 `main`。
- 添加远程仓库 `origin`：`https://github.com/KAtOReNA7/Picture-Prompt-Creativer.git`。
- 执行 `git ls-remote origin HEAD`，命令成功但无输出。
- 执行 `git ls-remote --heads origin`，确认远程仓库没有已有分支。
- 本地 Git 提交身份未配置全局值，已仅在当前仓库设置 `user.name=KAtOReNA7` 和 `user.email=KAtOReNA7@users.noreply.github.com`。
- 执行 `git add .`。
- 执行初始化提交：`init: create project skeleton and environment diagnostics`。
- 执行 `git push -u origin main`，成功推送 `main` 并建立 upstream。

结果：

- 本地仓库已绑定 GitHub 远程仓库。
- 远程仓库原本为空，未发生强推或覆盖远程内容。

## 2026-06-06 阶段 1：创建中文 WebUI 骨架

已完成：

- 创建统一中文应用外壳和顶部导航栏，包含：首页、图片逆向分析、Prompt 库、风格迁移、系统设置、环境诊断。
- 创建基础状态组件：`EmptyState`、`LoadingState`、`ErrorState`。
- 创建 Prompt 展示组件：`PromptCard`。
- 完成首页 `/`，展示工具名称、核心定位、功能卡片和核心流程。
- 完成 `/analyze` 图片逆向分析 mock 页面，包含上传区域、分析结果、逆向英文 Prompt 和可替换字段。
- 完成 `/library` Prompt 库 mock 页面，包含搜索框 UI 和 Prompt 卡片列表。
- 完成 `/fusion` 风格迁移 mock 页面，包含原图风格摘要、新需求输入和融合后的英文 Prompt。
- 完成 `/settings` 系统设置 mock 页面，展示模型配置且不显示 API Key 明文。
- 完成 `/diagnostics` 环境诊断 mock 页面，展示正常、警告、未配置状态徽章。
- 调整全局样式为浅色现代运营工具风格。

验证结果：

- `npm run lint`：通过。
- `npm run build`：通过。
- 本地浏览器检查：`/`、`/analyze`、`/library`、`/fusion`、`/settings`、`/diagnostics` 均可访问，页面标题和顶部导航均为中文。

下一步建议：

- 进入阶段 2：建立服务端环境变量模块、Prisma Client 初始化和 SQLite 数据库迁移。
- 后续将 mock 数据替换为真实 API 和数据库数据。

## 2026-06-06 阶段 2：Prisma + SQLite + 图片上传

已完成：

- 将 Prisma 数据模型更新为 `ImageAsset`、`PromptAnalysis`、`PromptSegment`、`PromptFusion`。
- 使用 SQLite provider，数据库连接通过 `DATABASE_URL`，运行时默认值为 `file:./dev.db`。
- 创建服务端 Prisma 工具 `src/lib/db/prisma.ts`，避免 Next.js dev 模式重复创建 `PrismaClient`。
- 新增图片上传接口：`POST /api/images/upload`。
- 新增图片访问接口：`GET /api/images/[id]/file`。
- 图片上传支持 `image/jpeg`、`image/png`、`image/webp`，默认最大 15MB，可通过 `MAX_UPLOAD_MB` 配置。
- 上传文件保存到 `uploads/images/`，文件名使用 `crypto.randomUUID()` 生成，避免中文名和重复名问题。
- 上传成功后写入数据库 `ImageAsset` 记录，并返回图片基础信息和访问路径。
- 更新 `/analyze` 页面，接入真实上传组件，支持点击选择和拖拽上传。
- 上传过程中显示中文 loading，失败时显示中文 error，成功后显示图片预览和基础信息。
- 保留 mock 分析结果，并明确标注“待接入 AI 分析”。
- 新增上传 API 文档 `docs/upload.md`。
- 更新 `.gitignore`，忽略 `.env`、`.env.local`、`dev.db`、`prisma/dev.db`、`uploads/` 和 `uploads/**`。

实现说明：

- Prisma 7 不再支持在 schema datasource 中配置 `url = env("DATABASE_URL")`，与本阶段要求冲突，因此已切换到 Prisma 6.19.3，以保留标准 Prisma schema + SQLite + migrate dev 工作流。
- 当前 Windows 环境下 Prisma 迁移引擎不能自动创建 SQLite 文件；预先创建空的 `prisma/dev.db` 后，`npx prisma migrate dev --name init` 成功执行。该数据库文件已被 Git 忽略。

验证结果：

- `npx prisma generate`：通过。
- `npx prisma migrate dev --name init`：通过，已生成 `prisma/migrations/20260605170806_init/migration.sql`。
- `npm run lint`：通过。
- `npm run build`：通过。
- 上传接口测试：通过，`POST /api/images/upload` 返回 `ok:true`。
- 图片访问接口测试：通过，`GET /api/images/[id]/file` 返回 `HTTP 200 image/png`。

下一步建议：

- 进入阶段 3：接入视觉模型分析接口，基于上传图片生成中文结构化分析和英文 reverse prompt。
- 增加上传记录列表或最近上传图片入口，方便从 `/analyze` 页面复用已上传图片。

## 2026-06-06 阶段 3：OpenAI 兼容客户端和 AI 配置检测

已完成：

- 安装 OpenAI 官方 npm SDK。
- 创建 AI 配置模块 `src/lib/ai/models.ts`。
- 创建 OpenAI 客户端模块 `src/lib/ai/openai-client.ts`，加入 `server-only` 保护。
- 创建 AI 错误解析模块 `src/lib/ai/errors.ts`，将常见错误转换为中文提示。
- 创建 AI 状态检测接口 `GET /api/settings/ai-status`。
- 状态接口返回 API Key 是否配置、掩码 API Key、Base URL、文本模型、视觉模型、图片模型、`/models` 连通性、可用模型数量、匹配到的目标模型和中文 warning。
- 状态接口不会返回完整 API Key；未配置 `.env.local` 或 API Key 时也会正常返回“未配置”状态。
- 更新 `/settings`，从 `/api/settings/ai-status` 获取真实配置状态，支持“重新检测”。
- 更新 `/diagnostics`，保留阶段 0 mock 诊断展示，并新增 AI 配置检测区块。
- 创建 AI 配置文档 `docs/ai-config.md`。

验证结果：

- `npm run check:env`：脚本执行成功；通过 13 项，失败 2 项，跳过 0 项。失败项为本机代理端口 `7890`、`10809` 未监听。
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `GET /api/settings/ai-status`：可用。
- `/models` 连通性：HTTP 200，状态接口显示可连通。
- 可用模型数量：2。
- 模型匹配：已匹配到文本模型、视觉模型和图片模型。
- 浏览器检查：`/settings` 和 `/diagnostics` 均显示 AI 配置检测、掩码 API Key、`/models 正常`，页面文本未出现完整 API Key。

说明：

- 本阶段只封装客户端和配置检测，不实现图片分析；图片分析留到阶段 4。

## 2026-06-06 阶段 4：图片逆向分析

已完成：

- 新增图片分析 Prompt 模板 `src/lib/ai/prompts/image-analysis-prompt.ts`。
- 新增图片分析结构化输出类型和运行时校验 `src/lib/ai/schemas/image-analysis.ts`。
- 新增 JSON 容错解析工具 `src/lib/ai/json.ts`，支持直接 JSON、JSON 代码块和文本中的第一个完整 JSON 对象。
- 新增图片分析服务 `src/lib/analysis/image-analysis-service.ts`。
- 新增图片分析接口 `POST /api/images/analyze`。
- `/analyze` 页面接入真实 AI 分析：上传成功后可点击“开始 AI 分析”，分析成功后展示真实结构化结果。
- 分析结果保存到 `PromptAnalysis` 表，`rawJson` 保存模型返回的完整 JSON。
- 页面展示模板标题、整体描述、主体、风格、年代感、构图、色彩、光影、材质、情绪、传播潜力、评分、标签、可替换字段、英文 reverse prompt 和英文 negative prompt。
- reverse prompt 和 negative prompt 支持一键复制。
- 新增分析文档 `docs/image-analysis.md`。

验证结果：

- `npm run check:env`：脚本执行成功；通过 13 项，失败 2 项，跳过 0 项。失败项为本机代理端口 `7890`、`10809` 未监听。
- `npm run lint`：通过。
- `npm run typecheck`：通过。
- `npm run build`：通过。
- `POST /api/images/upload`：通过。
- `POST /api/images/analyze`：通过。
- 数据库验证：`PromptAnalysis` 记录数从 0 增加到 1。
- reverse prompt：英文。
- negative prompt：英文。
- 浏览器检查：`/analyze` 可访问，包含上传区域、“开始 AI 分析”按钮和“不保证逐像素复刻原图”提示。

实现说明：

- 当前 OpenAI 兼容中转在非流式调用下会返回 SSE 字符串，因此图片分析服务使用 OpenAI SDK 的流式模式收集内容，再进行 JSON 容错解析和字段校验。

## 2026-06-06 阶段 5：Prompt 拆解和可替换字段标注

已完成：

- 新增 Prompt 拆解提示词 `src/lib/ai/prompts/prompt-segmentation-prompt.ts`。
- 新增 Prompt 拆解结构化校验 `src/lib/ai/schemas/prompt-segmentation.ts`。
- 新增 `prompt-segmentation-service`，基于 `PromptAnalysis` 中已有 reversePrompt、negativePrompt 和风格字段拆解，不重新分析图片。
- 新增 `POST /api/prompts/segment`。
- `/analyze` 页面新增“拆解 Prompt”按钮，分析成功后可调用拆解接口。
- `/analyze` 页面新增 Prompt 模块卡片，展示中文模块名、type、英文 content、是否可替换、中文替换建议和一键复制。
- 可替换模块显示“可替换”，建议保留模块显示“建议保留”。
- 拆解结果保存到 `PromptSegment` 表；再次拆解同一 analysis 时会先删除旧 segments，再保存新结果。
- `/library` 页面轻量展示 mock 记录是否已有 Prompt 模块。
- 新增文档 `docs/prompt-segmentation.md`。

验证结果：

- `npm run check:env`：脚本执行成功；通过 13 项，失败 2 项，跳过 0 项。失败项为本机代理端口 `7890`、`10809` 未监听。
- `npm run lint`：通过。
- `npm run build`：通过。
- `POST /api/images/upload`：通过。
- `POST /api/images/analyze`：通过。
- `POST /api/prompts/segment`：通过。
- 拆解结果：返回 11 个模块，type 为 `subject`、`scene`、`composition`、`style`、`color`、`lighting`、`camera`、`texture`、`mood`、`text_area`、`negative`。
- 数据库验证：`PromptSegment` 写入 11 条记录。
- 重复拆解验证：再次点击同一 analysis 的“拆解 Prompt”后，旧 segments 被删除并重建，数据库仍保持 11 条记录，没有重复堆积。
- 浏览器检查：`/analyze` 可访问，包含“开始 AI 分析”和“拆解 Prompt”按钮。

## 2026-06-06 阶段 6：风格迁移融合 Prompt

已完成：

- 新增风格迁移提示词 `src/lib/ai/prompts/prompt-fusion-prompt.ts`。
- 新增风格迁移结构化校验 `src/lib/ai/schemas/prompt-fusion.ts`。
- 新增 `prompt-fusion-service`，基于已有 `PromptAnalysis` 和 `PromptSegment` 生成融合 prompt，不重新分析图片。
- 新增 `POST /api/prompts/fuse`，生成并保存 `PromptFusion`。
- 新增 `GET /api/analyses`，用于 `/fusion` 选择历史分析记录。
- `/fusion` 页面从 mock 改为真实功能：可选择历史分析、查看原图预览和风格摘要、输入新需求、生成英文 finalPromptEnglish 和 negativePromptEnglish。
- `/analyze` 页面分析成功后新增“去风格迁移”入口，跳转 `/fusion?analysisId=xxx`。
- `/library` 页面读取真实分析记录，显示 Prompt 模块数量、风格迁移数量，并提供“用于风格迁移”入口。
- 新增文档 `docs/prompt-fusion.md`。

验证结果：

- `npm run check:env`：脚本执行成功；通过 13 项，失败 2 项，跳过 0 项。失败项为本机代理端口 `7890`、`10809` 未监听。
- `npm run lint`：通过。
- `npm run build`：通过。
- `POST /api/images/upload`：通过。
- `POST /api/images/analyze`：通过。
- `POST /api/prompts/segment`：通过。
- `POST /api/prompts/fuse`：通过。
- `GET /api/analyses`：通过。
- 页面测试：`/fusion` 可选择历史分析记录并生成风格迁移 Prompt。
- 数据库验证：`PromptFusion` 记录数从 0 增加到 1。
- `finalPromptEnglish`：英文。
- `negativePromptEnglish`：英文。
- `/api/analyses` 能返回 `fusionsCount`，本次测试记录显示为 1。
- 浏览器检查：`/fusion` 有“生成风格迁移 Prompt”入口，`/library` 显示风格迁移数量。
## 阶段 7：Prompt 库、详情页与导入工作流

完成内容：

- 将 `PromptAnalysis.imageId` 调整为可选，支持无参考图的纯 Prompt 模板。
- 新增 `GET /api/analyses/[id]`，返回分析详情、参考图、PromptSegment 和 PromptFusion 历史。
- 新增 `DELETE /api/analyses/[id]`，删除分析记录并级联删除拆解和融合记录，但保留 ImageAsset 与本地图片文件。
- 扩展 `GET /api/analyses`，支持 `q`、`hasSegments`、`hasFusions`、`sort` 和 `limit`。
- 新增 `POST /api/prompts/import`，支持导入已有英文 Prompt 和可选参考图。
- 新增 `/library/[id]` 详情页，展示原图、分析字段、reverse prompt、negative prompt、Prompt 模块和风格迁移历史。
- 更新 `/library`，支持真实搜索、筛选、排序、详情跳转、重新拆解和删除。
- 新增 `/import` 页面，用于导入已有 Prompt。
- 更新首页和顶部导航，加入“导入 Prompt”入口。
- 调整 `/fusion`，支持选择无参考图的 PromptAnalysis 记录。
- 新增 `docs/prompt-library.md`。
- 可选的 `/api/prompts/organize` 本阶段未实现，后续如需要可作为独立阶段接入 OPENAI_TEXT_MODEL。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name prompt_library_import`：成功
- `npm run lint`：成功
- `npm run build`：成功

页面与接口测试：

- `/api/prompts/import`：成功导入无参考图英文 Prompt。
- `/api/analyses`：支持搜索、拆解状态筛选和排序，返回无参考图记录。
- `/api/analyses/[id]`：成功返回详情、segments 和 fusions。
- `/api/prompts/segment`：成功生成 11 个模块；重复拆解后仍保持 11 个模块，旧结果被替换。
- `/api/prompts/fuse`：成功生成英文 finalPromptEnglish / negativePromptEnglish，并新增 PromptFusion。
- `DELETE /api/analyses/[id]`：成功删除临时导入记录，删除后详情接口返回 404。
- `/library`、`/library/[id]`、`/fusion?analysisId=...`、`/import`：浏览器渲染正常，无错误覆盖层。
## 阶段 8：image2 / GPT Image 测试图生成

完成内容：

- 新增 `GeneratedImage` Prisma 模型，用于记录单张测试图生成结果。
- 新增数据库迁移 `image_generation`。
- 显式忽略 `uploads/generated/`，避免生成图片进入 Git。
- 新增 `src/lib/generation/image-generation-service.ts`，封装服务端图片生成、英文 Prompt 校验、参数校验、`b64_json` / `url` 返回兼容、本地文件保存和数据库写入。
- 新增 `POST /api/images/generate`，使用 `OPENAI_IMAGE_MODEL` 调用 `openai.images.generate`。
- 新增 `GET /api/generated-images/[id]/file`，读取本地生成图片并返回正确 Content-Type。
- 新增 `GET /api/generated-images`，支持按 `sourceType`、`sourceId`、`limit` 查询生成历史。
- 更新 `/fusion`，风格迁移成功后可选择 size / quality / format 并生成测试图。
- 更新 `/library/[id]`，支持用 reverse prompt 和每条 fusion prompt 生成测试图，并展示当前分析相关的生成图历史。
- 更新 `/library`，卡片显示生成图数量。
- 新增 `docs/image-generation.md`。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name image_generation`：成功
- `npm run check:env`：成功
- `npm run lint`：成功
- `npm run build`：成功

页面与接口测试：

- `/api/images/generate`：成功调用 `OPENAI_IMAGE_MODEL=gpt-image-2` 生成测试图。
- reverse prompt 生成测试图：成功，新增 `GeneratedImage`，文件保存到 `uploads/generated/`。
- fusion prompt 生成测试图：成功，新增 `GeneratedImage`，文件保存到 `uploads/generated/`。
- `/api/generated-images/[id]/file`：成功返回图片，Content-Type 为 `image/png`。
- `/api/generated-images`：成功按 `sourceType` 和 `sourceId` 查询生成记录。
- `/library/[id]`：成功展示 reverse prompt / fusion prompt 生成入口和生成图历史。
- `/fusion`：风格迁移成功后显示“生成测试图”按钮和 size / quality / format 选择。
- `/library`：卡片成功显示生成图数量。

## 阶段 9：生成图效果评估与 Prompt 迭代优化

完成内容：

- 新增 `GeneratedImageEvaluation` Prisma 模型，并给 `GeneratedImage` 增加 `evaluations` 关系。
- 新增数据库迁移 `generated_image_evaluation`。
- 新增 `src/lib/ai/prompts/generated-image-evaluation-prompt.ts`，用于生成图效果评估。
- 新增 `src/lib/ai/schemas/generated-image-evaluation.ts`，校验评分、中文建议和英文 improved prompt。
- 新增 `src/lib/generation/generated-image-evaluation-service.ts`，读取生成图文件、补充 PromptAnalysis / PromptFusion 上下文、调用视觉模型、解析 JSON 并保存评估记录。
- 新增 `POST /api/generated-images/[id]/evaluate`。
- 扩展 `GET /api/generated-images`，返回 `evaluationCount` 和最近一次评估摘要。
- 新增 `/generated-images` 生成图列表页。
- 新增 `/generated-images/[id]` 生成图详情与评估页，支持“评估生成效果”和“用改良 Prompt 再生成”。
- 更新顶部导航，增加“生成图”入口。
- 更新 `/library/[id]`，生成图历史显示最近评分、查看详情和评估入口。
- 更新 `/fusion` 的生成面板，生成成功后可跳转生成图详情评估。
- 新增 `docs/generated-image-evaluation.md`。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name generated_image_evaluation`：成功
- `npm run check:env`：成功
- `npm run lint`：成功
- `npm run build`：成功

页面与接口测试：

- `/api/generated-images/[id]/evaluate`：成功调用 `OPENAI_VISION_MODEL` 评估生成图。
- `GeneratedImageEvaluation`：成功新增记录。
- `improvedPrompt`：英文。
- `improvedNegativePrompt`：英文。
- “用改良 Prompt 再生成”：成功调用 `/api/images/generate`，新图保存为 `custom_prompt` 来源。
- `/generated-images`：可访问，显示生成图列表和最近评估评分。
- `/generated-images/[id]`：可访问，显示生成参数、评估结果、改良 Prompt 和再生成入口。
- `/library/[id]`：生成图历史显示最近评分、查看详情和评估入口。
- `/fusion`：顶部导航包含“生成图”；生成测试图成功后由生成面板提供详情和评估跳转。

## 阶段 10：Prompt 模板编辑器与变量替换版本

完成内容：

- 新增 `PromptVariant` Prisma 模型，并给 `PromptAnalysis` 增加 `variants` 关系。
- 新增数据库迁移 `prompt_variants`。
- 新增 `src/lib/analysis/prompt-variant-service.ts`，支持按已拆解模块组合英文 Prompt、保存模板版本，并调用文本模型进行 AI 润色。
- 新增 `POST /api/prompt-variants/compose`。
- 新增 `POST /api/prompt-variants/[id]/polish`。
- 新增 `GET /api/prompt-variants` 和 `GET /api/prompt-variants/[id]`。
- 更新 `/library/[id]`，在 PromptSegment 后增加模板编辑器，支持启用/禁用模块、编辑英文片段、编辑负面 Prompt、保存版本、AI 润色和生成测试图。
- 更新 `/library/[id]`，新增模板版本列表，展示版本来源、Prompt、negative prompt、复制、润色、生成测试图和详情跳转。
- 新增 `/prompt-variants/[id]` 模板版本详情页，展示版本来源、原分析入口、组合 Prompt、负面 Prompt、编辑模块 JSON 和生成历史。
- 更新 `/library` 和 `/api/analyses`，展示并返回 `variantsCount`。
- 更新首页，增加模板编辑与版本保存说明。
- 新增 `docs/prompt-variants.md`。
- 更新 `docs/image-generation.md`，说明 `custom_prompt` 的 `sourceId` 可以来自 `PromptVariant.id` 或生成图评估记录。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name prompt_variants`：成功，数据库已同步
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功

页面与接口测试：

- `/api/prompt-variants/compose`：成功，基于 11 个模块组合出英文 PromptVariant。
- `/api/prompt-variants/[id]/polish`：成功调用 `OPENAI_TEXT_MODEL`，新增 AI 润色版本。
- `/api/prompt-variants`：成功按 `analysisId` 查询模板版本。
- `/api/prompt-variants/[id]`：成功返回版本详情和基于该版本生成的测试图历史。
- `/library/[id]`：HTTP 200，显示模板编辑器和模板版本区块，无 Next 错误覆盖层。
- `/prompt-variants/[id]`：HTTP 200，显示组合 Prompt、负面 Prompt、编辑模块 JSON 和生成历史，无 Next 错误覆盖层。
- `/library`：HTTP 200，分析卡片显示模板版本数量。
- 从 PromptVariant 生成测试图：成功，`sourceType=custom_prompt`，`sourceId=PromptVariant.id`，新增生成图记录并保存文件。

## 阶段 11：分类标签、合集与批量管理

完成内容：

- 新增 `Tag`、`PromptAnalysisTag`、`Collection`、`CollectionItem` Prisma 模型。
- 新增数据库迁移 `tags_collections_export`。
- 新增 `.gitignore` 忽略 `exports/`。
- 新增标签 API：`GET/POST /api/tags`、`PATCH/DELETE /api/tags/[id]`。
- 新增分析标签绑定 API：`POST /api/analyses/[id]/tags`、`POST /api/analyses/[id]/tags/quick-add`。
- 新增 AI 推荐标签 API：`POST /api/analyses/[id]/suggest-tags`，只返回建议，不自动保存。
- 扩展 `/api/analyses`，支持 `tagId` / `tagName` 筛选，并返回标签数组。
- 新增合集 API：`GET/POST /api/collections`、`GET/PATCH/DELETE /api/collections/[id]`、`POST /api/collections/[id]/items`、`DELETE /api/collections/[id]/items/[itemId]`。
- 新增导出 API：`POST /api/export`、`GET /api/export/[filename]`，支持 JSON / Markdown。
- 新增 `/collections` 合集列表与创建页面。
- 新增 `/collections/[id]` 合集详情、编辑、按类型筛选、移除素材和导出页面。
- 更新顶部导航，增加“合集”入口。
- 更新 `/library`，支持标签筛选、卡片标签展示、多选、批量添加标签、批量加入合集和批量导出。
- 更新 `/library/[id]`，新增标签管理、快速新建标签、AI 推荐标签、加入合集。
- 更新 `/prompt-variants/[id]` 和 `/generated-images/[id]`，支持加入合集。
- 更新首页，增加标签、合集和批量导出说明。
- 新增 `docs/tags-collections-export.md`。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name tags_collections_export`：成功
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功

页面与接口测试：

- `/api/tags`：成功创建测试标签。
- `/api/analyses/[id]/tags`：成功覆盖式绑定标签。
- `/api/analyses/[id]/tags/quick-add`：成功自动创建并绑定标签。
- `/api/analyses/[id]/suggest-tags`：成功调用 `OPENAI_TEXT_MODEL`，返回 9 条建议，未自动保存。
- `/api/analyses?tagId=...`：成功按标签筛选 Prompt 库。
- `/api/collections`：成功创建测试合集。
- `/api/collections/[id]/items`：成功添加 `analysis`、`prompt_variant`、`generated_image` 三类素材。
- `/api/collections/[id]`：成功返回三类 item 摘要。
- `/collections`：HTTP 200，无错误覆盖层。
- `/collections/[id]`：HTTP 200，无错误覆盖层。
- `/api/export`：成功导出合集 JSON 和 Markdown。
- `/api/export/[filename]`：JSON / Markdown 下载接口均可用。
- `/library`：HTTP 200，支持标签筛选和批量操作 UI。
- `/library/[id]`：HTTP 200，支持标签管理、AI 推荐标签和加入合集 UI。
- `/prompt-variants/[id]`：HTTP 200，支持加入合集 UI。
- `/generated-images/[id]`：HTTP 200，支持加入合集 UI。

## 阶段 12：产品化加固、数据备份与本地运维工具

完成内容：

- 新增 `/maintenance` 本地运维页面，并在顶部导航增加“运维”入口。
- 新增 `src/lib/maintenance/maintenance-service.ts`，集中处理数据库计数、目录大小、备份、孤儿文件检查、清理和备份下载路径校验。
- 新增 `src/lib/logging/app-logger.ts`，写入 `logs/app.log`，自动掩码 API Key、忽略图片 base64、截断超长内容。
- 新增 `/api/maintenance/status`，返回数据库、存储和 AI 配置状态。
- 新增 `/api/maintenance/backup`，生成包含 `prisma/dev.db`、`uploads/`、`exports/`、`docs/*.md` 的 zip 备份。
- 新增 `/api/maintenance/backups` 和 `/api/maintenance/backups/[filename]`。
- 新增 `/api/maintenance/orphans`，检查孤儿上传文件、孤儿生成图文件、缺失本地文件记录、导出文件和备份文件。
- 新增 `/api/maintenance/cleanup`，默认 dry-run，不显式传 true 不删除文件。
- 新增 `/api/maintenance/logs`，返回最近 100 条日志。
- 轻量接入关键错误日志：AI 图片分析失败、图片生成失败、生成图保存失败、生成图评估失败、上传保存失败、导出失败、备份失败。
- 增强 `/diagnostics`，显示数据库记录数量、文件夹大小和最近 5 条错误日志。
- 更新 `.gitignore`，忽略 `backups/` 和 `logs/`。
- 新增 `README.md`。
- 新增 `docs/backup-restore.md`。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面与接口测试：

- `/maintenance`：HTTP 200，无错误覆盖层。
- `/api/maintenance/status`：成功返回数据库计数、目录大小和 AI 配置状态。
- `/api/maintenance/backup`：成功生成 zip 备份。
- `/api/maintenance/backups`：成功返回备份列表。
- `/api/maintenance/backups/[filename]`：成功下载备份 zip。
- `/api/maintenance/orphans`：成功返回孤儿文件和缺失文件检查，当前孤儿文件 0、缺失文件 0。
- `/api/maintenance/cleanup`：默认 dry-run 成功，未删除任何文件。
- `/api/maintenance/logs`：成功返回日志列表。
- `/diagnostics` 新增状态：HTTP 200，显示数据库记录数量、文件夹大小和最近错误日志。
- `backups/`：成功生成 zip 文件，并已被 Git 忽略。

## 阶段 13：验收测试、体验修复与回归清单

完成内容：

- 新增 `docs/acceptance-test.md`，覆盖 20 项人工验收流程。
- 新增 `docs/api-regression.md`，列出主要 API 的方法、路径、用途、参数、失败场景和副作用。
- 统一共享 `CopyButton`：复制成功显示中文提示，复制失败显示中文错误。
- 移除 `/analyze` 本地复制按钮，改用共享复制组件。
- 统一主要 Prompt、Negative Prompt、图片地址、下载地址复制文案。
- `/generated-images` 列表新增“复制图片地址”。
- `/collections/[id]` 导出后显示下载地址并支持“复制下载地址”。
- 增强 `EmptyState`，支持真实跳转入口。
- `/library`、`/fusion`、`/generated-images` 空状态补充下一步跳转。
- `/collections` 和 `/collections/[id]` 空状态补充中文说明和下一步入口。
- 导出 JSON / Markdown 补齐生成图评估摘要，包括评分、摘要和改良 Prompt 信息。
- README 增补第一次启动、完整使用流程、常见工作流和数据备份建议。
- `package.json` version 更新为 `0.5.0`，并在 `/settings` 显示 `appVersion`。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面抽查：

- `/library`：HTTP 200，无错误覆盖层。
- `/library/[id]`：HTTP 200，无错误覆盖层。
- `/fusion`：HTTP 200，无错误覆盖层。
- `/generated-images`：HTTP 200，无错误覆盖层。
- `/generated-images/[id]`：HTTP 200，无错误覆盖层。
- `/collections`：HTTP 200，无错误覆盖层。
- `/collections/[id]`：HTTP 200，无错误覆盖层。
- `/maintenance`：HTTP 200，无错误覆盖层。
- `/settings`：HTTP 200，无错误覆盖层，显示 `appVersion: 0.5.0`。
- `/diagnostics`：HTTP 200，无错误覆盖层。
- JSON 导出字段：包含 analysis 基础信息、tags、reversePrompt、negativePrompt、segments、fusions、variants、generatedImages 和 evaluations 摘要。

## 阶段 14A：中文 / 英文 / 模糊 Prompt 导入

完成内容：

- `PromptAnalysis` 新增 `importedRawPrompt`、`importedPromptLanguage`、`importMode` 字段，用于区分原始导入内容和整理后的 `reversePrompt`。
- 新增 `src/lib/ai/prompts/prompt-import-normalization-prompt.ts`，用于中文、英文、中英混合和模糊 Prompt 的 AI 语义整理。
- 新增 `src/lib/ai/schemas/prompt-import-normalization.ts`，校验检测语言、中文结构化字段、5-10 个中文标签、英文 reverse prompt 和英文 negative prompt。
- 新增 `src/lib/analysis/prompt-import-service.ts`，统一处理语义整理导入和直接导入，支持参考图校验与标签 upsert / 绑定。
- 重构 `/api/prompts/import`，支持 `rawPrompt`，兼容旧版 `reversePrompt`，成功返回 normalization 和 warnings。
- 重构 `/import` 页面，移除手动结构化字段，支持标题、原始 Prompt、Negative Prompt、标签、参考图和导入模式。
- `/library/[id]` 新增导入来源区块，展示原始导入 Prompt、检测语言、导入模式和 AI 整理后的 reversePrompt。
- 更新 `docs/prompt-library.md` 和 `README.md`，补充中文 Prompt、模糊描述、语义整理导入、直接导入和字段关系说明。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name import_fuzzy_prompt`：成功，生成并应用 `20260606073422_import_fuzzy_prompt`
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面与接口测试：

- `/import`：HTTP 200。
- 中文模糊 Prompt 语义导入：成功创建 `PromptAnalysis`，`importedRawPrompt` 保留中文原文，`importedPromptLanguage=zh`，`reversePrompt` 和 `negativePrompt` 均为英文。
- 对语义导入记录调用 `/api/prompts/segment`：成功生成 11 个模块，模块 `content` 无中文。
- 英文 Prompt 语义导入：成功，`importedPromptLanguage=en`，`reversePrompt` 为英文。
- 中文 Prompt 直接导入：成功，`importMode=direct`，不拒绝中文，返回“直接导入模式不会自动转英文”的 warning。
- `/library/[id]`：HTTP 200，显示导入来源、原始导入 Prompt、检测语言和 AI 整理后的 reversePrompt。

## 阶段 14B：全局预估操作进度弹窗

完成内容：

- 新增 `src/components/ui/operation-progress-modal.tsx`，展示操作标题、当前步骤、预估进度条、百分比、成功状态、失败状态和关闭按钮。
- 新增 `src/hooks/use-operation-progress.ts`，支持 `startProgress`、`setStep`、`completeProgress`、`failProgress`、`resetProgress` 和 `hideProgress`，请求进行中自动推进到 85%，不会在完成前自动到 100%。
- 新增 `src/lib/ui/operation-progress-presets.ts`，覆盖图片分析、Prompt 拆解、风格迁移、图片生成、生成图评估、Prompt 导入语义整理、PromptVariant AI 润色和 AI 推荐标签。
- `/analyze` 接入图片分析和 Prompt 拆解进度弹窗。
- `/fusion` 接入风格迁移进度弹窗。
- 共享 `ImageGenerationPanel` 接入图片生成进度弹窗，覆盖 `/fusion` 和 `/library/[id]` 中的测试图生成。
- `/generated-images/[id]` 接入生成图评估和改良 Prompt 再生成进度弹窗。
- `/library/[id]` 顶部重新拆解 Prompt 接入进度弹窗。
- 标签管理中的 AI 推荐标签接入进度弹窗。
- `PromptVariantActions` 接入 AI 润色和生成测试图进度弹窗，覆盖 `/library/[id]` 和 `/prompt-variants/[id]`。
- `/import` 的 AI 语义整理导入接入进度弹窗；直接导入保持快速操作。
- README 和验收测试文档补充“预估进度”说明。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面抽查：

- `/analyze`：HTTP 200，图片分析和 Prompt 拆解操作已接入进度弹窗。
- `/fusion`：HTTP 200，风格迁移已接入进度弹窗；生成测试图由共享 `ImageGenerationPanel` 接入。
- `/import`：HTTP 200，AI 语义整理导入已接入进度弹窗。
- `/generated-images`：HTTP 200。
- `/generated-images/[id]`：HTTP 200，生成图评估和改良 Prompt 再生成已接入进度弹窗。
- `/library`：HTTP 200。
- `/library/[id]`：HTTP 200，重新拆解、测试图生成、AI 推荐标签、PromptVariant AI 润色和测试图生成已接入进度弹窗。
- `/prompt-variants/[id]`：HTTP 200，AI 润色和测试图生成已接入进度弹窗。

## 阶段 14C：生成图 originAnalysisId 血缘归属

完成内容：

- `GeneratedImage` 新增 `originAnalysisId` 字段和索引，用于记录生成图最终归属的 `PromptAnalysis.id`。
- 更新图片生成服务，在创建生成图前根据显式 `originAnalysisId` 或 `sourceType/sourceId` 推断归属。
- 支持从 `analysis_reverse_prompt`、`fusion_prompt`、`PromptVariant`、`GeneratedImageEvaluation.improvedPrompt` 反推原始 PromptAnalysis。
- `/api/images/generate` 支持可选 `originAnalysisId`，返回生成图时包含该字段。
- `/api/generated-images` 支持 `originAnalysisId` 查询，并兼容历史 `sourceType/sourceId` 规则，避免重复返回。
- 新增 `scripts/backfill-generated-image-origin.ts` 和 `npm run backfill:generated-origin`，用于回填历史生成图。
- `/library/[id]` 生成图历史改为按 originAnalysisId 查询，展示 reversePrompt、fusionPrompt、PromptVariant 和 improvedPrompt 再生成图片。
- `/generated-images/[id]` 显示 `originAnalysisId` 和“所属原图 / Prompt 分析”入口。
- 生成图详情页“用改良 Prompt 再生成”会继承当前生成图的 `originAnalysisId`。
- `/fusion` 生成测试图时显式传入当前 analysisId。
- `/prompt-variants/[id]` 和库详情中的 PromptVariant 生成测试图时显式传入 variant.analysisId。
- `/library` 和 `/api/analyses` 的 generatedCount 改为优先按 originAnalysisId 统计，并兼容旧规则。
- 导出 JSON / Markdown 中的 generatedImages 增加 `originAnalysisId`，并能包含 improvedPrompt 再生成图。
- 更新 `docs/image-generation.md`、`docs/generated-image-evaluation.md` 和 `docs/api-regression.md`。

验证结果：

- `npx prisma generate`：成功
- `npx prisma migrate dev --name generated_image_origin_analysis`：成功，生成并应用 `20260606081639_generated_image_origin_analysis`
- `npm run backfill:generated-origin`：成功；总记录数 9，已有 0，成功回填 9，无法推断 0
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面与接口测试：

- `/api/generated-images?originAnalysisId=...`：HTTP 200，返回归属生成图，包含回填后的生成图。
- `/generated-images/[id]`：HTTP 200，显示生成图详情。
- `/library/[id]`：HTTP 200，生成图历史按 originAnalysisId 查询。
- `/api/analyses`：generatedCount 已包含 originAnalysisId 归属生成图。
- JSON 导出：成功，导出内容包含 `originAnalysisId` 和归属生成图。

## 阶段 14D：导入 Prompt 保真分析整理

完成内容：

- 重构 `prompt-import-normalization-prompt`，导入语义整理只做 Prompt 分析，不翻译、不改写、不重排原始 Prompt。
- 重构 `prompt-import-normalization` schema，移除 `reversePromptEnglish` / `negativePromptEnglish` 字段要求，不再做英文校验。
- 重构 `prompt-import-service`：`semantic` 和 `semantic_preserve` 均按保真语义整理处理，`reversePrompt=rawPrompt`，`importedRawPrompt=rawPrompt`，`negativePrompt` 原样保存。
- `importMode` 新增语义值 `semantic_preserve`；旧 `semantic` 兼容为 `semantic_preserve`，`direct` 保持不调用 AI。
- `/api/prompts/import` 支持 `importMode=semantic_preserve`，兼容旧字段 `reversePrompt`。
- `/import` 页面文案改为“AI 语义整理入库，保留原文”和“直接入库”，删除自动英文化承诺。
- `/library/[id]` 导入来源区块显示“系统保留原始 Prompt 内容，仅做结构化分析整理”，并将导入记录的 `reversePrompt` 标为“当前可执行 Prompt”。
- Prompt 拆解提示词和 schema 放开语言限制，segment content 可以是中文、英文或中英混合。
- PromptVariant 组合逻辑放开英文限制，中文模块和中英混合模块均可组合。
- 图片生成服务移除英文 Prompt 硬校验，支持中文 Prompt 后续直接生成图片。
- 更新 README、`docs/prompt-library.md`、`docs/acceptance-test.md`、`docs/api-regression.md` 和相关页面文案。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听
- `npm run lint`：成功
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning

页面与接口测试：

- 中文 Prompt 语义整理导入：成功；analysisId `cmq29p7zm0000k14ga20zwwvn`，`importedRawPrompt`、`reversePrompt` 和 `negativePrompt` 均与输入原文一致。
- 中文 Prompt 拆解：成功；生成 11 个模块，中文 content 模块数 11。
- 中文模块组合 PromptVariant：成功；variantId `cmq29q9uq001fk14gpv44bcpx`，组合结果保留中文内容。
- 英文 Prompt 语义整理导入：成功；analysisId `cmq29srp4001gk14gemcd2r1h`，原文保存一致，无中文保真 warning。
- 中英混合 Prompt 语义整理导入：成功；analysisId `cmq29szn2002bk14gn529nppu`，原文保存一致，并返回保真 warning。
- direct 中文导入：成功；analysisId `cmq29szoj0030k14gwdxwyudp`，不调用 AI 结构化分析，返回 direct 模式 warning。
- `/import` 浏览器抽查：页面显示“保留原文”“中文、英文、中英混合”和“不改写”相关文案，未出现自动英文化承诺。
- `/library/[id]` 浏览器抽查：导入来源区块显示原始导入 Prompt、检测语言、当前可执行 Prompt 和保真说明。
- 原图片逆向分析记录抽查：analysisId `cmq1f8yv3000yk1vcp72mamko` 的 `importedRawPrompt` 为空，`reversePrompt` 不含中文，图片逆向分析的英文 reverse prompt 保存逻辑未被改动。

## 阶段 14D 补充验收：中文 Prompt 图片生成实测

测试目标：

- 确认图片生成服务不再强制英文 Prompt。
- 确认中文和中英混合 Prompt 可以成功调用 `OPENAI_IMAGE_MODEL`。
- 确认 `GeneratedImage.prompt` 和 `GeneratedImage.negativePrompt` 保留输入原文。
- 确认 `/generated-images/[id]` 和 originAnalysisId 归属查询正常。

测试结果：

- 中文 Prompt 生成：成功；generatedImageId `cmq2b1xql0003k13ghwmlrh7d`，模型 `gpt-image-2`，`promptEquals=true`，`negativeEquals=true`，`promptHasChinese=true`，`negativeHasChinese=true`。
- 中文 Prompt 生成图文件：成功；`/api/generated-images/cmq2b1xql0003k13ghwmlrh7d/file` HTTP 200，Content-Type `image/png`。
- 中文 Prompt 生成图详情页：成功；`/generated-images/cmq2b1xql0003k13ghwmlrh7d` HTTP 200，页面包含中文 Prompt。
- 中文 Prompt origin 归属：成功；`/api/generated-images?originAnalysisId=cmq29p7zm0000k14ga20zwwvn` 能查询到该生成图。
- 中英混合 Prompt 生成：成功；generatedImageId `cmq2b3kf20004k13gm6joaf7p`，模型 `gpt-image-2`，`promptEquals=true`，`negativeEquals=true`，`promptHasChinese=true`，`negativeHasChinese=true`。
- 中英混合 Prompt 生成图文件：成功；`/api/generated-images/cmq2b3kf20004k13gm6joaf7p/file` HTTP 200，Content-Type `image/png`。
- 中英混合 Prompt 生成图详情页：成功；`/generated-images/cmq2b3kf20004k13gm6joaf7p` HTTP 200，页面包含原始中英混合 Prompt。
- 中英混合 Prompt origin 归属：成功；`/api/generated-images?originAnalysisId=cmq29p7zm0000k14ga20zwwvn` 能查询到该生成图。
- 生成过程中未出现“Prompt 必须是英文”或类似英文强制校验错误。

说明：

- 最终有效测试使用 ASCII `\uXXXX` Unicode 转义构造 JSON 请求体，避免 Windows 控制台管道把中文输入转成 mojibake。
- 早期两次通过 PowerShell 管道传入 Node 的测试请求发生客户端侧编码损坏，生成图记录为 `cmq2avmk60000k13gt71nuvqy` 和 `cmq2axk310001k13g4ksko2lt`；它们不计入本次保真验收结论。

## 阶段 14F：Prompt 库批量删除

完成内容：

- 新增 `src/lib/analysis/prompt-analysis-delete-service.ts`，统一处理单条和批量 PromptAnalysis 删除。
- 新增 `POST /api/analyses/batch-delete`，支持最多 100 条 PromptAnalysis 批量删除，返回 `deletedCount`、`notFoundIds` 和保留的生成图数量。
- 增强 `DELETE /api/analyses/[id]`，单条删除也会清理合集中的 `analysis` 和 `prompt_variant` 弱引用。
- `/library` 批量操作栏新增“批量删除”按钮，无选择时禁用，选择后弹出中文二次确认。
- 批量删除确认文案明确：只删除 Prompt 记录及其拆解、风格迁移、模板版本和标签绑定，不删除原始图片、生成图和本地文件。
- 删除成功后从当前列表移除已删除记录，清空选中状态，并显示中文成功提示。
- `/library/[id]` 和卡片单条删除文案改为“该操作只删除 Prompt 记录，不删除原始图片和生成图”。
- `/collections/[id]` 对历史无效合集条目继续容错，缺失素材显示“该素材已删除”，不跳转到无效详情。
- 更新 `docs/prompt-library.md`、`docs/api-regression.md` 和 `docs/acceptance-test.md`。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听。
- `npm run lint`：成功。
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning。

页面与接口测试：

- `/library` 批量删除按钮：无选择时禁用，选择 2 条记录后显示“已选择 2 条”并启用。
- 批量删除二次确认：弹窗标题为“确认批量删除？”，正文明确原始图片、生成图和本地文件不会删除。
- 取消删除：点击“取消”后弹窗关闭，2 条测试记录仍保留，选择状态仍为 2 条。
- 确认删除：点击“确认删除”后，当前列表中 2 条测试记录消失，选择状态清空，并显示“已删除 2 条 Prompt 记录，原始图片和生成图已保留。”。
- `POST /api/analyses/batch-delete`：成功删除 2 条测试 PromptAnalysis，返回 `deletedCount=2`、`notFoundIds=[]`、`skippedGeneratedImagesCount=2`。
- 数据库级联验证：被删 analysis 的 PromptSegment、PromptFusion、PromptVariant、PromptAnalysisTag 均删除。
- 保留边界验证：相关 ImageAsset 仍存在，GeneratedImage 仍存在。
- 合集引用验证：`analysis` 和 `prompt_variant` 类型 CollectionItem 已清理，`generated_image` 类型 CollectionItem 保留。
- `DELETE /api/analyses/[id]` 单条删除：返回“已删除 Prompt 记录，原始图片和生成图已保留。”，并同样清理合集 analysis / prompt_variant 弱引用。
- `/api/maintenance/orphans`：HTTP 200，`ok=true`，可继续检查孤儿文件和缺失文件。

## 阶段 15：批量逆向 Prompt 任务系统

完成内容：

- Prisma 新增 `BatchAnalysisTask` 和 `BatchAnalysisItem`，用于记录批量任务和每张图片的上传/分析状态。
- 上传接口 `/api/images/upload` 支持 `mode=batch_analysis`，批量模式默认单张最大 40MB，可通过 `BATCH_MAX_UPLOAD_MB` 配置。
- 新增 `src/lib/batch/batch-analysis-service.ts`，集中封装任务创建、item 加入、计数重算、失败重试、任务状态更新和 `process-next`。
- 新增批量任务 API：`POST /api/batch-analyses`、`GET /api/batch-analyses`、`GET/PATCH /api/batch-analyses/[id]`、`POST /api/batch-analyses/[id]/items`、`POST /api/batch-analyses/[id]/items/[itemId]/retry`、`POST /api/batch-analyses/[id]/process-next`。
- 新增 `/batch-analyze` 和 `/batch-analyze/[id]`，支持创建任务、选择/拖拽多图、前端校验 100 张和 40MB、逐张上传、开始/暂停/继续处理、失败项重试和成功跳转 Prompt 库。
- 顶部导航新增“批量逆向”。
- 新增 `docs/batch-analysis.md`，并更新 README、API 回归清单和验收测试文档。

验证结果：

- `npx prisma generate`：成功。
- `npx prisma migrate dev --name batch_image_analysis`：首次未设置 `DATABASE_URL` 失败；设置 `DATABASE_URL=file:./dev.db` 后成功，生成并应用 `20260606202044_batch_image_analysis`。
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听。
- `npm run lint`：成功。
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning。

页面与接口测试：

- `/batch-analyze`：HTTP 200。
- `/batch-analyze/[id]`：HTTP 200，任务详情刷新后可读取 items 和状态。
- `POST /api/batch-analyses`：创建任务成功；`totalCount=101` 时返回 400 和中文错误。
- `/api/images/upload` 批量模式：3 张 PNG 逐张上传成功并加入 BatchAnalysisItem；41MB 图片在 `mode=batch_analysis` 下返回“文件过大，当前最大允许 40MB”。
- `POST /api/batch-analyses/[id]/items`：上传后加入任务成功，item 状态为 `pending`。
- `POST /api/batch-analyses/[id]/process-next` 成功路径：使用已有真实图片 `19.png` 处理成功，生成 PromptAnalysis `cmq2sxk0t000ek1v82n7501jh`，任务状态为 `completed`，`/library/[analysisId]` HTTP 200。
- `POST /api/batch-analyses/[id]/process-next` 失败路径：使用极小测试 PNG 时单项失败，错误记录到 item，不影响其他 pending 项继续处理。
- 失败项重试：`POST /api/batch-analyses/[id]/items/[itemId]/retry` 成功将 failed item 改回 `pending`；再次处理失败时接口顶层仍为 `ok=true`，单项结果为 `itemOk=false`，不会中断队列。
- `/analyze`：HTTP 200，单图分析页面可访问，现有单图流程未改动。

## 版本检查点：v0.6.0-batch-analysis

- 检查日期：2026-06-07。
- 检查前 `git status --short`：工作区干净。
- 创建 tag：`v0.6.0-batch-analysis`。
- tag 说明：`v0.6.0: batch image reverse prompt analysis workflow`。
- 推送结果：`git push origin v0.6.0-batch-analysis` 成功。
- tag 确认：`git tag --list` 已显示 `v0.6.0-batch-analysis`。
- 该检查点对应阶段 15：批量图片逆向 Prompt 分析工作流。

## 阶段 15A：批量逆向失败原因提示优化

完成内容：

- 增强 `src/lib/ai/errors.ts`，对图片过小、内容过少、模型侧无法处理图片、请求体图片过大、视觉模型不支持图片输入、中转站超时和内容安全拒绝等情况返回更具体中文错误。
- 增强 `src/lib/analysis/image-analysis-service.ts`，模型空返回、非 JSON、结构化字段缺失时返回更明确中文原因，并写入安全日志。
- 批量任务 item 继续保存具体 `errorMessage`，不改变队列主流程，不影响其他 item 继续处理。
- `/batch-analyze` 和 `/batch-analyze/[id]` 的失败 item 显示“失败原因”和“建议操作”；图片过小或不可识别时提示“建议更换更清晰或更大尺寸图片。重试可能仍会失败。”。
- 更新 `docs/batch-analysis.md` 和 `docs/acceptance-test.md`。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听。
- `npm run lint`：成功。
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning。

页面与接口测试：

- 使用 1x1 极小 PNG 创建批量任务并调用 `process-next`：item 失败，接口顶层 `ok=true`，`itemOk=false`，不影响任务流程。
- 失败 item 的 `errorMessage` 已变为“模型未能识别这张图片，可能是图片过小、内容过少、空白或模型侧无法处理。建议更换更清晰或更大尺寸图片。”，不再是“未知 AI 错误，请检查服务配置后重试。”。
- `/batch-analyze/[id]`：HTTP 200，页面包含“失败原因”/“建议操作”展示。
- 失败项重试：成功将 item 改回 `pending`。
- `/analyze`：HTTP 200，单图分析页面可访问，现有单图流程未改动。

## 阶段 16A：标签治理系统

完成内容：

- Prisma 扩展 `Tag`，新增 `category`、`level`、`parentId`、`normalizedName`、`isArchived`、`mergedIntoId`、`updatedAt` 和父子层级关系。
- 新增 `TagAlias` 模型，用于记录合并后的历史别名。
- 新增标签治理工具 `src/lib/tags/tag-governance.ts`，统一分类、等级和规范名校验。
- 新增 `GET /api/tags/stats`，支持标签统计、分类统计、使用次数统计，以及 `category`、`level`、`q`、`includeArchived` 筛选。
- 新增 `POST /api/tags/suggest-governance`，调用 `OPENAI_TEXT_MODEL` 只返回合并、分类和层级建议，不自动执行。
- 新增 `POST /api/tags/merge`，在用户人工确认后迁移 `PromptAnalysisTag` 关联、归档 source tags，并创建 `TagAlias`。
- 新增 `PATCH /api/tags/[id]/governance`，支持更新分类、等级、父级、规范名和归档状态。
- 新增 `/tags` 标签治理页面，显示统计、分类筛选、AI 治理建议、人工确认合并、分类等级编辑和查看图片入口。
- `/library` 标签筛选升级为按分类分组，默认隐藏已归档标签，并显示当前筛选标签名称。
- `/library/[id]` 标签管理默认只显示未归档标签，下拉按分类分组，已绑定标签显示分类。
- 新增 `docs/tag-governance.md`，并更新 API 回归清单和验收测试文档。

验证结果：

- `npx prisma generate`：成功。
- `npx prisma migrate dev --name tag_governance`：首次未设置 `DATABASE_URL` 失败；设置 `DATABASE_URL=file:./dev.db` 后成功，生成并应用 `20260607075111_tag_governance`。
- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听。
- `npm run lint`：成功。
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning。

页面与接口测试：

- `/tags`：HTTP 200。
- `GET /api/tags/stats`：成功，返回当前标签总数、活跃标签、已归档标签、未分类标签和使用次数。
- 创建 2 个测试近义标签并绑定到 1 条 PromptAnalysis：成功。
- `POST /api/tags/merge`：成功，`movedRelationsCount=1`、`archivedTagsCount=2`，target tag 创建别名。
- `/library?tagId=targetTagId`：HTTP 200，可用合并后的 target tag 筛选。
- `POST /api/tags/suggest-governance`：成功返回 AI 建议，包含合并建议、分类建议；只返回建议，没有自动修改数据库。

## 阶段 16B：Prompt 库分页与紧凑列表

完成内容：

- `GET /api/analyses` 增加服务端分页，支持 `page`、`pageSize=24/48/96`、`q`、`tagId`、`tagName`、`category`、`hasSegments`、`hasFusions`、`sort`。
- `/api/analyses` 返回结构升级为 `items` + `pagination`，并保留 `analyses` 兼容字段。
- 列表 API 精简字段，不再返回超长 reversePrompt、negativePrompt、rawJson、完整 segments、完整 fusions、完整 variants 或完整 generatedImages。
- `/library` 改为服务端分页，默认每页 24 条，支持切换 48 / 96。
- `/library` 卡片精简为预览图、标题、最多 4 个标签、模块数量、迁移次数、版本数量、生成图数量、时间、查看详情和删除。
- 保留当前页多选、批量添加标签、批量加入合集、批量导出和批量删除。
- 单条删除使用中文二次确认，删除 Prompt 记录但保留原始图片和生成图。
- 标签筛选继续按 category 分组，默认隐藏已归档标签，已归档当前筛选标签会显示提示。
- 更新 `docs/prompt-library.md`、`docs/api-regression.md` 和 `docs/acceptance-test.md`。

验证结果：

- `npm run check:env`：成功，OpenAI `/models` HTTP 200；常见代理端口 7890 和 10809 未监听。
- `npm run lint`：成功。
- `npm run build`：成功；Turbopack 对维护服务文件追踪有非阻断 warning。

页面与接口测试：

- `GET /api/analyses?page=1&pageSize=24`：成功，返回 24 条，`pagination.pageSize=24`。
- `GET /api/analyses?page=1&pageSize=48`：成功，返回 48 条，`pagination.pageSize=48`。
- `GET /api/analyses?page=1&pageSize=96`：成功，返回 96 条，`pagination.pageSize=96`。
- 当前总记录数：177。
- 默认列表 API 不返回 `reversePrompt` 长字段。
- `GET /api/analyses?limit=50&view=fusion`：成功，兼容 `/fusion` 所需的 `styleSummary` 等摘要字段。
- `/library?page=2&pageSize=48`：HTTP 200，URL 分页状态可刷新保留。
- `/library/[id]`：HTTP 200，详情页完整信息仍可访问。
- `POST /api/analyses/batch-delete` 空 ids 测试：返回中文错误“ids 必须是非空数组”，未误删数据。

## 版本检查点：v0.7.0-library-governance

- 检查日期：2026-06-07。
- 检查前 `git status --short`：工作区干净。
- 创建 tag：`v0.7.0-library-governance`。
- tag 说明：`v0.7.0: tag governance and paginated prompt library`。
- 推送结果：`git push origin v0.7.0-library-governance` 成功。
- tag 确认：`git tag --list` 已显示 `v0.7.0-library-governance`。
- 该检查点对应阶段 16A 和阶段 16B：标签治理系统、标签归档合并、AI 标签整理建议、Prompt 库服务端分页和高密度列表。
