import type { OperationProgressConfig } from "@/hooks/use-operation-progress";

export const imageAnalysisProgress: OperationProgressConfig = {
  title: "正在分析图片",
  steps: [
    { label: "准备图片", percent: 10 },
    { label: "调用视觉模型", percent: 35 },
    { label: "分析风格、构图与色彩", percent: 60 },
    { label: "生成 reverse prompt", percent: 80 },
    { label: "保存分析结果", percent: 95 },
  ],
};

export const promptSegmentationProgress: OperationProgressConfig = {
  title: "正在拆解 Prompt",
  steps: [
    { label: "读取分析记录", percent: 15 },
    { label: "调用文本模型", percent: 40 },
    { label: "拆分 Prompt 模块", percent: 70 },
    { label: "保存 11 个模块", percent: 90 },
  ],
};

export const promptFusionProgress: OperationProgressConfig = {
  title: "正在生成风格迁移 Prompt",
  steps: [
    { label: "读取原图风格", percent: 15 },
    { label: "融合新需求", percent: 45 },
    { label: "生成英文 Prompt", percent: 75 },
    { label: "保存迁移记录", percent: 90 },
  ],
};

export const imageGenerationProgress: OperationProgressConfig = {
  title: "正在生成测试图",
  steps: [
    { label: "准备 Prompt", percent: 10 },
    { label: "调用 image2 模型", percent: 40 },
    { label: "接收图片结果", percent: 75 },
    { label: "保存生成图", percent: 90 },
  ],
};

export const imageEvaluationProgress: OperationProgressConfig = {
  title: "正在评估生成图",
  steps: [
    { label: "读取生成图", percent: 10 },
    { label: "调用视觉模型", percent: 40 },
    { label: "分析 Prompt 匹配度", percent: 65 },
    { label: "生成改良 Prompt", percent: 85 },
    { label: "保存评估结果", percent: 95 },
  ],
};

export const promptImportProgress: OperationProgressConfig = {
  title: "正在整理导入 Prompt",
  steps: [
    { label: "读取原始 Prompt", percent: 15 },
    { label: "识别语言和风格", percent: 35 },
    { label: "生成结构化字段", percent: 60 },
    { label: "转换英文 reverse prompt", percent: 80 },
    { label: "保存到 Prompt 库", percent: 95 },
  ],
};

export const promptVariantPolishProgress: OperationProgressConfig = {
  title: "正在 AI 润色 Prompt",
  steps: [
    { label: "读取模板版本", percent: 20 },
    { label: "调用文本模型", percent: 50 },
    { label: "优化英文 Prompt", percent: 80 },
    { label: "保存润色版本", percent: 95 },
  ],
};

export const suggestTagsProgress: OperationProgressConfig = {
  title: "正在推荐标签",
  steps: [
    { label: "读取风格信息", percent: 20 },
    { label: "调用文本模型", percent: 50 },
    { label: "生成标签建议", percent: 80 },
    { label: "返回推荐理由", percent: 95 },
  ],
};
