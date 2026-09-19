import { describe, expect, it, vi } from "vitest";

describe("getAdminAuthMode", () => {
  it("defaults to api when unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "");
    const { getAdminAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(getAdminAuthMode()).toBe("api");
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("rejects demo when VITE_ADMIN_AUTH_MODE=demo", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { getAdminAuthMode, isDemoAuthMode, isApiAuthMode } = await import("./auth-mode");
    expect(() => getAdminAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(isApiAuthMode()).toBe(true);
    expect(isDemoAuthMode()).toBe(false);
  });

  it("reads firebase provider when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { getAdminAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getAdminAuthProvider()).toBe("firebase");
    expect(isFirebaseAuthProvider()).toBe(true);
  });

  it("defaults to firebase provider when VITE_AUTH_PROVIDER is unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { getAdminAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getAdminAuthProvider()).toBe("firebase");
    expect(isFirebaseAuthProvider()).toBe(true);
  });
});
