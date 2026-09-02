import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_KEY, DEMO_REGISTERED_KEY } from "./constants";
import { saveSession, loadSession } from "./auth-store";
import type { AuthUser } from "./types";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

const apiUser: AuthUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "principal@school.edu",
  name: "Applicant",
  initials: "AP",
  role: "principal",
  title: "principal",
  instituteId: "",
  instituteName: "",
  isVerified: true,
  mfaEnabled: false,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("assertProductionApiAuthMode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    store.clear();
  });

  it("allows demo mode in non-production builds", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.stubEnv("PROD", false);
    const { assertProductionApiAuthMode } = await import("./auth-mode");
    expect(() => assertProductionApiAuthMode()).not.toThrow();
  });

  it("throws when production build uses demo auth mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.stubEnv("PROD", true);
    const { assertProductionApiAuthMode } = await import("./auth-mode");
    expect(() => assertProductionApiAuthMode()).toThrow(/VITE_ADMIN_AUTH_MODE=api/);
  });

  it("throws when production API mode is missing Supabase/API env", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");
    vi.stubEnv("VITE_API_BASE_URL", "");
    const { assertProductionApiAuthMode } = await import("./auth-mode");
    expect(() => assertProductionApiAuthMode()).toThrow(/misconfigured/);
  });

  it("passes when production API mode has required env", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const { assertProductionApiAuthMode } = await import("./auth-mode");
    expect(() => assertProductionApiAuthMode()).not.toThrow();
  });
});

describe("demo-auth-guard", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("blocks demo OTP routes in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { resolveDemoAuthRouteBlock } = await import("./demo-auth-guard");
    expect(resolveDemoAuthRouteBlock("/verify-email-otp")).toBe(
      "/pending-verification",
    );
    expect(resolveDemoAuthRouteBlock("/verify-mobile-otp")).toBe(
      "/pending-verification",
    );
    expect(resolveDemoAuthRouteBlock("/institute-setup")).toBe(
      "/pending-verification",
    );
  });

  it("allows demo OTP routes in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { resolveDemoAuthRouteBlock, isDemoOtpAllowed } = await import(
      "./demo-auth-guard"
    );
    expect(resolveDemoAuthRouteBlock("/verify-email-otp")).toBeNull();
    expect(isDemoOtpAllowed()).toBe(true);
  });

  it("disallows demo OTP bypass in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { isDemoOtpAllowed } = await import("./demo-auth-guard");
    expect(isDemoOtpAllowed()).toBe(false);
  });
});

describe("API session password isolation", () => {
  beforeEach(() => {
    store.clear();
  });

  it("does not persist password or JWT in API session localStorage", () => {
    saveSession(apiUser, false, { authSource: "api" });
    const raw = store.get(AUTH_SESSION_KEY);
    expect(raw).toBeTruthy();
    expect(raw!).not.toMatch(/password/i);
    const session = loadSession();
    expect(session?.authSource).toBe("api");
    expect(session?.token).toBe("");
    expect(session).not.toHaveProperty("password");
  });

  it("demo registered users store password only in demo registry key", () => {
    saveSession(apiUser, false, { authSource: "api" });
    expect(store.get(DEMO_REGISTERED_KEY)).toBeUndefined();
  });
});

describe("email verification policy", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("documents that Supabase email verification is not yet enforced", async () => {
    const policy = await import("./auth-email-verification-policy");
    expect(policy.isSupabaseEmailVerificationEnforced()).toBe(false);
    expect(policy.isRegistrationEmailAutoConfirmEnabled()).toBe(true);
  });
});

describe("registration vs email auth separation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
  });

  it("API registration gate reads backend status, not demo OTP state", async () => {
    vi.doMock("./api-registration-state", () => ({
      getApiRegistrationView: () => ({
        boundUserId: apiUser.id,
        loaded: true,
        syncing: false,
        syncError: null,
        snapshot: {
          id: "reg-1",
          status: "pending",
          instituteId: null,
          payload: { instituteName: "Alpha School" },
        },
      }),
    }));
    vi.doMock("./otp-service", () => ({
      loadOtpPending: () => ({ emailVerified: true, mobileVerified: true }),
    }));

    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(apiUser).kind).toBe("pending");
  });
});
