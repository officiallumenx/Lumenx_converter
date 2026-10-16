import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

describe("Nexus createApiClient auth persistence", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("null token → refresh → attaches fresh Bearer without onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    let token: string | null = null;
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { ok: true } }),
    });

    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => token,
      tryRefreshSession: async () => {
        token = "nexus-fresh";
        return true;
      },
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get<{ ok: boolean }>("/api/nexus/health")).resolves.toEqual({
      ok: true,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[1]?.headers?.Authorization).toBe(
      "Bearer nexus-fresh",
    );
  });

  it("null token after failed refresh invokes onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => null,
      tryRefreshSession: async () => false,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(api.get("/api/nexus/health")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP 401 → refresh → retry once", async () => {
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
        text: async () => JSON.stringify({ data: { ok: true } }),
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

    await expect(api.get<{ ok: boolean }>("/api/nexus/me")).resolves.toEqual({ ok: true });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not treat 403 as logout", async () => {
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

    await expect(api.get("/api/nexus/me")).rejects.toMatchObject({ status: 403 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("stale session generation does not invoke onUnauthorized", async () => {
    let generation = 1;
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
      getSessionGeneration: () => generation,
      tryRefreshSession: async () => {
        generation = 2;
        return { kind: "invalid" };
      },
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("transient refresh failure preserves session (no onUnauthorized)", async () => {
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
      tryRefreshSession: async () => ({ kind: "transient" }),
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("invalid refresh outcome clears session when generation current", async () => {
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
      tryRefreshSession: async () => ({ kind: "invalid" }),
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(api.get("/x")).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("skipAuth 401 does not invoke onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () =>
        JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "bad creds" } }),
    });
    const api = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => null,
      onUnauthorized,
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      api.post("/api/v1/auth/nexus/login", {}, { skipAuth: true }),
    ).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
