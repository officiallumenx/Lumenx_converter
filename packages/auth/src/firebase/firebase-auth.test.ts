import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveFirebaseWebConfig,
  assertFirebaseWebConfig,
} from "./config";
import {
  resolveAuthStack,
  normalizeAuthMode,
  isDemoAuthenticationAllowed,
  assertNotDemoFallback,
  assertApiOnlyProductMode,
} from "./auth-mode";
import { mapFirebaseClientError, FirebaseClientAuthError } from "./errors";
import { exchangeFirebaseIdTokenForSession } from "./session-api";
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

  it("api + firebase does not become demo", () => {
    expect(resolveAuthStack({ mode: "api", provider: "firebase" })).toEqual({
      mode: "api",
      provider: "firebase",
    });
  });

  it("defaults interactive provider to firebase when unset", () => {
    expect(resolveAuthStack({ mode: "api", provider: undefined })).toEqual({
      mode: "api",
      provider: "firebase",
    });
  });

  it("allows explicit supabase rollback", () => {
    expect(resolveAuthStack({ mode: "api", provider: "supabase" })).toEqual({
      mode: "api",
      provider: "supabase",
    });
  });

  it("throws when demo fallback is attempted", () => {
    expect(() => assertNotDemoFallback("api", "OTP")).toThrow(/disabled/);
  });
});

describe("Phone / email client error mapping", () => {
  it("maps invalid OTP", () => {
    const err = mapFirebaseClientError({ code: "auth/invalid-verification-code" });
    expect(err).toBeInstanceOf(FirebaseClientAuthError);
    expect(err.code).toBe("invalid-otp");
  });

  it("maps expired OTP", () => {
    expect(mapFirebaseClientError({ code: "auth/code-expired" }).code).toBe(
      "expired-otp",
    );
  });

  it("maps invalid email credentials", () => {
    expect(mapFirebaseClientError({ code: "auth/wrong-password" }).code).toBe(
      "wrong-password",
    );
    expect(mapFirebaseClientError({ code: "auth/invalid-credential" }).code).toBe(
      "wrong-password",
    );
  });

  it("maps expired Firebase ID token", () => {
    expect(mapFirebaseClientError({ code: "auth/id-token-expired" }).code).toBe(
      "expired-token",
    );
  });
});

describe("Session exchange API client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("posts Firebase bearer token and returns LumenX session", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            access_token: "access-1",
            refresh_token: "refresh-1",
            mapping: {
              user_profile_id: "user-1",
              firebase_uid: "fb-1",
              memberships: [],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const session = await exchangeFirebaseIdTokenForSession({
      apiBaseUrl: "http://api.test",
      idToken: "firebase-id-token",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(session.accessToken).toBe("access-1");
    expect(session.mapping.user_profile_id).toBe("user-1");
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://api.test/api/v1/auth/firebase/session",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer firebase-id-token",
        }),
      }),
    );
  });

  it("maps expired token responses", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: { message: "Firebase ID token expired" } }),
        { status: 401 },
      ),
    );
    await expect(
      exchangeFirebaseIdTokenForSession({
        apiBaseUrl: "http://api.test",
        idToken: "expired",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: "expired-token" });
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
