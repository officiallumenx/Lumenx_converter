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

  it("reads demo when VITE_CONNECT_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "demo");
    const { getConnectAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getConnectAuthMode()).toBe("demo");
    expect(isDemoAuthMode()).toBe(true);
    expect(isApiAuthMode()).toBe(false);
  });

  it("reads api when VITE_CONNECT_AUTH_MODE=api", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    const { getConnectAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getConnectAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
