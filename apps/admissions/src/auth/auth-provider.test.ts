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

  it("supports firebase provider in api mode", async () => {
    vi.stubEnv("VITE_ADMISSIONS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { isFirebaseAuthProvider } = await import("./auth-mode");
    expect(isFirebaseAuthProvider()).toBe(true);
  });
});
