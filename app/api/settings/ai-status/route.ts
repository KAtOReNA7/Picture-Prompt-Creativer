import { getAiConfig } from "@/lib/ai/models";
import { parseAiError } from "@/lib/ai/errors";
import OpenAI from "openai";

type ModelInfo = {
  id: string;
  matchedAs: string[];
};

function getApiKey(): string | undefined {
  const value = process.env.OPENAI_API_KEY?.trim();
  return value || undefined;
}

function matchTargetModels(modelIds: string[], targets: Array<[string, string | null]>): ModelInfo[] {
  const matched = new Map<string, Set<string>>();

  for (const [label, target] of targets) {
    if (!target) continue;

    for (const modelId of modelIds) {
      if (modelId === target || modelId.includes(target) || target.includes(modelId)) {
        const labels = matched.get(modelId) ?? new Set<string>();
        labels.add(label);
        matched.set(modelId, labels);
      }
    }
  }

  return Array.from(matched.entries()).map(([id, labels]) => ({
    id,
    matchedAs: Array.from(labels),
  }));
}

export async function GET() {
  const config = getAiConfig();
  const apiKey = getApiKey();
  const warnings: string[] = [];
  let modelsEndpointReachable = false;
  let availableModelCount = 0;
  let matchedModels: ModelInfo[] = [];

  if (!config.hasApiKey || !apiKey) {
    warnings.push("OPENAI_API_KEY 未配置，无法检测 /models 连通性。");
  } else {
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: config.baseURL,
      });
      const models = await client.models.list();
      const modelIds = models.data.map((model) => model.id);

      modelsEndpointReachable = true;
      availableModelCount = modelIds.length;
      matchedModels = matchTargetModels(modelIds, [
        ["文本模型", config.textModel],
        ["视觉模型", config.visionModel],
        ["图片模型", config.imageModel],
      ]);

      if (config.textModel && !matchedModels.some((model) => model.matchedAs.includes("文本模型"))) {
        warnings.push(`未在 /models 中匹配到文本模型：${config.textModel}`);
      }

      if (config.visionModel && !matchedModels.some((model) => model.matchedAs.includes("视觉模型"))) {
        warnings.push(`未在 /models 中匹配到视觉模型：${config.visionModel}`);
      }

      if (config.imageModel && !matchedModels.some((model) => model.matchedAs.includes("图片模型"))) {
        warnings.push(`未在 /models 中匹配到图片模型：${config.imageModel}`);
      }
    } catch (error) {
      const parsed = parseAiError(error);
      warnings.push(`/models 检测失败：${parsed.message}`);
    }
  }

  if (!config.textModel) warnings.push("OPENAI_TEXT_MODEL 未配置。");
  if (!config.visionModel) warnings.push("OPENAI_VISION_MODEL 未配置。");
  if (!config.imageModel) warnings.push("OPENAI_IMAGE_MODEL 未配置。");

  return Response.json({
    hasApiKey: config.hasApiKey,
    maskedApiKey: config.maskedApiKey,
    baseURL: config.baseURL,
    textModel: config.textModel,
    visionModel: config.visionModel,
    imageModel: config.imageModel,
    modelsEndpointReachable,
    availableModelCount,
    matchedModels,
    warnings,
  });
}
