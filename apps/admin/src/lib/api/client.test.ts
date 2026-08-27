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

  it("normalizes 401 and invokes onUnauthorized", async () => {
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
