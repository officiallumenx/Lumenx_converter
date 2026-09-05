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

  it("reads demo when VITE_CAREERS_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "demo");
    const { getCareersAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getCareersAuthMode()).toBe("demo");
    expect(isDemoAuthMode()).toBe(true);
    expect(isApiAuthMode()).toBe(false);
  });

  it("reads api when VITE_CAREERS_AUTH_MODE=api", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    const { getCareersAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getCareersAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
