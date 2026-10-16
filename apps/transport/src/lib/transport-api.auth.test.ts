import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getSupabaseAccessToken = vi.fn();
const tryRefreshSupabaseSession = vi.fn();

vi.mock("@/lib/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("@/lib/api-base-url", () => ({
  getTransportApiBaseUrl: () => "http://api.test",
}));

vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseAccessToken: () => getSupabaseAccessToken(),
  tryRefreshSupabaseSession: () => tryRefreshSupabaseSession(),
}));

describe("transportFetch auth handling", () => {
  const fetchMock = vi.fn();
  let getDriverMe: typeof import("./transport-api").getDriverMe;
  let setTransportApiUnauthorizedHandler: typeof import("./transport-api").setTransportApiUnauthorizedHandler;
  let bumpTransportAuthSessionGeneration: typeof import("./transport-api").bumpTransportAuthSessionGeneration;
  let TransportApiError: typeof import("./transport-api").TransportApiError;

  beforeEach(async () => {
    vi.resetModules();
    getSupabaseAccessToken.mockReset();
    tryRefreshSupabaseSession.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    const mod = await import("./transport-api");
    getDriverMe = mod.getDriverMe;
    setTransportApiUnauthorizedHandler = mod.setTransportApiUnauthorizedHandler;
    bumpTransportAuthSessionGeneration = mod.bumpTransportAuthSessionGeneration;
    TransportApiError = mod.TransportApiError;
    mod.resetTransportApiAuthForTests();
  });

  afterEach(() => {
    setTransportApiUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it("null token → refresh → request succeeds without unauthorized", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("fresh");
    tryRefreshSupabaseSession.mockResolvedValue({ kind: "refreshed" });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            driverId: "d1",
            instituteId: "i1",
            displayName: "Driver",
            phone: "1",
          },
        }),
    });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject({
      driverId: "d1",
    });
    expect(tryRefreshSupabaseSession).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0]?.[1]?.headers?.Authorization).toBe("Bearer fresh");
  });

  it("null token → invalid refresh → unauthorized handler", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken.mockResolvedValue(null);
    tryRefreshSupabaseSession.mockResolvedValue({ kind: "invalid" });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).rejects.toBeInstanceOf(
      TransportApiError,
    );
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("transient refresh does not clear session", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken.mockResolvedValue(null);
    tryRefreshSupabaseSession.mockResolvedValue({ kind: "transient" });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stale session generation does not invoke unauthorized", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken.mockResolvedValue("stale");
    tryRefreshSupabaseSession.mockImplementation(async () => {
      bumpTransportAuthSessionGeneration();
      return { kind: "invalid" };
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "expired" } }),
    });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).rejects.toBeInstanceOf(
      TransportApiError,
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("HTTP 401 → one refresh and one retry", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken.mockResolvedValue("stale");
    tryRefreshSupabaseSession.mockResolvedValue({ kind: "refreshed" });
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () =>
          JSON.stringify({ error: { code: "UNAUTHENTICATED", message: "expired" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              driverId: "d1",
              instituteId: "i1",
              displayName: "Driver",
              phone: "1",
            },
          }),
      });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).resolves.toMatchObject({
      driverId: "d1",
    });
    expect(tryRefreshSupabaseSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("HTTP 403 does not clear session", async () => {
    const onUnauthorized = vi.fn();
    setTransportApiUnauthorizedHandler(onUnauthorized);
    getSupabaseAccessToken.mockResolvedValue("tok");
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => JSON.stringify({ error: { code: "FORBIDDEN", message: "No" } }),
    });

    await expect(getDriverMe("11111111-1111-4111-8111-111111111111")).rejects.toMatchObject({
      status: 403,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(tryRefreshSupabaseSession).not.toHaveBeenCalled();
  });
});
