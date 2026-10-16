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
  /** Override token; when omitted, uses getAccessToken(). */
  accessToken?: string | null;
  /** When true, omit Authorization even if a token exists. */
  skipAuth?: boolean;
  signal?: AbortSignal;
  /** Override default request timeout (ms). */
  timeoutMs?: number;
  /**
   * When true, never enqueue this write into the offline outbox
   * (used while flushing the outbox itself).
   */
  skipOfflineQueue?: boolean;
  /** Internal: already retried once after session refresh. */
  _authRetried?: boolean;
  /** Internal: auth session generation captured when the request started. */
  _sessionGeneration?: number;
  /**
   * When true, return the full JSON body (including next_cursor / has_more)
   * instead of unwrapping `{ data }`.
   */
  envelope?: boolean;
};

export type QueueOfflineWriteInput = {
  method: string;
  path: string;
  body?: unknown;
};

export type ApiClientConfig = {
  getBaseUrl: () => string;
  getAccessToken: () => Promise<string | null>;
  /**
   * Optional silent refresh before treating HTTP 401 as logout.
   * Prefer structured SessionRefreshOutcome so transient network failures
   * do not destroy a recoverable session.
   */
  tryRefreshSession?: () => Promise<boolean | SessionRefreshOutcome>;
  /** Current auth session generation — stale requests must not clear a newer login. */
  getSessionGeneration?: () => number;
  /** Called on confirmed auth failure after refresh+retry (session cleanup hook). */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
  /** Default fetch timeout — avoids hung requests after network flaps. */
  defaultTimeoutMs?: number;
  /** Optional online check (defaults to navigator.onLine). */
  isOnline?: () => boolean;
  /**
   * When a JSON write cannot reach the network, store it for later flush.
   * Multipart uploads are never queued.
   */
  queueOfflineWrite?: (input: QueueOfflineWriteInput) => void | Promise<void>;
};

/** Default so offline/reconnect hangs fail fast instead of spinning for minutes. */
export const API_DEFAULT_TIMEOUT_MS = 15_000;

/** Tighter timeout when the browser reports offline / flaky reconnect. */
export const API_LOW_NETWORK_TIMEOUT_MS = 8_000;

function resolveBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

function mergeTimeoutSignal(
  external: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", onExternalAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener("abort", onExternalAbort);
    },
  };
}

function networkFailureFromAbort(
  err: unknown,
  external?: AbortSignal,
): ApiClientError {
  const aborted =
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError");
  if (aborted && external?.aborted) {
    return new ApiClientError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "Request cancelled",
    });
  }
  return new ApiClientError({
    status: 0,
    code: "NETWORK_ERROR",
    message: aborted
      ? "Request timed out — check your connection and try again"
      : "Network request failed",
  });
}

function isWriteMethod(method: string): boolean {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD" && m !== "OPTIONS";
}

function canQueueBody(body: unknown): boolean {
  if (body === undefined || body === null) return true;
  if (typeof FormData !== "undefined" && body instanceof FormData) return false;
  if (typeof Blob !== "undefined" && body instanceof Blob) return false;
  try {
    JSON.stringify(body);
    return true;
  } catch {
    return false;
  }
}

function queuedOfflineError(): ApiClientError {
  return new ApiClientError({
    status: 0,
    code: "QUEUED_OFFLINE",
    message: "Saved offline — will sync when you are back online",
    details: { queued: true },
  });
}

