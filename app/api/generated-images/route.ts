import { prisma } from "@/lib/db/prisma";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "20", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sourceType = url.searchParams.get("sourceType")?.trim();
  const sourceId = url.searchParams.get("sourceId")?.trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  const images = await prisma.generatedImage.findMany({
    where: {
      ...(sourceType ? { sourceType } : {}),
      ...(sourceId ? { sourceId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({
    ok: true,
    images: images.map((image) => ({
      id: image.id,
      prompt: image.prompt,
      negativePrompt: image.negativePrompt,
      sourceType: image.sourceType,
      sourceId: image.sourceId,
      model: image.model,
      size: image.size,
      quality: image.quality,
      format: image.format,
      fileUrl: `/api/generated-images/${image.id}/file`,
      createdAt: image.createdAt.toISOString(),
    })),
  });
}
