import { describe, expect, it, vi } from "vitest";

describe("getConnectAuthMode", () => {
  it("defaults to api when unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "");
    const { getConnectAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getConnectAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("rejects demo when VITE_CONNECT_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "demo");
    const { getConnectAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(() => getConnectAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("accepts api explicitly", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    const { getConnectAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getConnectAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
