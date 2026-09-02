import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const user: AuthUser = {
  id: USER_A,
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

function registration(
  status: InstituteRegistrationDto["status"],
  overrides: Partial<InstituteRegistrationDto> = {},
): InstituteRegistrationDto {
  return {
    id: "reg-1",
    applicantUserId: USER_A,
    applicantName: user.name,
    email: user.email,
    phone: null,
    payload: { instituteName: "Alpha School" },
    status,
    reviewedBy: null,
    reviewedAt: status !== "pending" ? "2024-06-02T08:00:00Z" : null,
    rejectionReason: status === "rejected" ? "Incomplete documents" : null,
    instituteId: status === "approved" ? "cccccccc-cccc-4ccc-8ccc-cccccccccccc" : null,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
    ...overrides,
  };
}

function mockRegistrationView(
  view: Partial<ReturnType<typeof import("./api-registration-state").getApiRegistrationView>>,
) {
  vi.doMock("./api-registration-state", () => ({
    getApiRegistrationView: () => ({
      boundUserId: USER_A,
      snapshot: undefined,
      syncError: null,
      loaded: false,
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
    invalidateApiRegistrationCache: vi.fn(),
  }));
}

describe("resolveRegistrationGate API pending status", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
  });

  it("blocks pending applicants from Admin workflows", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: registration("pending"),
    });
    const { resolveRegistrationGate, registrationGatePath } = await import(
      "./registration-gate"
    );
    expect(resolveRegistrationGate(user).kind).toBe("pending");
    expect(registrationGatePath("pending")).toBe("/pending-verification");
  });

  it("allows approved applicants with bound institute access", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: registration("approved"),
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(
      resolveRegistrationGate({
        ...user,
        instituteId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }).kind,
    ).toBe("allow");
  });

  it("keeps approved applicants loading until institute membership is bound", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: registration("approved"),
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("loading");
  });

  it("blocks rejected applicants", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: registration("rejected"),
    });
    const { resolveRegistrationGate, registrationGatePath } = await import(
      "./registration-gate"
    );
    expect(resolveRegistrationGate(user).kind).toBe("rejected");
    expect(registrationGatePath("rejected")).toBe("/pending-verification");
  });

  it("blocks access while registration status is loading", async () => {
    mockRegistrationView({
      loaded: false,
      snapshot: undefined,
      syncing: true,
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("loading");
  });

  it("blocks access when the registration API fails", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: null,
      syncError: "Service unavailable",
    });
    const { resolveRegistrationGate, registrationGatePath } = await import(
      "./registration-gate"
    );
    const gate = resolveRegistrationGate(user);
    expect(gate.kind).toBe("error");
    expect(gate.errorMessage).toBe("Service unavailable");
    expect(registrationGatePath("error")).toBe("/pending-verification");
  });

  it("clears stale registration when the authenticated user changes", async () => {
    mockRegistrationView({
      boundUserId: USER_B,
      loaded: true,
      snapshot: registration("pending"),
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("loading");
  });

  it("allows existing API admins with no registration row", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: null,
      syncError: null,
    });
    const { resolveRegistrationGate } = await import("./registration-gate");
    expect(resolveRegistrationGate(user).kind).toBe("allow");
  });
});

describe("getApplicationStatusForEmail API mode", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
  });

  it("never reads demo registration store in API mode", async () => {
    const findInstituteRegistrationByEmail = vi.fn(() => ({
      status: "approved",
      payload: { instituteName: "Demo School" },
    }));
    vi.doMock("@lumenx/utils", () => ({ findInstituteRegistrationByEmail }));
    mockRegistrationView({
      loaded: true,
      snapshot: registration("pending"),
    });
    const { getApplicationStatusForEmail } = await import(
      "./pending-verification-data"
    );
    const status = getApplicationStatusForEmail(user.email);
    expect(findInstituteRegistrationByEmail).not.toHaveBeenCalled();
    expect(status.overallLabel).toBe("Institute Registration Under Review");
    expect(status.loadState).toBe("ready");
  });

  it("surfaces explicit API errors on the pending page", async () => {
    mockRegistrationView({
      loaded: true,
      snapshot: null,
      syncError: "Upstream registration service failed",
    });
    const { getApplicationStatusForEmail } = await import(
      "./pending-verification-data"
    );
    const status = getApplicationStatusForEmail(user.email);
    expect(status.loadState).toBe("error");
    expect(status.errorMessage).toBe("Upstream registration service failed");
  });
});
