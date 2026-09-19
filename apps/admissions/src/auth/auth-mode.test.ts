import { describe, expect, it, vi } from "vitest";

describe("getAdmissionsAuthMode", () => {
  it("defaults to api when unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "");
    const { getAdmissionsAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdmissionsAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("rejects demo when VITE_ADMISSIONS_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "demo");
    const { getAdmissionsAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(() => getAdmissionsAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("accepts api explicitly", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "api");
    const { getAdmissionsAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdmissionsAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
