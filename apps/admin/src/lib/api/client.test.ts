import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";
import { ApiClientError } from "./errors";

describe("createApiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("attaches Bearer token and unwraps { data }", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: "u1" } }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://127.0.0.1:8787",
      getAccessToken: async () => "tok-abc",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const result = await api.get<{ id: string }>("/api/v1/me");
    expect(result).toEqual({ id: "u1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8787/api/v1/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer tok-abc",
        }),
      }),
    );
  });

  it("throws UNAUTHENTICATED when no token", async () => {
    const api = createApiClient({
      getBaseUrl: () => "http://127.0.0.1:8787",
      getAccessToken: async () => null,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/api/v1/me")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes 401 and invokes onUnauthorized when refresh is unavailable", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({
          error: {
            code: "UNAUTHENTICATED",
            message: "Invalid or expired token",
            requestId: "req-1",
          },
        }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "stale",
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/api/v1/me")).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("401 → refresh → retry once succeeds without onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const tryRefreshSession = vi.fn().mockResolvedValue(true);
    let token = "stale";
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () =>
          JSON.stringify({
            error: { code: "UNAUTHENTICATED", message: "expired" },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { ok: true } }),
      });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => token,
      tryRefreshSession: async () => {
        const ok = await tryRefreshSession();
        if (ok) token = "fresh";
        return ok;
      },
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get<{ ok: boolean }>("/api/v1/me")).resolves.toEqual({ ok: true });
    expect(tryRefreshSession).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.headers?.Authorization).toBe("Bearer fresh");
  });

  it("401 → refresh fails → onUnauthorized once", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "expired" },
        }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "stale",
      tryRefreshSession: async () => false,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/api/v1/me")).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("401 → refresh ok but retry still 401 → onUnauthorized once (no infinite retry)", async () => {
    const onUnauthorized = vi.fn();
    const tryRefreshSession = vi.fn().mockResolvedValue(true);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "revoked" },
        }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      tryRefreshSession,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/api/v1/me")).rejects.toBeInstanceOf(ApiClientError);
    expect(tryRefreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("normalizes 403 without clearing via onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () =>
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/x")).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("maps network failures", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("queues offline writes and throws QUEUED_OFFLINE", async () => {
    const queueOfflineWrite = vi.fn();
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
      isOnline: () => false,
      queueOfflineWrite,
    });
    await expect(api.post("/api/v1/teachers", { name: "A" })).rejects.toMatchObject({
      code: "QUEUED_OFFLINE",
    });
    expect(queueOfflineWrite).toHaveBeenCalledWith({
      method: "POST",
      path: "/api/v1/teachers",
      body: { name: "A" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not queue GET failures while offline", async () => {
    const queueOfflineWrite = vi.fn();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
      isOnline: () => false,
      queueOfflineWrite,
    });
    await expect(api.get("/api/v1/teachers")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
    });
    expect(queueOfflineWrite).not.toHaveBeenCalled();
  });

  it("times out hung fetches", async () => {
    fetchMock.mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
      defaultTimeoutMs: 30,
    });
    await expect(api.get("/x")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      message: expect.stringContaining("timed out"),
    });
  });

  it("requires base URL", async () => {
    const api = createApiClient({
      getBaseUrl: () => "",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({
      message: expect.stringContaining("VITE_API_BASE_URL"),
    });
  });
});
