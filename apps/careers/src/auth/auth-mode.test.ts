import { describe, expect, it, vi } from "vitest";

describe("getCareersAuthMode", () => {
  it("defaults to api when unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "");
    const { getCareersAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getCareersAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("rejects demo when VITE_CAREERS_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "demo");
    const { getCareersAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(() => getCareersAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("accepts api explicitly", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    const { getCareersAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getCareersAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
