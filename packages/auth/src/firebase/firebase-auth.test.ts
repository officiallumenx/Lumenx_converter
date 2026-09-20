import { describe, it, expect, vi } from "vitest";
import {
  resolveFirebaseWebConfig,
  assertFirebaseWebConfig,
} from "./config";
import {
  resolveAuthStack,
  normalizeAuthMode,
  normalizeAuthProvider,
  isDemoAuthenticationAllowed,
  assertNotDemoFallback,
  assertApiOnlyProductMode,
} from "./auth-mode";
import { logoutFirebaseAndClearLocal } from "./index";

describe("Firebase web config", () => {
  it("returns null when incomplete", () => {
    expect(resolveFirebaseWebConfig({ apiKey: "x" })).toBeNull();
  });

  it("resolves when all required public fields are set", () => {
    const cfg = resolveFirebaseWebConfig({
      apiKey: "AIza-test",
      authDomain: "demo.firebaseapp.com",
      projectId: "demo",
      appId: "1:123:web:abc",
    });
    expect(cfg?.projectId).toBe("demo");
  });

  it("assert never accepts private-key-shaped secrets as substitute", () => {
    expect(() =>
      assertFirebaseWebConfig({
        apiKey: "",
        authDomain: "",
        projectId: "p",
        appId: "",
      }),
    ).toThrow(/VITE_FIREBASE_API_KEY/);
  });
});

describe("Auth mode — API only", () => {
  it("never allows demo authentication", () => {
    expect(isDemoAuthenticationAllowed("api")).toBe(false);
    expect(isDemoAuthenticationAllowed("demo" as never)).toBe(false);
  });

  it("normalizeAuthMode accepts api / unset", () => {
    expect(normalizeAuthMode(undefined)).toBe("api");
    expect(normalizeAuthMode("api")).toBe("api");
    expect(normalizeAuthMode("API")).toBe("api");
  });

  it("normalizeAuthMode rejects demo", () => {
    expect(() => normalizeAuthMode("demo")).toThrow(/Demo Mode is no longer supported/);
  });

  it("assertApiOnlyProductMode rejects demo with app label", () => {
    expect(() => assertApiOnlyProductMode("demo", "Admin")).toThrow(/Admin:/);
  });

  it("always uses supabase as interactive provider", () => {
    expect(normalizeAuthProvider(undefined)).toBe("supabase");
    expect(normalizeAuthProvider("")).toBe("supabase");
    expect(normalizeAuthProvider("supabase")).toBe("supabase");
    expect(normalizeAuthProvider("firebase")).toBe("supabase");
    expect(resolveAuthStack({ mode: "api", provider: undefined })).toEqual({
      mode: "api",
      provider: "supabase",
    });
    expect(resolveAuthStack({ mode: "api", provider: "firebase" })).toEqual({
      mode: "api",
      provider: "supabase",
    });
  });

  it("allows explicit supabase provider", () => {
    expect(resolveAuthStack({ mode: "api", provider: "supabase" })).toEqual({
      mode: "api",
      provider: "supabase",
    });
  });

  it("throws when demo fallback is attempted", () => {
    expect(() => assertNotDemoFallback("api", "OTP")).toThrow(/disabled/);
  });
});

describe("Logout", () => {
  it("clears local and supabase session even if firebase sign-out is skipped", async () => {
    const clearSupabaseSession = vi.fn(async () => undefined);
    const clearLocalSession = vi.fn();
    // No Firebase app configured — signOutFirebase would throw; logout must still clear.
    await logoutFirebaseAndClearLocal({
      clearSupabaseSession,
      clearLocalSession,
      auth: {
        signOut: async () => {
          throw new Error("no app");
        },
      } as never,
    });
    expect(clearSupabaseSession).toHaveBeenCalled();
    expect(clearLocalSession).toHaveBeenCalled();
  });
});
