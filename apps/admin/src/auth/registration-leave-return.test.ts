/**
 * Leave / return / cache-clear / user-switch behaviour for Admin institute
 * registration approval status (API mode). Server remains source of truth.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
    instituteId: status === "approved" ? "cccccccc-cccc-4ccc-8ccc-cccccccccccc" : null,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
    ...overrides,
  };
}

describe("Admin registration leave/return (API)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
  });

  it("A/B — pending snapshot survives process restart only via backend refetch (memory cleared)", async () => {
    const {
      setApiRegistrationSnapshot,
      clearApiRegistrationSnapshot,
      getApiRegistrationView,
      bindApiRegistrationUser,
    } = await import("./api-registration-state");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    expect(getApiRegistrationView().snapshot?.status).toBe("pending");

    // Simulate app close wiping in-memory registration view (never persisted).
    clearApiRegistrationSnapshot();
    expect(getApiRegistrationView().loaded).toBe(false);
    expect(getApiRegistrationView().snapshot).toBeUndefined();

    // Reopen: bind + set from GET /registrations/me (mocked here as restored pending).
    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    expect(getApiRegistrationView().snapshot?.status).toBe("pending");
    expect(getApiRegistrationView().snapshot?.payload.instituteName).toBe(
      "Alpha School",
    );
  });

  it("C — approval while closed: refetch replaces pending with approved (no sticky pending block)", async () => {
    const {
      setApiRegistrationSnapshot,
      clearApiRegistrationSnapshot,
      getApiRegistrationView,
      bindApiRegistrationUser,
    } = await import("./api-registration-state");
    const { resolveRegistrationGate } = await import("./registration-gate");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    clearApiRegistrationSnapshot();

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("approved"), USER_A);

    const user = {
      id: USER_A,
      email: "principal@school.edu",
      name: "Principal",
      initials: "PR",
      role: "principal" as const,
      title: "principal",
      instituteId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      instituteName: "Alpha School",
      isVerified: true,
      mfaEnabled: false,
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(getApiRegistrationView().snapshot?.status).toBe("approved");
    expect(resolveRegistrationGate(user).kind).toBe("allow");
  });

  it("D — refresh during pending: invalidate forces next sync to hit backend", async () => {
    const {
      setApiRegistrationSnapshot,
      invalidateApiRegistrationCache,
      getApiRegistrationView,
      bindApiRegistrationUser,
    } = await import("./api-registration-state");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    expect(getApiRegistrationView().loaded).toBe(true);

    invalidateApiRegistrationCache();
    expect(getApiRegistrationView().loaded).toBe(false);
    expect(getApiRegistrationView().snapshot).toBeUndefined();

    setApiRegistrationSnapshot(registration("approved"), USER_A);
    expect(getApiRegistrationView().snapshot?.status).toBe("approved");
  });

  it("E/F — cleared local registration cache does not invent a second registration row", async () => {
    const {
      setApiRegistrationSnapshot,
      clearApiRegistrationSnapshot,
      getApiRegistrationView,
      bindApiRegistrationUser,
    } = await import("./api-registration-state");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending", { id: "reg-1" }), USER_A);
    clearApiRegistrationSnapshot();
    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending", { id: "reg-1" }), USER_A);

    expect(getApiRegistrationView().snapshot?.id).toBe("reg-1");
  });

  it("G — logout clears registration view; other user cannot see prior pending row", async () => {
    const {
      setApiRegistrationSnapshot,
      clearApiRegistrationSnapshot,
      getApiRegistrationView,
      bindApiRegistrationUser,
    } = await import("./api-registration-state");
    const { resolveRegistrationGate } = await import("./registration-gate");

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    clearApiRegistrationSnapshot();

    bindApiRegistrationUser(USER_B);
    setApiRegistrationSnapshot(
      registration("pending", {
        id: "reg-b",
        applicantUserId: USER_B,
        email: "other@school.edu",
        payload: { instituteName: "Beta School" },
      }),
      USER_B,
    );

    expect(getApiRegistrationView().boundUserId).toBe(USER_B);
    expect(getApiRegistrationView().snapshot?.payload.instituteName).toBe(
      "Beta School",
    );

    // USER_A identity against USER_B-bound view → loading (isolation), not Beta data allow.
    const userA = {
      id: USER_A,
      email: "principal@school.edu",
      name: "Principal",
      initials: "PR",
      role: "principal" as const,
      title: "principal",
      instituteId: "",
      instituteName: "",
      isVerified: false,
      mfaEnabled: false,
      createdAt: "2024-01-01T00:00:00Z",
    };
    expect(resolveRegistrationGate(userA).kind).toBe("loading");
  });

  it("pending status UI does not invent a review SLA", async () => {
    const { setApiRegistrationSnapshot, bindApiRegistrationUser } = await import(
      "./api-registration-state"
    );
    const { getApplicationStatusForEmail } = await import(
      "./pending-verification-data"
    );

    bindApiRegistrationUser(USER_A);
    setApiRegistrationSnapshot(registration("pending"), USER_A);
    const status = getApplicationStatusForEmail("principal@school.edu");
    expect(status.overallStatus).toBe("under_review");
    expect(status.estimatedReviewDays).toBe("—");
    expect(status.estimatedReviewDays).not.toMatch(/business day/i);
  });
});
