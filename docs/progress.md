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
