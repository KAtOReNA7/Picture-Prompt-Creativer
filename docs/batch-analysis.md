# 批量逆向 Prompt

页面地址：`/batch-analyze`

详情页：`/batch-analyze/[id]`

## 功能说明

批量逆向用于一次处理多张参考图。前端逐张上传图片，服务端记录任务和每张图片状态，然后由前端循环调用 `process-next`，逐张调用视觉模型完成图片逆向分析。

本阶段不使用后台常驻 worker、WebSocket 或 SSE。页面刷新后，可以通过任务详情页继续处理未完成的 pending 项。

## 限制

- 单个批量任务最多 100 张图片。
- 单张图片最大 40MB。
- 支持格式：JPG、PNG、WebP。
- 默认分析并发为 1，最多允许 2。
- 单张失败不会中断整个任务。

## 为什么不一次性上传 100 张

一次性上传 100 张图片会造成 multipart 请求过大，容易触发浏览器、代理、中转站或 Next.js 请求体限制。当前实现采用逐张上传：

1. 前端选择多张图片。
2. 逐张调用 `/api/images/upload`，并传 `mode=batch_analysis`。
3. 上传成功后调用 `/api/batch-analyses/[id]/items` 加入任务。
4. 前端循环调用 `/api/batch-analyses/[id]/process-next`，每次只处理 1 张。

## 任务状态

- `draft`：任务刚创建。
- `uploading`：上传中，当前阶段主要由页面本地状态展示。
- `ready`：已有图片，待开始。
- `running`：正在处理。
- `paused`：已暂停，正在处理的单张请求会自然结束。
- `completed`：所有 item 都已成功、失败或取消。
- `failed`：任务级失败状态，当前阶段少用。
- `canceled`：已取消，pending / uploaded 项会变为 canceled。

## Item 状态

- `waiting_upload`：等待上传。
- `uploaded`：已上传但未进入待处理队列。
- `pending`：待分析。
- `processing`：正在分析。
- `success`：分析成功，已生成 PromptAnalysis。
- `failed`：分析失败，可重试。
- `canceled`：已取消。

## API

- `POST /api/batch-analyses`：创建任务。
- `GET /api/batch-analyses`：任务列表。
- `GET /api/batch-analyses/[id]`：任务详情。
- `PATCH /api/batch-analyses/[id]`：开始、暂停或取消任务。
- `POST /api/batch-analyses/[id]/items`：上传后加入图片 item。
- `POST /api/batch-analyses/[id]/items/[itemId]/retry`：重试失败项。
- `POST /api/batch-analyses/[id]/process-next`：处理下一张 pending 图片。

## 失败重试

失败项会保留错误信息，不影响其他图片继续处理。点击“重试”后，item 会回到 `pending` 状态，清空错误信息和开始/结束时间，然后可以继续处理。

失败项会显示“失败原因”和“建议操作”。如果错误明显来自图片过小、空白、内容过少、格式异常或内容安全拒绝，页面仍允许重试，但会提示“重试可能仍会失败”。

常见失败原因和处理方式：

- 图片内容过少或尺寸过小：更换更清晰或更大尺寸图片。
- 模型侧无法处理图片：重新导出为 JPG、PNG 或 WebP，再上传。
- 模型返回空内容：通常是图片缺少可识别视觉元素，建议换图。
- 模型返回非 JSON：可能是模型响应异常或中转站返回被截断，可稍后重试。
- 结构化字段缺失：可重试；如果仍失败，说明图片可能缺少可分析内容。
- 视觉模型不支持图片输入：检查 `OPENAI_VISION_MODEL` 配置。
- 请求体图片过大：压缩图片或降低分辨率。
- 中转站超时：降低并发为 1 后重试。
- 内容安全拒绝：更换图片内容或忽略该项。

## 页面刷新后继续

打开 `/batch-analyze/[id]`，系统会读取任务和所有 items。只要任务里仍有 `pending` 项，就可以点击“继续分析”。

## 成本和耗时提醒

批量分析会对每张图片单独调用视觉模型。总耗时和成本取决于图片数量、图片大小、视觉模型响应速度和网络情况。建议先用少量图片测试提示词质量，再扩大批量。

## 常见错误

- 文件过大：单张超过 40MB。
- 格式不支持：不是 JPG、PNG 或 WebP。
- 上传失败：检查 `uploads/images/` 写入权限。
- AI 分析失败：检查 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和视觉模型能力。
- 中转站超时：降低并发为 1 后重试。
- 部分成功部分失败：这是预期行为，失败项可单独重试。
