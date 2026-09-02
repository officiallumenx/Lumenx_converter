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

function mockApiView(
  view: Partial<ReturnType<typeof import("./api-registration-state").getApiRegistrationView>>,
) {
  vi.doMock("./api-registration-state", () => ({
    getApiRegistrationView: () => ({
      boundUserId: user.id,
      snapshot: null,
      syncError: null,
      loaded: true,
      syncing: false,
      ...view,
    }),
    getApiRegistrationSnapshot: () => view.snapshot,
    subscribeApiRegistration: () => () => undefined,
    bindApiRegistrationUser: vi.fn(),
    ensureApiRegistrationForUser: vi.fn(),
    syncApiRegistrationFromBackend: vi.fn(),
    setApiRegistrationSnapshot: vi.fn(),
    clearApiRegistrationSnapshot: vi.fn(),
  }));
}

describe("resolveRegistrationGate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("routes pending API registration to pending verification", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    mockApiView({
      snapshot: {
        id: "reg-1",
        applicantUserId: user.id,
        applicantName: user.name,
        email: user.email,
        phone: null,
        payload: { instituteName: "Alpha School" },
        status: "pending",
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: null,
        instituteId: null,
        createdAt: "2024-06-01T08:00:00Z",
        updatedAt: "2024-06-01T08:00:00Z",
      },
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user)).toEqual({
      kind: "pending",
      application: null,
    });
  });

  it("allows API users without a registration row", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    mockApiView({ snapshot: null });
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
