import "server-only";
import { prisma } from "@/lib/db/prisma";
import { parseAiError } from "@/lib/ai/errors";
import { parseModelJson } from "@/lib/ai/json";
import { getOpenAIClient } from "@/lib/ai/openai-client";
import { requireAiConfig } from "@/lib/ai/models";
import {
  PROMPT_IMPORT_NORMALIZATION_SYSTEM_PROMPT,
  buildPromptImportNormalizationUserPrompt,
} from "@/lib/ai/prompts/prompt-import-normalization-prompt";
import {
  detectPromptLanguage,
  validatePromptImportNormalizationResult,
  type PromptImportMode,
  type PromptImportNormalizationInput,
  type PromptImportNormalizationResult,
} from "@/lib/ai/schemas/prompt-import-normalization";
import { appLog } from "@/lib/logging/app-logger";

type NormalizePromptImportOutput = {
  analysis: {
    id: string;
    imageId: string | null;
    title: string | null;
    styleSummary: string | null;
    visualSubject: string | null;
    composition: string | null;
    colorPalette: string | null;
    lighting: string | null;
    texture: string | null;
    eraFeeling: string | null;
    topicPotential: string | null;
    reversePrompt: string | null;
    negativePrompt: string | null;
    importedRawPrompt: string | null;
    importedPromptLanguage: string | null;
    importMode: string | null;
    createdAt: Date;
  };
  normalization: PromptImportNormalizationResult | null;
  warnings: string[];
};

function cleanTitle(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cleanOptionalText(value: string | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function cleanTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].slice(0, 20);
}

function normalizeImportMode(value: PromptImportMode): "semantic_preserve" | "direct" {
  return value === "direct" ? "direct" : "semantic_preserve";
}

async function requestNormalizationJson(input: PromptImportNormalizationInput): Promise<string> {
  const config = requireAiConfig();
  const client = getOpenAIClient();
  const prompt = buildPromptImportNormalizationUserPrompt(input);
  let rawContent = "";

  try {
    const stream = await client.chat.completions.create({
      model: config.textModel,
      temperature: 0.15,
      response_format: { type: "json_object" },
      stream: true,
      messages: [
        {
          role: "system",
          content: PROMPT_IMPORT_NORMALIZATION_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    for await (const chunk of stream) {
      rawContent += chunk.choices?.[0]?.delta?.content ?? "";
    }
  } catch (error) {
    const parsed = parseAiError(error);
    await appLog({
      level: "error",
      scope: "prompt-import",
      message: "Prompt 语义分析整理失败",
      safeDetail: parsed,
    });
    throw new Error(parsed.message);
  }

  if (!rawContent.trim()) {
    throw new Error("Prompt 语义分析整理失败：模型返回内容为空。");
  }

  return rawContent;
}

async function assertImageExists(imageId: string | undefined): Promise<string | undefined> {
  if (!imageId) return undefined;

  const image = await prisma.imageAsset.findUnique({
    where: { id: imageId.trim() },
    select: { id: true },
  });

  if (!image) {
    throw new Error("关联的参考图片不存在。");
  }

  return image.id;
}

async function bindTags(analysisId: string, tagNames: string[]) {
  const names = cleanTags(tagNames);

  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    await prisma.promptAnalysisTag.upsert({
      where: { analysisId_tagId: { analysisId, tagId: tag.id } },
      update: {},
      create: { analysisId, tagId: tag.id },
    });
  }
}

function warningForLanguage(language: string): string[] {
  if (language === "zh" || language === "mixed") {
    return ["已保留原始 Prompt。中文或中英混合 Prompt 可以直接入库和生成图片。"];
  }

  return [];
}

export async function normalizePromptImport(input: PromptImportNormalizationInput): Promise<NormalizePromptImportOutput> {
  const rawPrompt = input.rawPrompt;
  const rawPromptForValidation = rawPrompt.trim();
  const importMode = normalizeImportMode(input.importMode);
  const title = cleanTitle(input.title);
  const negativePrompt = cleanOptionalText(input.negativePrompt);
  const imageId = await assertImageExists(cleanTitle(input.imageId));
  const inputTags = cleanTags(input.tags);

  if (!rawPromptForValidation) {
    throw new Error("请填写原始 Prompt 或画面描述。");
  }

  if (importMode === "direct") {
    const detectedLanguage = detectPromptLanguage([rawPrompt, negativePrompt].filter(Boolean).join("\n"));
    const analysis = await prisma.promptAnalysis.create({
      data: {
        imageId,
        title: title ?? "手动导入 Prompt",
        reversePrompt: rawPrompt,
        negativePrompt,
        importedRawPrompt: rawPrompt,
        importedPromptLanguage: detectedLanguage,
        importMode: "direct",
        rawJson: JSON.stringify({
          source: "prompt_import",
          importMode: "direct",
          detectedLanguage,
          importedRawPrompt: rawPrompt,
          tags: inputTags,
        }),
      },
    });

    await bindTags(analysis.id, inputTags);

    return {
      analysis,
      normalization: null,
      warnings: ["直接导入模式不会进行 AI 结构化分析。"],
    };
  }

  const rawContent = await requestNormalizationJson({
    ...input,
    rawPrompt,
    title,
    negativePrompt,
    imageId,
    tags: inputTags,
    importMode: "semantic_preserve",
  });
  const parsedJson = parseModelJson(rawContent);

  if (!parsedJson.ok) {
    await appLog({
      level: "error",
      scope: "prompt-import",
      message: "Prompt 语义分析整理返回非 JSON",
      safeDetail: parsedJson.detail ?? parsedJson.error,
    });
    throw new Error(parsedJson.detail ? `${parsedJson.error} ${parsedJson.detail}` : parsedJson.error);
  }

  const normalization = validatePromptImportNormalizationResult(parsedJson.value);
  const detectedLanguage =
    normalization.detectedLanguage === "unknown"
      ? detectPromptLanguage([rawPrompt, negativePrompt].filter(Boolean).join("\n"))
      : normalization.detectedLanguage;
  const tagNames = cleanTags([...inputTags, ...normalization.tags]);
  const warnings = warningForLanguage(detectedLanguage);
  const analysis = await prisma.promptAnalysis.create({
    data: {
      imageId,
      title: title ?? normalization.title,
      styleSummary: normalization.styleSummary,
      visualSubject: normalization.visualSubject,
      composition: normalization.composition,
      colorPalette: normalization.colorPalette,
      lighting: normalization.lighting,
      texture: normalization.texture,
      eraFeeling: normalization.eraFeeling,
      topicPotential: normalization.topicPotential,
      reversePrompt: rawPrompt,
      negativePrompt,
      importedRawPrompt: rawPrompt,
      importedPromptLanguage: detectedLanguage,
      importMode: "semantic_preserve",
      rawJson: JSON.stringify({
        source: "prompt_import",
        importMode: "semantic_preserve",
        importedRawPrompt: rawPrompt,
        normalization: {
          ...normalization,
          detectedLanguage,
        },
        warnings,
      }),
    },
  });

  await bindTags(analysis.id, tagNames);

  return {
    analysis,
    normalization: {
      ...normalization,
      detectedLanguage,
    },
    warnings,
  };
}