function resolveIsOnline(config: ApiClientConfig): boolean {
  if (config.isOnline) return config.isOnline();
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
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
  const defaultTimeoutMs = config.defaultTimeoutMs ?? API_DEFAULT_TIMEOUT_MS;

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

  /**
   * On 401: refresh once + allow caller to retry. Only invoke onUnauthorized
   * when the session is confirmed invalid and still current.
   * Returns true when the caller should retry the request once.
   */
  async function shouldRetryAfterUnauthorized(
    options: ApiRequestOptions,
  ): Promise<boolean> {
    const sessionGeneration = captureGeneration(options);
    // Public/login requests must never clear an authenticated session.
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

  /**
   * Obtain a usable Bearer token at request time.
   * If the session is briefly missing (tab resume / expiry), refresh once.
   * Transient refresh failures keep the UI session; confirmed invalid clears it.
   */
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

  async function maybeQueueWrite(
    method: string,
    path: string,
    options: ApiRequestOptions,
  ): Promise<boolean> {
    if (options.skipOfflineQueue) return false;
    if (!config.queueOfflineWrite) return false;
    if (!isWriteMethod(method)) return false;
    if (!canQueueBody(options.body)) return false;
    await config.queueOfflineWrite({
      method,
      path,
      body: options.body,
    });
    return true;
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

    const method =
      requestOptions.method ?? (requestOptions.body !== undefined ? "POST" : "GET");

    // Offline writes go straight to the outbox — no hung fetch.
    if (!resolveIsOnline(config) && isWriteMethod(method)) {
      const queued = await maybeQueueWrite(method, path, requestOptions);
      if (queued) throw queuedOfflineError();
    }

    const url = path.startsWith("http")
      ? path
      : `${base}${path.startsWith("/") ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (requestOptions.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (!requestOptions.skipAuth) {
      const token = await resolveAccessToken(requestOptions);
      headers.Authorization = `Bearer ${token}`;
    }

    const online = resolveIsOnline(config);
    const timeoutMs =
      requestOptions.timeoutMs ??
      (online
        ? defaultTimeoutMs
        : Math.min(defaultTimeoutMs, API_LOW_NETWORK_TIMEOUT_MS));
    const { signal, cleanup } = mergeTimeoutSignal(requestOptions.signal, timeoutMs);

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers,
        body:
          requestOptions.body !== undefined
            ? JSON.stringify(requestOptions.body)
            : undefined,
        signal,
      });
    } catch (err) {
      const networkErr = networkFailureFromAbort(err, requestOptions.signal);
      if (
        networkErr.message !== "Request cancelled" &&
        (await maybeQueueWrite(method, path, requestOptions))
      ) {
        throw queuedOfflineError();
      }
      throw networkErr;
    } finally {
      cleanup();
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

    if (
      !requestOptions.envelope &&
      json &&
      typeof json === "object" &&
      "data" in json
    ) {
      return (json as { data: T }).data;
    }

    return json as T;
  }

  /** Multipart upload — does not set Content-Type (boundary is automatic). */
  async function uploadForm<T>(
    path: string,
    form: FormData,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ): Promise<T> {
    const opts: ApiRequestOptions = {
      ...(options ?? {}),
      _sessionGeneration:
        options?._sessionGeneration ?? config.getSessionGeneration?.(),
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
    if (!opts.skipAuth) {
      const token = await resolveAccessToken(opts);
      headers.Authorization = `Bearer ${token}`;
    }
    const online = resolveIsOnline(config);
    const timeoutMs =
      opts.timeoutMs ??
      (online
        ? defaultTimeoutMs
        : Math.min(defaultTimeoutMs, API_LOW_NETWORK_TIMEOUT_MS));
    const { signal, cleanup } = mergeTimeoutSignal(opts.signal, timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: form,
        signal,
      });
    } catch (err) {
      throw networkFailureFromAbort(err, opts.signal);
    } finally {
      cleanup();
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
        response.statusText || "Upload failed",
      );
      if (response.status === 401) {
        const retry = await shouldRetryAfterUnauthorized(opts);
        if (retry) {
          return uploadForm<T>(path, form, {
            ...opts,
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

  /**
   * Authenticated binary/text download (no JSON unwrap).
   * Used for report job files — never opens public secret URLs.
   */
  async function download(
    path: string,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ): Promise<{ blob: Blob; fileName: string | null; contentType: string | null }> {
    const opts: ApiRequestOptions = {
      ...(options ?? {}),
      _sessionGeneration:
        options?._sessionGeneration ?? config.getSessionGeneration?.(),
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

    const headers: Record<string, string> = { Accept: "*/*" };
    if (!opts.skipAuth) {
      const token = await resolveAccessToken(opts);
      headers.Authorization = `Bearer ${token}`;
    }

    const online = resolveIsOnline(config);
    const timeoutMs =
      opts.timeoutMs ??
      (online
        ? defaultTimeoutMs
        : Math.min(defaultTimeoutMs, API_LOW_NETWORK_TIMEOUT_MS));
    const { signal, cleanup } = mergeTimeoutSignal(opts.signal, timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers,
        signal,
      });
    } catch (err) {
      throw networkFailureFromAbort(err, opts.signal);
    } finally {
      cleanup();
    }

    if (!response.ok) {
      const text = await response.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      const err = normalizeApiError(
        response.status,
        parsed,
        response.statusText || "Download failed",
      );
      if (response.status === 401) {
        const retry = await shouldRetryAfterUnauthorized(opts);
        if (retry) {
          return download(path, {
            ...opts,
            accessToken: undefined,
            _authRetried: true,
          });
        }
      }
      throw err;
    }

    const disposition = response.headers.get("Content-Disposition");
    let fileName: string | null = null;
    const match = disposition?.match(/filename="([^"]+)"/);
    if (match?.[1]) fileName = match[1];

    return {
      blob: await response.blob(),
      fileName,
      contentType: response.headers.get("Content-Type"),
    };
  }

  return {
    request,
    get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PATCH", body }),
    put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "DELETE" }),
    uploadForm,
    download,
  };
}

export type AdminApiClient = ReturnType<typeof createApiClient>;
