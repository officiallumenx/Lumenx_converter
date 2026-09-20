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

  it("defaults to supabase provider in api mode", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { getConnectAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getConnectAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("always returns supabase even when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { getConnectAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getConnectAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("rejects demo mode configuration", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "demo");
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    const { getConnectAuthMode, getConnectAuthProvider, isFirebaseAuthProvider } =
      await import("./auth-mode");
    expect(() => getConnectAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(getConnectAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });
});
