import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Admissions auth provider (Phase 4)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to supabase when provider unset", async () => {
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { isFirebaseAuthProvider, getAdmissionsAuthProvider } = await import("./auth-mode");
    expect(getAdmissionsAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("always returns supabase even when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { isFirebaseAuthProvider, getAdmissionsAuthProvider } = await import("./auth-mode");
    expect(getAdmissionsAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });
});
