# 图片逆向分析 API 说明

## 接口地址

- `POST /api/images/analyze`

## 请求体

```json
{
  "imageId": "图片 ID"
}
```

`imageId` 来自图片上传接口 `POST /api/images/upload` 返回的 `image.id`。

## 成功返回

```json
{
  "ok": true,
  "analysis": {
    "id": "...",
    "imageId": "...",
    "title": "...",
    "styleSummary": "...",
    "visualSubject": "...",
    "composition": "...",
    "colorPalette": "...",
    "lighting": "...",
    "texture": "...",
    "eraFeeling": "...",
    "topicPotential": "...",
    "reversePrompt": "...",
    "negativePrompt": "...",
    "createdAt": "..."
  },
  "result": {
    "title": "中文标题",
    "imageSummary": "中文整体画面描述",
    "subject": "中文画面主体",
    "style": "中文风格类型",
    "eraFeeling": "中文年代感或文化气质",
    "composition": "中文构图方式",
    "colorPalette": "中文色彩体系",
    "lighting": "中文光影特点",
    "texture": "中文材质和画面质感",
    "mood": "中文情绪氛围",
    "topicPotential": "中文选题和商业传播潜力",
    "reversePromptEnglish": "英文 reverse prompt",
    "negativePromptEnglish": "英文 negative prompt",
    "replaceableFields": [],
    "tags": [],
    "qualityScore": 8,
    "commercialPotentialScore": 8
  }
}
```

## 字段说明

- `title`：适合作为图片风格模板名称的中文标题。
- `imageSummary`：整体画面描述。
- `subject`：画面主体。
- `style`：风格类型。
- `eraFeeling`：年代感、文化气质或时代氛围。
- `composition`：构图方式、镜头距离、主体位置和视觉引导。
- `colorPalette`：主色、辅助色、色彩关系和饱和度倾向。
- `lighting`：光源方向、强弱、轮廓光、反射和阴影。
- `texture`：材质、颗粒、清晰度、画面触感。
- `mood`：情绪氛围。
- `topicPotential`：商业传播、选题卖点和适用场景。
- `reversePromptEnglish`：英文 reverse prompt，用于 image2 / GPT Image 类模型生成相似风格画面。
- `negativePromptEnglish`：英文 negative prompt，用于减少低质量、错误构图、文字和畸形问题。
- `replaceableFields`：可替换字段和替换建议。
- `qualityScore`：画面质量评分，范围 1-10。
- `commercialPotentialScore`：商业传播潜力评分，范围 1-10。

## reverse prompt 的用途

`reversePromptEnglish` 用来提取图片中可迁移的视觉风格、构图、色彩、光影、质感和主题表达。后续可以把主体、场景、情绪或颜色替换成新需求，用于风格迁移。

## 为什么不能保证 100% 复刻

逆向分析只能基于图片提取视觉特征和 prompt 表达，无法还原原图的完整生成参数、随机种子、训练数据、后期处理和模型内部细节。因此结果是风格迁移参考，不保证逐像素复刻原图。

## 常见错误

- `图片不存在`：数据库中没有找到对应的 `ImageAsset`。
- `图片文件不存在`：数据库记录存在，但本地文件已经被删除或路径失效。
- `AI 配置缺失`：`OPENAI_API_KEY`、`OPENAI_VISION_MODEL` 等环境变量未配置。
- `模型返回格式异常`：模型没有返回严格 JSON，或字段不符合结构要求。
- `模型不支持图片输入`：当前 `OPENAI_VISION_MODEL` 不是视觉模型，或中转服务不支持图片输入。
- `网络超时`：中转站、代理或模型服务响应超时。
