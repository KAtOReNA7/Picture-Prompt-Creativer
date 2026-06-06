import { normalizePromptImport } from "@/lib/analysis/prompt-import-service";

type ImportBody = {
  title?: unknown;
  rawPrompt?: unknown;
  reversePrompt?: unknown;
  negativePrompt?: unknown;
  imageId?: unknown;
  tags?: unknown;
  importMode?: unknown;
};

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
    .filter(Boolean);
}

export async function POST(request: Request) {
  let body: ImportBody;

  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  const rawPrompt = cleanText(body.rawPrompt) ?? cleanText(body.reversePrompt);
  const importMode = body.importMode === "direct" ? "direct" : "semantic_preserve";

  try {
    const result = await normalizePromptImport({
      title: cleanText(body.title),
      rawPrompt: rawPrompt ?? "",
      negativePrompt: cleanText(body.negativePrompt),
      imageId: cleanText(body.imageId),
      tags: cleanTags(body.tags),
      importMode,
    });

    return Response.json({
      ok: true,
      analysis: {
        id: result.analysis.id,
        imageId: result.analysis.imageId,
        title: result.analysis.title,
        styleSummary: result.analysis.styleSummary,
        visualSubject: result.analysis.visualSubject,
        composition: result.analysis.composition,
        colorPalette: result.analysis.colorPalette,
        lighting: result.analysis.lighting,
        texture: result.analysis.texture,
        eraFeeling: result.analysis.eraFeeling,
        topicPotential: result.analysis.topicPotential,
        reversePrompt: result.analysis.reversePrompt,
        negativePrompt: result.analysis.negativePrompt,
        importedRawPrompt: result.analysis.importedRawPrompt,
        importedPromptLanguage: result.analysis.importedPromptLanguage,
        importMode: result.analysis.importMode,
        createdAt: result.analysis.createdAt.toISOString(),
      },
      normalization: result.normalization,
      warnings: result.warnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "导入失败";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }
}
