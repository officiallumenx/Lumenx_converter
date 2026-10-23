/**
 * Approval status recovery: force entry refresh, stale pending invalidation,
 * Check Status / sync dedupe, errors do not invent approval.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function registration(
  status: InstituteRegistrationDto["status"],
  overrides: Partial<InstituteRegistrationDto> = {},
): InstituteRegistrationDto {
  return {
    id: "reg-1",
    applicantUserId: USER_A,
    applicantName: "Principal",
    email: "principal@school.edu",
    phone: null,
    payload: { instituteName: "Alpha School" },
    status,
    reviewedBy: null,
    reviewedAt: status !== "pending" ? "2024-06-02T08:00:00Z" : null,
    rejectionReason: status === "rejected" ? "Incomplete" : null,
    instituteId: status === "approved" ? INST : null,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
    ...overrides,
  };
}

describe("approval status recovery", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
  });

  it("force ensure replaces stale pending with approved from the server", async () => {
    const fetchOwnRegistration = vi
      .fn()
      .mockResolvedValueOnce(registration("approved"));
    vi.doMock("@/lib/registrations/api", () => ({
      fetchOwnRegistration,
      submitRegistration: vi.fn(),
      resubmitOwnRegistration: vi.fn(),
    }));

    const {
      bindApiRegistrationUser,
      setApiRegistrationSnapshot,
      ensureApiRegistrationForUser,
      getApiRegistrationView,
    } = await import("./api-registration-state");
    const { resolveRegistrationGate } = await import("./registration-gate");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    expect(getApiRegistrationView().snapshot?.status).toBe("pending");

    const latest = await ensureApiRegistrationForUser(USER_A, { force: true });
    expect(fetchOwnRegistration).toHaveBeenCalledTimes(1);
    expect(latest?.status).toBe("approved");
    expect(getApiRegistrationView().snapshot?.status).toBe("approved");

    const user = {
      id: USER_A,
      email: "principal@school.edu",
      name: "Principal",
      initials: "PR",
      role: "principal" as const,
      title: "principal",
      instituteId: INST,
      instituteName: "Alpha School",
      isVerified: true,
      mfaEnabled: false,
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(resolveRegistrationGate(user).kind).toBe("allow");
  });

  it("Check Status sync does not invent approval when the API fails", async () => {
    const fetchOwnRegistration = vi
      .fn()
      .mockRejectedValue(new Error("Upstream down"));
    vi.doMock("@/lib/registrations/api", () => ({
      fetchOwnRegistration,
      submitRegistration: vi.fn(),
      resubmitOwnRegistration: vi.fn(),
    }));

    const {
      bindApiRegistrationUser,
      setApiRegistrationSnapshot,
      syncApiRegistrationFromBackend,
      getApiRegistrationView,
    } = await import("./api-registration-state");
    const {
      getApplicationStatusForEmail,
      refreshApplicationStatus,
    } = await import("./pending-verification-data");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);

    await expect(syncApiRegistrationFromBackend()).rejects.toThrow(/Upstream/);
    expect(getApiRegistrationView().snapshot?.status).toBe("pending");
    expect(getApiRegistrationView().syncError).toMatch(/Upstream/);

    // Stale pending may remain for context, but loadState must be error (Retry).
    const gated = getApplicationStatusForEmail("principal@school.edu");
    expect(gated.loadState).toBe("error");
    expect(gated.errorMessage).toMatch(/Upstream/);
    expect(gated.overallStatus).toBe("under_review");

    const status = await refreshApplicationStatus("principal@school.edu");
    expect(status.loadState).toBe("error");
    expect(status.overallStatus).not.toBe("approved");
    expect(status.overallStatus).not.toBe("rejected");
  });

  it("deduplicates concurrent syncApiRegistrationFromBackend calls", async () => {
    let resolveFetch!: (value: InstituteRegistrationDto) => void;
    const fetchOwnRegistration = vi.fn(
      () =>
        new Promise<InstituteRegistrationDto>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    vi.doMock("@/lib/registrations/api", () => ({
      fetchOwnRegistration,
      submitRegistration: vi.fn(),
      resubmitOwnRegistration: vi.fn(),
    }));

    const { bindApiRegistrationUser, syncApiRegistrationFromBackend } =
      await import("./api-registration-state");

    bindApiRegistrationUser(USER_A);
    const p1 = syncApiRegistrationFromBackend();
    const p2 = syncApiRegistrationFromBackend();
    expect(fetchOwnRegistration).toHaveBeenCalledTimes(1);

    resolveFetch(registration("pending"));
    const [a, b] = await Promise.all([p1, p2]);
    expect(a?.status).toBe("pending");
    expect(b?.status).toBe("pending");
    expect(fetchOwnRegistration).toHaveBeenCalledTimes(1);
  });

  it("without force, ensure keeps cached pending (poll/Check Status must refresh)", async () => {
    const fetchOwnRegistration = vi.fn().mockResolvedValue(registration("approved"));
    vi.doMock("@/lib/registrations/api", () => ({
      fetchOwnRegistration,
      submitRegistration: vi.fn(),
      resubmitOwnRegistration: vi.fn(),
    }));

    const {
      bindApiRegistrationUser,
      setApiRegistrationSnapshot,
      ensureApiRegistrationForUser,
      getApiRegistrationView,
    } = await import("./api-registration-state");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    const cached = await ensureApiRegistrationForUser(USER_A);
    expect(cached?.status).toBe("pending");
    expect(fetchOwnRegistration).not.toHaveBeenCalled();
    expect(getApiRegistrationView().snapshot?.status).toBe("pending");
  });

  it("pending and rejected gates keep protected dashboard path blocked", async () => {
    const { setApiRegistrationSnapshot, bindApiRegistrationUser } = await import(
      "./api-registration-state"
    );
    const { resolveRegistrationGate, registrationGatePath } = await import(
      "./registration-gate"
    );

    const user = {
      id: USER_A,
      email: "principal@school.edu",
      name: "Principal",
      initials: "PR",
      role: "principal" as const,
      title: "principal",
      instituteId: "",
      instituteName: "",
      isVerified: true,
      mfaEnabled: false,
      createdAt: "2024-01-01T00:00:00Z",
    };

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    expect(resolveRegistrationGate(user).kind).toBe("pending");
    expect(registrationGatePath("pending")).toBe("/pending-verification");

    setApiRegistrationSnapshot(registration("rejected"), USER_A);
    expect(resolveRegistrationGate(user).kind).toBe("rejected");
    expect(registrationGatePath("rejected")).toBe("/pending-verification");
  });
});
