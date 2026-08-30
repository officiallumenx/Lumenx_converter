import { ApiClientError, normalizeApiError } from "./errors";

export type ApiRequestOptions = {
  method?: string;
  body?: unknown;
  /** Override token; when omitted, uses getAccessToken(). */
  accessToken?: string | null;
  /** When true, omit Authorization even if a token exists. */
  skipAuth?: boolean;
  signal?: AbortSignal;
};

export type ApiClientConfig = {
  getBaseUrl: () => string;
  getAccessToken: () => Promise<string | null>;
  /** Called on HTTP 401 after normalizing the error (session cleanup hook). */
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

function resolveBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}

export function createApiClient(config: ApiClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;

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
        config.onUnauthorized?.();
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
    put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "PUT", body }),
    delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
      request<T>(path, { ...options, method: "DELETE" }),
    /** Multipart upload — does not set Content-Type (boundary is automatic). */
    uploadForm: async <T>(
      path: string,
      form: FormData,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<T> => {
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
      if (!options?.skipAuth) {
        const token =
          options?.accessToken !== undefined
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
          method: "POST",
          headers,
          body: form,
          signal: options?.signal,
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
        if (response.status === 401) config.onUnauthorized?.();
        throw err;
      }
      if (json && typeof json === "object" && "data" in json) {
        return (json as { data: T }).data;
      }
      return json as T;
    },
    /**
     * Authenticated binary/text download (no JSON unwrap).
     * Used for report job files — never opens public secret URLs.
     */
    download: async (
      path: string,
      options?: Omit<ApiRequestOptions, "method" | "body">,
    ): Promise<{ blob: Blob; fileName: string | null; contentType: string | null }> => {
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
      if (!options?.skipAuth) {
        const token =
          options?.accessToken !== undefined
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
          method: "GET",
          headers,
          signal: options?.signal,
        });
      } catch {
        throw new ApiClientError({
          status: 0,
          code: "NETWORK_ERROR",
          message: "Network request failed",
        });
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
        if (response.status === 401) config.onUnauthorized?.();
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
    },
  };
}

export type AdminApiClient = ReturnType<typeof createApiClient>;
