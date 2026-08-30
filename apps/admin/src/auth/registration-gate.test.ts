import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";

const user: AuthUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "admin@example.com",
  name: "Admin",
  initials: "AD",
  role: "super_admin",
  title: "Admin",
  instituteId: "",
  instituteName: "",
  isVerified: false,
  mfaEnabled: false,
  createdAt: "2024-01-01T00:00:00Z",
};

describe("resolveRegistrationGate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("always allows in API auth mode (skips demo OTP/setup funnel)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user)).toEqual({
      kind: "allow",
      application: null,
    });
    expect(resolveRegistrationGate(null)).toEqual({
      kind: "allow",
      application: null,
    });
  });

  it("still evaluates demo funnel when mode is demo", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.doMock("@lumenx/utils", () => ({
      findInstituteRegistrationByEmail: () => null,
    }));
    vi.doMock("./otp-service", () => ({
      loadOtpPending: () => null,
    }));
    vi.doMock("./institute-setup-store", () => ({
      isRegistrationSubmitted: () => false,
    }));
    vi.doMock("./auth-store", () => ({
      loadSession: () => null,
    }));
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("verify_email");
  });
});
