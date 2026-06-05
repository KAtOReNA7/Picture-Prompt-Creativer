type JsonParseResult =
  | {
      ok: true;
      value: unknown;
      rawJson: string;
    }
  | {
      ok: false;
      error: string;
      detail?: string;
    };

function stripJsonFence(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");

  if (start < 0) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

function tryParse(raw: string): JsonParseResult {
  try {
    const value = JSON.parse(raw);

    return {
      ok: true,
      value,
      rawJson: JSON.stringify(value),
    };
  } catch (error) {
    return {
      ok: false,
      error: "模型返回格式异常，无法解析为 JSON。",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export function parseModelJson(text: string): JsonParseResult {
  const direct = tryParse(text);

  if (direct.ok) {
    return direct;
  }

  const fenced = stripJsonFence(text);

  if (fenced) {
    const fencedResult = tryParse(fenced);

    if (fencedResult.ok) {
      return fencedResult;
    }
  }

  const extracted = extractFirstJsonObject(text);

  if (extracted) {
    const extractedResult = tryParse(extracted);

    if (extractedResult.ok) {
      return extractedResult;
    }

    return extractedResult;
  }

  return {
    ok: false,
    error: "模型返回格式异常，没有找到完整 JSON 对象。",
    detail: direct.detail,
  };
}
