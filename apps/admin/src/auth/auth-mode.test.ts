import { describe, expect, it, vi } from "vitest";

describe("getAdminAuthMode", () => {
  it("defaults to api when unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "");
    const { getAdminAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdminAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("reads demo when VITE_ADMIN_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { getAdminAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdminAuthMode()).toBe("demo");
    expect(isDemoAuthMode()).toBe(true);
    expect(isApiAuthMode()).toBe(false);
  });

  it("reads api when VITE_ADMIN_AUTH_MODE=api", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getAdminAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdminAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
