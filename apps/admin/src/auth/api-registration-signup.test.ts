import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";

const user: AuthUser = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "principal@school.edu",
  name: "Dr. Ananya Verma",
  initials: "AV",
  role: "principal",
  title: "principal",
  instituteId: "",
  instituteName: "",
  isVerified: true,
  mfaEnabled: false,
  createdAt: "2024-01-01T00:00:00Z",
};

const registrationPayload = {
  instituteName: "Alpha International School",
  instituteType: "School (K-12)",
  educationBoard: "CBSE",
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  principalName: "Dr. Ananya Verma",
  principalEmail: "principal@school.edu",
  principalMobile: "+919876543210",
};

const signUpData = {
  fullName: "Dr. Ananya Verma",
  email: "principal@school.edu",
  phone: "+919876543210",
  role: "principal" as const,
  designation: "Principal",
  password: "SecurePass123",
  confirmPassword: "SecurePass123",
  acceptTerms: true,
  registrationPayload,
};

describe("API registration sign-up wiring", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("resolvePostSignupRoute sends API users to pending verification", async () => {
    const { resolvePostSignupRoute } = await import("./signup-routing");
    expect(resolvePostSignupRoute(true)).toBe("/pending-verification");
    expect(resolvePostSignupRoute(false)).toBe("/verify-email-otp");
  });

  it("runApiInstituteSignUp calls registration API and signs in", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");

    const registration = {
      id: "reg-1",
      status: "pending" as const,
      payload: registrationPayload,
      createdAt: "2024-06-01T08:00:00Z",
      applicantUserId: user.id,
      applicantName: user.name,
      email: user.email,
      phone: user.phone ?? null,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      instituteId: null,
      updatedAt: "2024-06-01T08:00:00Z",
    };

    const submitRegistration = vi.fn().mockResolvedValue(registration);
    const apiSignInWithPassword = vi.fn().mockResolvedValue({
      user,
      meInstitutes: [],
      activeInstituteId: null,
    });

    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({ apiSignInWithPassword }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");
    const { getApiRegistrationSnapshot } = await import("./api-registration-state");

    const hydrated = await runApiInstituteSignUp(signUpData);

    expect(submitRegistration).toHaveBeenCalledWith({
      applicantName: "Dr. Ananya Verma",
      email: "principal@school.edu",
      password: "SecurePass123",
      phone: "+919876543210",
      payload: registrationPayload,
    });
    expect(apiSignInWithPassword).toHaveBeenCalledWith(
      "principal@school.edu",
      "SecurePass123",
    );
    expect(hydrated.user).toEqual(user);
    expect(getApiRegistrationSnapshot()?.status).toBe("pending");
  });

  it("runApiInstituteSignUp failure clears snapshot and does not sign in", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");

    const submitRegistration = vi.fn().mockRejectedValue(new Error("Email already exists"));
    const apiSignInWithPassword = vi.fn();

    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({ apiSignInWithPassword }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");
    const { getApiRegistrationSnapshot } = await import("./api-registration-state");

    await expect(runApiInstituteSignUp(signUpData)).rejects.toThrow(
      "Email already exists",
    );
    expect(apiSignInWithPassword).not.toHaveBeenCalled();
    expect(getApiRegistrationSnapshot()).toBeUndefined();
  });

  it("demo signUp path is not used by runApiInstituteSignUp on failure", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");

    const submitRegistration = vi.fn().mockRejectedValue(new Error("Network error"));
    const mockSignUp = vi.fn();

    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({
      apiSignInWithPassword: vi.fn(),
    }));
    vi.doMock("./auth-store", () => ({
      mockSignUp,
      registerDemoUser: vi.fn(),
    }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");

    await expect(runApiInstituteSignUp(signUpData)).rejects.toThrow("Network error");
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});

describe("resolveRegistrationGate API mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("routes pending API registration to pending verification", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("./api-registration-state", () => ({
      getApiRegistrationView: () => ({
        boundUserId: user.id,
        loaded: true,
        syncing: false,
        syncError: null,
        snapshot: {
          id: "reg-1",
          status: "pending",
          payload: { instituteName: "Alpha School" },
          createdAt: "2024-06-01T08:00:00Z",
        },
      }),
    }));
    const { resolveRegistrationGate, registrationGatePath } = await import(
      "./registration-gate"
    );
    expect(resolveRegistrationGate(user).kind).toBe("pending");
    expect(registrationGatePath("pending")).toBe("/pending-verification");
  });

  it("allows API users without a registration row", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("./api-registration-state", () => ({
      getApiRegistrationView: () => ({
        boundUserId: user.id,
        loaded: true,
        syncing: false,
        syncError: null,
        snapshot: null,
      }),
    }));
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("allow");
  });
});
