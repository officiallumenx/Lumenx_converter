import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Nexus auth provider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to firebase in api mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { getNexusAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getNexusAuthProvider()).toBe("firebase");
    expect(isFirebaseAuthProvider()).toBe(true);
  });

  it("enables supabase rollback when configured", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    const { getNexusAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getNexusAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });
});
