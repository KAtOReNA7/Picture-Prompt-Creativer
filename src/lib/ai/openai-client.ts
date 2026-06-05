import "server-only";
import OpenAI from "openai";
import { requireAiConfig } from "./models";

export function getOpenAIClient(): OpenAI {
  const config = requireAiConfig();

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}
