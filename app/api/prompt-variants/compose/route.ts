import { composePromptVariant, EditablePromptSegment } from "@/lib/analysis/prompt-variant-service";

type ComposeBody = {
  analysisId?: unknown;
  title?: unknown;
  userNote?: unknown;
  editedSegments?: unknown;
  negativePrompt?: unknown;
};

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseSegments(value: unknown): EditablePromptSegment[] {
  if (!Array.isArray(value)) {
    throw new Error("editedSegments 必须是数组");
  }

  return value.map((item) => {
    if (typeof item !== "object" || item === null) {
      throw new Error("editedSegments 格式错误");
    }

    const segment = item as Record<string, unknown>;
    return {
      type: stringValue(segment.type) ?? "",
      label: stringValue(segment.label) ?? "",
      content: stringValue(segment.content) ?? "",
      isEnabled: Boolean(segment.isEnabled),
      sortOrder: typeof segment.sortOrder === "number" ? segment.sortOrder : 0,
    };
  });
}

export async function POST(request: Request) {
  let body: ComposeBody;

  try {
    body = (await request.json()) as ComposeBody;
    const variant = await composePromptVariant({
      analysisId: stringValue(body.analysisId) ?? "",
      title: stringValue(body.title) ?? "",
      userNote: stringValue(body.userNote),
      editedSegments: parseSegments(body.editedSegments),
      negativePrompt: stringValue(body.negativePrompt),
    });

    return Response.json({
      ok: true,
      variant: {
        id: variant.id,
        analysisId: variant.analysisId,
        title: variant.title,
        composedPrompt: variant.composedPrompt,
        negativePrompt: variant.negativePrompt,
        source: variant.source,
        createdAt: variant.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "组合 Prompt 失败",
      },
      { status: 400 },
    );
  }
}
