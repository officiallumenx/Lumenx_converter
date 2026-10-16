import {
  asSessionRefreshOutcome,
  isRecoverableRefreshFailure,
  isSessionRefreshSuccess,
  shouldClearSessionOnRefreshFailure,
  type SessionRefreshOutcome,
} from "@lumenx/auth";
import { ApiClientError, normalizeApiError } from "./errors";

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  accessToken?: string | null;
  skipAuth?: boolean;
  signal?: AbortSignal;
  _authRetried?: boolean;
  _sessionGeneration?: number;
};

export type ApiClientConfig = {
  getBaseUrl: () => string;
  getAccessToken: () => Promise<string | null>;
  tryRefreshSession?: () => Promise<boolean | SessionRefreshOutcome>;
  getSessionGeneration?: () => number;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

function resolveBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function transientRefreshError(): ApiClientError {
  return new ApiClientError({
    status: 0,
    code: "NETWORK_ERROR",
    message:
      "Session refresh temporarily unavailable — check your connection and try again",
  });
}

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;

  function captureGeneration(options: ApiRequestOptions): number | undefined {
    if (options._sessionGeneration !== undefined) return options._sessionGeneration;
    return config.getSessionGeneration?.();
  }

  function invokeUnauthorized(sessionGeneration: number | undefined): void {
    if (
      sessionGeneration !== undefined &&
      config.getSessionGeneration &&
      config.getSessionGeneration() !== sessionGeneration
    ) {
      return;
    }
    config.onUnauthorized?.();
  }

  async function shouldRetryAfterUnauthorized(
    options: ApiRequestOptions,
  ): Promise<boolean> {
    const sessionGeneration = captureGeneration(options);
    if (options.skipAuth) return false;
    if (options._authRetried) {
      invokeUnauthorized(sessionGeneration);
      return false;
    }
    if (!config.tryRefreshSession) {
      invokeUnauthorized(sessionGeneration);
      return false;
    }
    const outcome = asSessionRefreshOutcome(await config.tryRefreshSession());
    if (isSessionRefreshSuccess(outcome)) return true;
    if (isRecoverableRefreshFailure(outcome)) {
      throw transientRefreshError();
    }
    if (shouldClearSessionOnRefreshFailure(outcome)) {
      invokeUnauthorized(sessionGeneration);
    }
    return false;
  }

  async function resolveAccessToken(options: ApiRequestOptions): Promise<string> {
    const sessionGeneration = captureGeneration(options);
    if (options.accessToken !== undefined) {
      if (options.accessToken) return options.accessToken;
      invokeUnauthorized(sessionGeneration);
      throw new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    }

    let token = await config.getAccessToken();
    if (!token && !options._authRetried && config.tryRefreshSession) {
      const outcome = asSessionRefreshOutcome(await config.tryRefreshSession());
      if (isSessionRefreshSuccess(outcome)) {
        token = await config.getAccessToken();
      } else if (isRecoverableRefreshFailure(outcome)) {
        throw transientRefreshError();
      }
    }
    if (!token) {
      invokeUnauthorized(sessionGeneration);
      throw new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    }
    return token;
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const requestOptions: ApiRequestOptions = {
      ...options,
      _sessionGeneration:
        options._sessionGeneration ?? config.getSessionGeneration?.(),
    };
    const base = resolveBaseUrl(config.getBaseUrl());
    if (!base) {
      throw new ApiClientError({
        status: 0,
        code: "UNKNOWN",
        message: "VITE_API_BASE_URL is not configured",
      });
    }

    const url = path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? path : `/${path}`}`;

    const headers: Record<string, string> = { Accept: "application/json" };
    const isForm =
      typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
    if (requestOptions.body !== undefined && !isForm) {
      headers["Content-Type"] = "application/json";
    }

    if (!requestOptions.skipAuth) {
      const token = await resolveAccessToken(requestOptions);
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: requestOptions.method ?? (requestOptions.body !== undefined ? "POST" : "GET"),
        headers,
        body:
          requestOptions.body === undefined
            ? undefined
            : isForm
              ? (requestOptions.body as FormData)
              : JSON.stringify(requestOptions.body),
        signal: requestOptions.signal,
      });
    } catch (cause) {
      const detail =
        cause instanceof Error && cause.message
          ? cause.message
          : "browser blocked or server unreachable";
      throw new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: `Network request failed (${detail}). Is the API running at ${base}?`,
      });
    }

    const text = await response.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = null;
      }
    }

    if (!response.ok) {
      const err = normalizeApiError(
        response.status,
        json,
        response.statusText || "Request failed",
      );
      if (response.status === 401) {
        const retry = await shouldRetryAfterUnauthorized(requestOptions);
        if (retry) {
          return request<T>(path, {
            ...requestOptions,
            accessToken: undefined,
            _authRetried: true,
          });
        }
      }
      throw err;
    }

    if (json && typeof json === "object" && "data" in json) {
      return (json as { data: T }).data;
    }

    return json as T;
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "POST", body }),
    postForm: <T>(
      path: string,
      form: FormData,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ) => request<T>(path, { ...options, method: "POST", body: form }),
  };
}

export type NexusApiClient = ReturnType<typeof createApiClient>;
