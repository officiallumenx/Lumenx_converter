import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Transport auth provider (Phase 4)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults to supabase when provider unset", async () => {
    vi.stubEnv("VITE_TRANSPORT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { isFirebaseAuthProvider, getTransportAuthProvider } = await import("./auth-mode");
    expect(getTransportAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("always returns supabase even when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.stubEnv("VITE_TRANSPORT_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { isFirebaseAuthProvider, getTransportAuthProvider } = await import("./auth-mode");
    expect(getTransportAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });
});
