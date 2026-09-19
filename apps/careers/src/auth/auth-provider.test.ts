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

  it("supports firebase provider in api mode", async () => {
    vi.stubEnv("VITE_CAREERS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { isFirebaseAuthProvider } = await import("./auth-mode");
    expect(isFirebaseAuthProvider()).toBe(true);
  });
});
