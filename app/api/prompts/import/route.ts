import { prisma } from "@/lib/db/prisma";

type ImportBody = {
  title?: unknown;
  reversePrompt?: unknown;
  negativePrompt?: unknown;
  styleSummary?: unknown;
  visualSubject?: unknown;
  composition?: unknown;
  colorPalette?: unknown;
  lighting?: unknown;
  texture?: unknown;
  eraFeeling?: unknown;
  topicPotential?: unknown;
  imageId?: unknown;
  tags?: unknown;
};

function cleanText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function looksEnglishPrompt(value: string): boolean {
  const chineseCharacters = /[\u3400-\u9fff]/;
  const englishWords = value.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return !chineseCharacters.test(value) && englishWords.length >= 5;
}

export async function POST(request: Request) {
  let body: ImportBody;

  try {
    body = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ ok: false, error: "请求体必须是 JSON 格式" }, { status: 400 });
  }

  const title = cleanText(body.title);
  const reversePrompt = cleanText(body.reversePrompt);
  const negativePrompt = cleanText(body.negativePrompt);
  const imageId = cleanText(body.imageId);

  if (!title) {
    return Response.json({ ok: false, error: "请填写 Prompt 标题" }, { status: 400 });
  }

  if (!reversePrompt) {
    return Response.json({ ok: false, error: "请填写英文 Prompt" }, { status: 400 });
  }

  if (!looksEnglishPrompt(reversePrompt)) {
    return Response.json({ ok: false, error: "英文 Prompt 看起来不符合要求，请输入英文描述，不要直接粘贴中文 Prompt" }, { status: 400 });
  }

  if (negativePrompt && /[\u3400-\u9fff]/.test(negativePrompt)) {
    return Response.json({ ok: false, error: "Negative Prompt 应使用英文" }, { status: 400 });
  }

  if (imageId) {
    const image = await prisma.imageAsset.findUnique({
      where: { id: imageId },
      select: { id: true },
    });

    if (!image) {
      return Response.json({ ok: false, error: "关联的参考图片不存在" }, { status: 404 });
    }
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === "string") : [];

  const analysis = await prisma.promptAnalysis.create({
    data: {
      imageId,
      title,
      reversePrompt,
      negativePrompt,
      styleSummary: cleanText(body.styleSummary),
      visualSubject: cleanText(body.visualSubject),
      composition: cleanText(body.composition),
      colorPalette: cleanText(body.colorPalette),
      lighting: cleanText(body.lighting),
      texture: cleanText(body.texture),
      eraFeeling: cleanText(body.eraFeeling),
      topicPotential: cleanText(body.topicPotential),
      rawJson: JSON.stringify({
        source: "manual_import",
        tags,
      }),
    },
  });

  return Response.json({
    ok: true,
    analysis: {
      id: analysis.id,
      imageId: analysis.imageId,
      title: analysis.title,
      reversePrompt: analysis.reversePrompt,
      negativePrompt: analysis.negativePrompt,
      createdAt: analysis.createdAt.toISOString(),
    },
  });
}
