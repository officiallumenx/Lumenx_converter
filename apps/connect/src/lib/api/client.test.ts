import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";
import { ApiClientError } from "./errors";

describe("Connect createApiClient auth handling", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("does not logout on network failure", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ code: "NETWORK_ERROR", status: 0 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("does not logout on 403", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () =>
        JSON.stringify({ error: { code: "FORBIDDEN", message: "No access" } }),
    });
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ status: 403 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("401 → refresh → retry succeeds without onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    let token = "stale";
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () =>
          JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "expired" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: { id: "1" } }),
      });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => token,
      tryRefreshSession: async () => {
        token = "fresh";
        return true;
      },
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get<{ id: string }>("/api/v1/me")).resolves.toEqual({ id: "1" });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("401 → refresh failure → onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "expired" } }),
    });
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "stale",
      tryRefreshSession: async () => false,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiClientError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("401 → refresh ok but retry still 401 → onUnauthorized once", async () => {
    const onUnauthorized = vi.fn();
    const tryRefreshSession = vi.fn().mockResolvedValue(true);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "revoked" } }),
    });
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      tryRefreshSession,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiClientError);
    expect(tryRefreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
