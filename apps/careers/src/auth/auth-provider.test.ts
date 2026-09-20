import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Careers auth provider (Phase 4)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to supabase when provider unset", async () => {
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { isFirebaseAuthProvider, getCareersAuthProvider } = await import("./auth-mode");
    expect(getCareersAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("always returns supabase even when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { isFirebaseAuthProvider, getCareersAuthProvider } = await import("./auth-mode");
    expect(getCareersAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });
});
