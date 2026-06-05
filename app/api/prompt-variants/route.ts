import { prisma } from "@/lib/db/prisma";

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? "20", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 20;
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const analysisId = url.searchParams.get("analysisId")?.trim();
  const limit = parseLimit(url.searchParams.get("limit"));

  const variants = await prisma.promptVariant.findMany({
    where: {
      ...(analysisId ? { analysisId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return Response.json({
    ok: true,
    variants: variants.map((variant) => ({
      id: variant.id,
      analysisId: variant.analysisId,
      title: variant.title,
      userNote: variant.userNote,
      composedPrompt: variant.composedPrompt,
      negativePrompt: variant.negativePrompt,
      source: variant.source,
      createdAt: variant.createdAt.toISOString(),
    })),
  });
}
