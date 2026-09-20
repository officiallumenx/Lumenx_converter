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

  it("defaults to supabase in api mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "");
    const { getNexusAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getNexusAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("always returns supabase even when VITE_AUTH_PROVIDER=firebase", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    const { getNexusAuthProvider, isFirebaseAuthProvider } = await import("./auth-mode");
    expect(getNexusAuthProvider()).toBe("supabase");
    expect(isFirebaseAuthProvider()).toBe(false);
  });

  it("requires login by default and only disables when explicitly false", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.stubEnv("VITE_NEXUS_REQUIRE_LOGIN", "");
    const { isNexusLoginRequired } = await import("./auth-mode");
    expect(isNexusLoginRequired()).toBe(true);

    vi.resetModules();
    vi.stubEnv("VITE_NEXUS_REQUIRE_LOGIN", "false");
    const mode = await import("./auth-mode");
    expect(mode.isNexusLoginRequired()).toBe(false);
  });
});
