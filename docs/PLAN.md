# Picture Prompt Creativer 实施计划

## 目标

开发一个全中文 WebUI，用于图片 prompt 逆向分析、prompt 模块化拆解、风格迁移融合和资料归档。后端通过服务端代码调用 OpenAI 兼容接口，API Key 只从环境变量读取，不进入前端。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- SQLite
- OpenAI 兼容接口：`OPENAI_BASE_URL`，默认 `https://linkapi.shop/v1`

## 阶段 0：环境诊断与项目骨架

- 检查仓库结构和 Git 状态。
- 创建环境诊断脚本 `scripts/check-env.ts`。
- 初始化 Next.js App Router + TypeScript + Tailwind CSS 项目骨架。
- 配置 Prisma + SQLite 基础 schema。
- 配置 `package.json` scripts。
- 运行环境诊断。
- 更新 `docs/progress.md`。

验收命令：

- `npm run check-env`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

## 阶段 1：基础数据库与服务端边界

- 初始化 Prisma Client。
- 创建 Prompt 归档数据模型迁移。
- 创建服务端环境变量读取模块。
- 明确 OpenAI API Key 仅在服务端使用。
- 增加基础错误处理和接口返回结构。

## 阶段 2：图片上传与逆向分析

- 实现图片上传 UI。
- 服务端接收图片并转成视觉模型可用输入。
- 调用视觉模型输出中文结构化分析。
- 结构字段包括画面主体、风格、年代感、构图、色彩、光影、材质、题材卖点、英文 reverse prompt、negative prompt。

## 阶段 3：Prompt 模块化拆解

- 将 reverse prompt 拆分为主体、风格、构图、镜头、色彩、光影、材质、质量词、限制词等模块。
- 标记可替换和建议保留字段。
- 提供中文可编辑界面。

## 阶段 4：新需求融合生成

- 用户输入新的中文需求。
- 系统融合原图风格 prompt 与新需求。
- 输出适合 image2 模型的英文 prompt 和 negative prompt。
- 保留关键风格，同时替换主体或题材。

## 阶段 5：图片和 Prompt 归档

- 支持导入图片和已有 prompt。
- 支持分类保存、搜索、查看详情和复用。
- 保存分析结果、模块拆解和融合记录。

## 阶段 6：体验完善与部署准备

- 完善中文 WebUI 状态、加载、错误提示。
- 增加必要测试。
- 编写部署说明和环境变量说明。
- 完整运行 lint、typecheck、build。
