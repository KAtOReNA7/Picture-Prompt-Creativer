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
