# 图片上传 API 说明

## 上传图片

- 接口地址：`POST /api/images/upload`
- 请求类型：`multipart/form-data`
- 文件字段名：`file`
- 支持格式：
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- 默认大小限制：15MB
- 可通过环境变量 `MAX_UPLOAD_MB` 调整大小限制。

成功响应示例：

```json
{
  "ok": true,
  "image": {
    "id": "...",
    "filename": "...",
    "originalName": "...",
    "mimeType": "image/png",
    "size": 123,
    "localPath": "...",
    "publicPath": "/api/images/.../file"
  }
}
```

错误响应会返回中文错误信息，例如：

- `未上传文件`
- `文件类型不支持`
- `文件过大`
- `保存失败`
- `数据库写入失败`

## 访问图片文件

- 接口地址：`GET /api/images/[id]/file`
- 参数：`id` 为 `ImageAsset.id`
- 返回：本地图片文件，并带有正确的 `Content-Type`

如果数据库记录不存在或本地文件缺失，会返回中文错误信息。
