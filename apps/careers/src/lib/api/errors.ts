/** Normalized API client errors (backend envelope fields only). */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(input: {
    status: number;
    code: ApiErrorCode;
    message: string;
    requestId?: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "ApiClientError";
    this.status = input.status;
    this.code = input.code;
    this.requestId = input.requestId;
    this.details = input.details;
  }
}

type BackendErrorBody = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
    details?: unknown;
  };
};

export function normalizeApiError(
  status: number,
  body: unknown,
  fallbackMessage: string,
): ApiClientError {
  const parsed = body as BackendErrorBody | null;
  const codeRaw = parsed?.error?.code;
  const code = (
    typeof codeRaw === "string" && codeRaw.length > 0 ? codeRaw : "UNKNOWN"
  ) as ApiErrorCode;

  return new ApiClientError({
    status,
    code,
    message: parsed?.error?.message ?? fallbackMessage,
    requestId:
      typeof parsed?.error?.requestId === "string"
        ? parsed.error.requestId
        : undefined,
    details: parsed?.error?.details,
  });
}
