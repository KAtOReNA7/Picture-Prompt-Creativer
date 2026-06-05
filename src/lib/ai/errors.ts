export type ParsedAiError = {
  message: string;
  code?: string;
  status?: number;
  detail?: string;
};

type ErrorLike = {
  message?: string;
  code?: string;
  status?: number;
  cause?: unknown;
};

function toErrorLike(error: unknown): ErrorLike {
  if (typeof error === "object" && error !== null) {
    return error as ErrorLike;
  }

  return { message: String(error) };
}

export function parseAiError(error: unknown): ParsedAiError {
  const parsed = toErrorLike(error);
  const message = parsed.message ?? "";
  const code = parsed.code;
  const status = parsed.status;
  const detail = message || code;
  const normalized = `${message} ${code ?? ""}`.toLowerCase();

  if (message.includes("OPENAI_API_KEY") || normalized.includes("api key") || normalized.includes("apikey")) {
    return { message: "API Key 缺失，请在 .env.local 中配置 OPENAI_API_KEY。", code, status, detail };
  }

  if (message.includes("OPENAI_BASE_URL")) {
    return { message: "Base URL 缺失，请配置 OPENAI_BASE_URL。", code, status, detail };
  }

  if (status === 401) {
    return { message: "认证失败，请检查 API Key 是否正确。", code, status, detail };
  }

  if (status === 403) {
    return { message: "无权限或模型不可用，请检查账号权限和模型配置。", code, status, detail };
  }

  if (status === 404) {
    return { message: "接口或模型不存在，请检查 Base URL 和模型名称。", code, status, detail };
  }

  if (status === 429) {
    return { message: "额度不足或请求过快，请稍后重试或检查账户额度。", code, status, detail };
  }

  if (status === 500 || status === 502 || status === 503) {
    return { message: "AI 服务端异常，请稍后重试。", code, status, detail };
  }

  if (
    normalized.includes("timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("etimedout")
  ) {
    return { message: "网络超时，请检查代理、网络或 Base URL。", code, status, detail };
  }

  if (
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("network") ||
    normalized.includes("connection")
  ) {
    return { message: "网络连接失败，请检查代理、网络或服务地址。", code, status, detail };
  }

  return {
    message: "未知 AI 错误，请检查服务配置后重试。",
    code,
    status,
    detail,
  };
}
