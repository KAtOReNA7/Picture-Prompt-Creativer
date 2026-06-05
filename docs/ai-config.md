# AI 配置说明

## .env.local 示例

请在本地创建 `.env.local`，不要把它提交到 GitHub。

```env
DATABASE_URL="file:./dev.db"
OPENAI_BASE_URL="https://linkapi.shop/v1"
OPENAI_API_KEY="sk-..."
OPENAI_TEXT_MODEL="your-text-model"
OPENAI_VISION_MODEL="your-vision-model"
OPENAI_IMAGE_MODEL="your-image-model"
MAX_UPLOAD_MB="15"
```

## 环境变量说明

- `OPENAI_API_KEY`：OpenAI 兼容接口的 API Key。只允许服务端读取，前端不能显示明文。
- `OPENAI_BASE_URL`：OpenAI 兼容接口地址。默认兼容 `https://linkapi.shop/v1`。
- `OPENAI_TEXT_MODEL`：文本模型名称，用于后续 Prompt 拆解、改写和总结。
- `OPENAI_VISION_MODEL`：视觉模型名称，用于后续图片逆向分析。
- `OPENAI_IMAGE_MODEL`：图片生成模型名称，用于后续 image2 Prompt 适配。
- `DATABASE_URL`：SQLite 数据库连接地址，默认建议使用 `file:./dev.db`。
- `MAX_UPLOAD_MB`：图片上传大小限制，默认 15MB。

## 安全提醒

- 不要提交 `.env.local`。
- 不要把 `OPENAI_API_KEY` 写入前端组件。
- 不要在日志、接口响应或错误信息中打印完整 API Key。
- 系统设置页只会显示 API Key 是否存在和掩码结果，例如 `sk-x...yyyy`。

## Base URL

如果使用 linkapi.shop，配置：

```env
OPENAI_BASE_URL="https://linkapi.shop/v1"
```

如果切换到其他 OpenAI 兼容服务，把该值改成对应服务的 `/v1` 地址。

## 模型名不匹配时如何处理

系统设置页会请求 `${OPENAI_BASE_URL}/models` 并尝试匹配目标模型。

如果页面提示未匹配到模型，请根据 `/models` 返回的真实模型名称修改：

```env
OPENAI_TEXT_MODEL="实际文本模型名"
OPENAI_VISION_MODEL="实际视觉模型名"
OPENAI_IMAGE_MODEL="实际图片模型名"
```

修改 `.env.local` 后，重启开发服务并点击“重新检测”。
