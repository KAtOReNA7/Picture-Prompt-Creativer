# Picture Prompt Creativer

中文 WebUI 工具，用于图片 Prompt 逆向分析、Prompt 拆解、风格迁移、测试图生成、生成图评估、模板版本管理、标签合集整理和本地运维备份。

## 核心功能

- 上传图片并调用视觉模型生成中文结构化分析。
- 生成英文 reverse prompt 和 negative prompt。
- 将 Prompt 拆解为可替换模块。
- 输入新需求并融合原风格，生成新的 image2 Prompt。
- 保存 Prompt 库、PromptVariant、风格迁移记录和生成图。
- 评估生成图效果并生成改良 Prompt。
- 使用标签、合集和导出功能整理素材。
- 使用运维页面检查数据库、文件、备份、孤儿文件和错误日志。

## 本地启动

### 第一次启动

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

访问：

```text
http://localhost:3000
```

建议第一次启动后依次打开：

1. `/diagnostics`：确认环境、Git、OpenAI `/models` 状态。
2. `/settings`：确认 API Key 只显示掩码，模型名匹配。
3. `/maintenance`：确认数据库统计、文件夹大小和备份功能。

## 完整使用流程

1. 上传图片，或导入已有 Prompt / 中文模糊描述。
2. 生成图片逆向分析或保存无图 Prompt。
3. 拆解 Prompt 模块，标记可替换字段。
4. 输入新需求，做风格迁移。
5. 生成测试图。
6. 评估生成图效果。
7. 使用改良 Prompt 再生成。
8. 在 Prompt 库中编辑模板版本。
9. 添加标签，建立合集。
10. 导出 JSON / Markdown，定期创建备份。

## 常见工作流

### 从图片开始

打开 `/analyze`，上传图片，点击“开始 AI 分析”，再点击“拆解 Prompt”。之后可以在 `/fusion` 输入新需求，生成新的 image2 Prompt。

### 从已有 Prompt 开始

打开 `/import`，粘贴中文、英文或中英混合 Prompt。推荐选择“AI 语义整理导入”，系统会保留原始内容，并生成适合后续拆解、风格迁移和测试图生成的英文 reverse prompt。

### 从中文 Prompt 开始

打开 `/import`，在“原始 Prompt / 模糊描述”中填写中文画面描述，例如“冷色电影感，一个孤独女人站在雨夜街头，适合悬疑小说小红书封面”。导入后进入详情页查看原始中文 Prompt、检测语言和 AI 整理后的英文 Prompt。

### 从模糊描述开始

如果还没有完整 Prompt，可以只写主体、气质和用途，例如“复古胶片感、适合咖啡品牌海报、温暖但不要太商业”。语义整理模式会保守补齐构图、色彩、光影和材质信息。直接导入模式只做存档，不会自动转英文。

### 从 Prompt 库复用

打开 `/library`，使用搜索、标签筛选和排序找到已有记录。进入详情后复制 Prompt、编辑模板版本，或加入合集。

### 生成图后评估和改良

打开 `/generated-images/[id]`，点击评估。查看评分、问题和改良 Prompt，再用改良 Prompt 生成新图。

### 建立合集并导出

打开 `/collections` 创建合集。可以从 `/library` 批量加入 analysis，也可以从 PromptVariant 或 GeneratedImage 详情加入合集。进入合集详情后导出 JSON 或 Markdown。

## 数据备份建议

- 每次完成一批重要 Prompt 或生成图后，在 `/maintenance` 创建备份。
- 换电脑前先创建备份 zip，再复制到新电脑恢复。
- 不要把 `.env.local`、`prisma/dev.db`、`uploads/`、`exports/`、`backups/` 提交到 GitHub。

## .env.local 示例

不要提交 `.env.local` 到 GitHub。

```env
DATABASE_URL="file:./dev.db"
OPENAI_BASE_URL="https://linkapi.shop/v1"
OPENAI_API_KEY="sk-xxxx"
OPENAI_TEXT_MODEL="你的文本模型"
OPENAI_VISION_MODEL="你的视觉模型"
OPENAI_IMAGE_MODEL="你的图片模型"
MAX_UPLOAD_MB="15"
```

## 常用命令

```bash
npm run check:env
npm run lint
npm run build
npm run dev
```

## 数据库迁移

```bash
npx prisma generate
npx prisma migrate dev --name your_migration_name
```

SQLite 数据库默认位于：

```text
prisma/dev.db
```

该文件已被 `.gitignore` 忽略。

## 备份与恢复

运维页面：

```text
/maintenance
```

备份包含：

- `prisma/dev.db`
- `uploads/`
- `exports/`
- `docs/*.md`

备份不包含：

- `.env.local`
- `OPENAI_API_KEY`
- `node_modules`
- `.next`

恢复时请先停止 dev server，解压备份中的 `prisma/dev.db` 和 `uploads/`，再执行：

```bash
npm install
npx prisma generate
npm run dev
```

不要用备份覆盖新的 `.env.local`。

## GitHub 同步

代码可以提交到 GitHub；本地数据文件不会提交：

- `.env.local`
- `prisma/dev.db`
- `uploads/`
- `exports/`
- `backups/`
- `logs/`

常用同步：

```bash
git status
git add .
git commit -m "message"
git push origin main
```

## 常见问题

### npm install 卡住

检查当前 registry：

```bash
npm config get registry
```

也可以运行：

```bash
npm run check:env
```

### OPENAI_BASE_URL 不通

检查 `.env.local` 中的 `OPENAI_BASE_URL`，然后访问 `/settings` 或 `/maintenance` 查看 `/models` 连通性。

### 图片上传失败

确认图片格式为 JPEG、PNG 或 WebP，并检查 `MAX_UPLOAD_MB`。

### 图片生成失败

确认 `OPENAI_IMAGE_MODEL` 已配置且模型支持图片生成。查看 `/maintenance` 的最近错误日志。

### dev.db 丢失

如果有备份，从 `/maintenance` 生成的 zip 中恢复 `prisma/dev.db`。如果没有备份，只能重新迁移并重新导入数据。

### 换电脑如何恢复

1. 克隆 GitHub 仓库。
2. 执行 `npm install`。
3. 解压备份中的 `prisma/dev.db`、`uploads/`、`exports/`。
4. 新建自己的 `.env.local`。
5. 执行 `npx prisma generate`。
6. 执行 `npm run dev`。
