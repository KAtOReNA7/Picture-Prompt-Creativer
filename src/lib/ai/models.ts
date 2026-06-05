import "server-only";

const DEFAULT_BASE_URL = "https://linkapi.shop/v1";

export type AiConfig = {
  hasApiKey: boolean;
  maskedApiKey: string | null;
  baseURL: string;
  textModel: string | null;
  visionModel: string | null;
  imageModel: string | null;
};

export type RequiredAiConfig = AiConfig & {
  apiKey: string;
  textModel: string;
  visionModel: string;
  imageModel: string;
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function maskApiKey(apiKey: string | null): string | null {
  if (!apiKey) {
    return null;
  }

  if (apiKey.length <= 8) {
    return "已配置，密钥较短，已隐藏完整内容";
  }

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

export function getAiConfig(): AiConfig {
  const apiKey = readEnv("OPENAI_API_KEY");

  return {
    hasApiKey: Boolean(apiKey),
    maskedApiKey: maskApiKey(apiKey),
    baseURL: readEnv("OPENAI_BASE_URL") ?? DEFAULT_BASE_URL,
    textModel: readEnv("OPENAI_TEXT_MODEL"),
    visionModel: readEnv("OPENAI_VISION_MODEL"),
    imageModel: readEnv("OPENAI_IMAGE_MODEL"),
  };
}

export function requireAiConfig(): RequiredAiConfig {
  const config = getAiConfig();
  const apiKey = readEnv("OPENAI_API_KEY");
  const textModel = config.textModel;
  const visionModel = config.visionModel;
  const imageModel = config.imageModel;
  const missing: string[] = [];

  if (!apiKey) missing.push("OPENAI_API_KEY");
  if (!config.baseURL) missing.push("OPENAI_BASE_URL");
  if (!textModel) missing.push("OPENAI_TEXT_MODEL");
  if (!visionModel) missing.push("OPENAI_VISION_MODEL");
  if (!imageModel) missing.push("OPENAI_IMAGE_MODEL");

  if (missing.length > 0) {
    throw new Error(`AI 配置缺失：${missing.join("、")}。请在 .env.local 中补充后重试。`);
  }

  if (!apiKey || !textModel || !visionModel || !imageModel) {
    throw new Error("AI 配置缺失，请在 .env.local 中补充后重试。");
  }

  return {
    ...config,
    apiKey,
    textModel,
    visionModel,
    imageModel,
  };
}
