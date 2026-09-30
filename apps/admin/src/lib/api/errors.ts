/** Normalized Admin API client errors (backend envelope fields only). */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "QUEUED_OFFLINE"
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

function formatFieldErrors(details: unknown): string | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const parts: string[] = [];
  for (const [field, messages] of Object.entries(
    details as Record<string, unknown>,
  )) {
    if (messages == null) continue;
    const list = Array.isArray(messages) ? messages : [messages];
    for (const message of list) {
      if (typeof message === "string" && message.trim()) {
        parts.push(`${field}: ${message}`);
      }
    }
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

/** Prefer Zod field details over the generic "Request validation failed" wrapper. */
export function formatApiClientError(err: unknown, fallback: string): string {
  if (err instanceof ApiClientError) {
    const fields = formatFieldErrors(err.details);
    if (fields) {
      return err.message && err.message !== "Request validation failed"
        ? `${err.message} (${fields})`
        : fields;
    }
    return humanizeConflictMessage(err.message) || fallback;
  }
  if (err instanceof Error && err.message.trim()) {
    return humanizeConflictMessage(err.message);
  }
  return fallback;
}

/** Map generic 409 / unique-violation copy to clearer UI messages. */
export function humanizeConflictMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  if (/^resource conflict$/i.test(trimmed)) {
    return "That item already exists — try a different name";
  }
  if (/already exists/i.test(trimmed)) return trimmed;
  return trimmed;
}

/** True when the API rejected a write as a duplicate / unique conflict. */
export function isConflictError(err: unknown): boolean {
  if (err instanceof ApiClientError) {
    return err.code === "CONFLICT" || err.status === 409;
  }
  if (err instanceof Error) {
    return /resource conflict|already exists/i.test(err.message);
  }
  return false;
}

/** True when a write was stored in the offline outbox instead of sent. */
export function isQueuedOfflineError(err: unknown): boolean {
  return err instanceof ApiClientError && err.code === "QUEUED_OFFLINE";
}
