# 备份与恢复说明

## 备份内容

通过 `/maintenance` 创建的备份 zip 包包含：

- `prisma/dev.db`
- `uploads/`
- `exports/`
- `docs/progress.md`
- `docs/*.md`

## 不会备份的内容

备份不会包含：

- `.env.local`
- `OPENAI_API_KEY`
- `node_modules`
- `.next`
- Git 工作区配置
- 本机代理配置

这样可以避免 API Key 泄露，也减少备份体积。

## 手动备份

推荐使用 `/maintenance` 页面创建备份。

也可以手动复制：

- `prisma/dev.db`
- `uploads/`
- `exports/`
- `docs/`

手动备份时不要复制 `.env.local` 给别人。

## 从 zip 恢复

1. 停止 dev server。
2. 解压备份 zip。
3. 将备份中的 `prisma/dev.db` 放回项目的 `prisma/dev.db`。
4. 将备份中的 `uploads/` 放回项目根目录。
5. 如需恢复导出文件，将备份中的 `exports/` 放回项目根目录。
6. 不要覆盖新的 `.env.local`。
7. 执行：

```bash
npm install
npx prisma generate
npm run dev
```

## 换电脑恢复流程

1. 在新电脑克隆 GitHub 仓库。
2. 执行 `npm install`。
3. 新建 `.env.local`，填入自己的 `OPENAI_API_KEY` 和模型配置。
4. 解压备份 zip。
5. 复制 `prisma/dev.db`、`uploads/`、`exports/` 到新项目。
6. 执行 `npx prisma generate`。
7. 执行 `npm run dev`。
8. 打开 `/maintenance` 检查数据库数量、文件夹大小和孤儿文件。

## 注意事项

- 不要把 `backups/`、`logs/`、`uploads/`、`exports/` 提交到 GitHub。
- 恢复前如果新环境已有重要数据，请先额外备份，避免覆盖。
- 如果恢复后图片无法打开，先检查 `/maintenance` 的孤儿记录和缺失文件检查。
- 如果 AI 功能不可用，先检查 `/settings` 和 `/maintenance` 中的 API 配置状态。
