import { ApiClientError, normalizeApiError } from "./errors";

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  accessToken?: string | null;
  skipAuth?: boolean;
  signal?: AbortSignal;
  /** Internal: already retried once after session refresh. */
  _authRetried?: boolean;
};

export type ApiClientConfig = {
  getBaseUrl: () => string;
  getAccessToken: () => Promise<string | null>;
  /**
   * Optional silent refresh before treating HTTP 401 as logout.
   * Return true when a new access token is available.
   */
  tryRefreshSession?: () => Promise<boolean>;
  /** Called on HTTP 401 after refresh+retry failed (session cleanup hook). */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

function resolveBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;

  async function shouldRetryAfterUnauthorized(
    options: ApiRequestOptions,
  ): Promise<boolean> {
    if (options.skipAuth || options._authRetried) {
      config.onUnauthorized?.();
      return false;
    }
    if (!config.tryRefreshSession) {
      config.onUnauthorized?.();
      return false;
    }
    const refreshed = await config.tryRefreshSession();
    if (!refreshed) {
      config.onUnauthorized?.();
      return false;
    }
    return true;
  }

  async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
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

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    if (!options.skipAuth) {
      const token =
        options.accessToken !== undefined
          ? options.accessToken
          : await config.getAccessToken();
      if (!token) {
        throw new ApiClientError({
          status: 401,
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        });
      }
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });
    } catch {
      throw new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
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
        const retry = await shouldRetryAfterUnauthorized(options);
        if (retry) {
          return request<T>(path, {
            ...options,
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

  async function uploadForm<T>(
    path: string,
    form: FormData,
    options?: Omit<ApiRequestOptions, "method" | "body">,
  ): Promise<T> {
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
    const opts = options ?? {};
    if (!opts.skipAuth) {
      const token =
        opts.accessToken !== undefined
          ? opts.accessToken
          : await config.getAccessToken();
      if (!token) {
        throw new ApiClientError({
          status: 401,
          code: "UNAUTHENTICATED",
          message: "Authentication required",
        });
      }
      headers.Authorization = `Bearer ${token}`;
    }
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers,
        body: form,
        signal: opts.signal,
      });
    } catch {
      throw new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
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

  return {
    request,
    get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "GET" }),
    post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "POST", body }),
    patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PATCH", body }),
    delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "DELETE" }),
    uploadForm,
  };
}

export type ConnectApiClient = ReturnType<typeof createApiClient>;
