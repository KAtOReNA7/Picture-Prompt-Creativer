import { generateImage, IMAGE_FORMATS, IMAGE_QUALITIES, IMAGE_SIZES, IMAGE_SOURCE_TYPES } from "@/lib/generation/image-generation-service";

type GenerateRequestBody = {
  prompt?: unknown;
  negativePrompt?: unknown;
  sourceType?: unknown;
  sourceId?: unknown;
  originAnalysisId?: unknown;
  size?: unknown;
  quality?: unknown;
  format?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export async function POST(request: Request) {
  let body: GenerateRequestBody;

  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  const prompt = stringValue(body.prompt);
  const sourceType = stringValue(body.sourceType);

  if (!prompt) {
    return Response.json({ ok: false, error: "Prompt 不能为空" }, { status: 400 });
  }

  if (!sourceType || !IMAGE_SOURCE_TYPES.includes(sourceType as (typeof IMAGE_SOURCE_TYPES)[number])) {
    return Response.json({ ok: false, error: "sourceType 不支持" }, { status: 400 });
  }

  const size = stringValue(body.size) ?? "1024x1024";
  const quality = stringValue(body.quality) ?? "medium";
  const format = stringValue(body.format) ?? "png";

  if (!IMAGE_SIZES.includes(size as (typeof IMAGE_SIZES)[number])) {
    return Response.json({ ok: false, error: "size 不支持" }, { status: 400 });
  }

  if (!IMAGE_QUALITIES.includes(quality as (typeof IMAGE_QUALITIES)[number])) {
    return Response.json({ ok: false, error: "quality 不支持" }, { status: 400 });
  }

  if (!IMAGE_FORMATS.includes(format as (typeof IMAGE_FORMATS)[number])) {
    return Response.json({ ok: false, error: "format 不支持" }, { status: 400 });
  }

  try {
    const result = await generateImage({
      prompt,
      negativePrompt: stringValue(body.negativePrompt),
      sourceType: sourceType as (typeof IMAGE_SOURCE_TYPES)[number],
      sourceId: stringValue(body.sourceId),
      originAnalysisId: stringValue(body.originAnalysisId),
      size: size as (typeof IMAGE_SIZES)[number],
      quality: quality as (typeof IMAGE_QUALITIES)[number],
      format: format as (typeof IMAGE_FORMATS)[number],
    });

    return Response.json({
      ok: true,
      image: result.image,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "图片生成失败",
      },
      { status: 500 },
    );
  }
}
