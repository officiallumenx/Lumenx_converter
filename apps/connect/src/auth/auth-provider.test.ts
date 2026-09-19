import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Connect auth provider", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to firebase provider in api mode", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { getConnectAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getConnectAuthProvider()).toBe("firebase");
    expect(isFirebaseAuthProvider()).toBe(true);
  });

  it("enables supabase rollback when configured", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    const { getConnectAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getConnectAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("rejects demo mode configuration", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "demo");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { getConnectAuthMode, getConnectAuthProvider, isFirebaseAuthProvider } =
      await import("./auth-mode");
    expect(() => getConnectAuthMode()).toThrow(/Demo Mode is no longer supported/);
    // Provider selection remains independent of rejected mode.
    expect(getConnectAuthProvider()).toBe("firebase");
    expect(isFirebaseAuthProvider()).toBe(true);
  });
});
