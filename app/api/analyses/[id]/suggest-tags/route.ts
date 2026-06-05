import { suggestTagsForAnalysis } from "@/lib/tags/suggest-tags-service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const suggestedTags = await suggestTagsForAnalysis(id);
    return Response.json({ ok: true, suggestedTags });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "AI 推荐标签失败" }, { status: 400 });
  }
}
