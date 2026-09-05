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

  it("reads demo when VITE_ADMISSIONS_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "demo");
    const { getAdmissionsAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdmissionsAuthMode()).toBe("demo");
    expect(isDemoAuthMode()).toBe(true);
    expect(isApiAuthMode()).toBe(false);
  });

  it("reads api when VITE_ADMISSIONS_AUTH_MODE=api", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "api");
    const { getAdmissionsAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdmissionsAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
  });
});
