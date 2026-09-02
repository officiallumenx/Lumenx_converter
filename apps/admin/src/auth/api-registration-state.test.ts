import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function registration(applicantUserId: string): InstituteRegistrationDto {
  return {
    id: "reg-1",
    applicantUserId,
    applicantName: "Applicant",
    email: "principal@school.edu",
    phone: null,
    payload: { instituteName: "Alpha School" },
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    instituteId: null,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-01T08:00:00Z",
  };
}

describe("api-registration-state", () => {
  beforeEach(async () => {
    vi.resetModules();
    const { clearApiRegistrationSnapshot } = await import("./api-registration-state");
    clearApiRegistrationSnapshot();
  });

  it("returns the same view reference when data is unchanged (useSyncExternalStore safe)", async () => {
    const { getApiRegistrationView } = await import("./api-registration-state");

    const first = getApiRegistrationView();
    const second = getApiRegistrationView();
    expect(second).toBe(first);
  });

  it("returns a stable server snapshot reference", async () => {
    const { getApiRegistrationServerSnapshot } = await import("./api-registration-state");

    expect(getApiRegistrationServerSnapshot()).toBe(getApiRegistrationServerSnapshot());
  });

  it("resets loaded snapshot when user id changes", async () => {
    const {
      bindApiRegistrationUser,
      setApiRegistrationSnapshot,
      getApiRegistrationView,
    } = await import("./api-registration-state");

    setApiRegistrationSnapshot(registration(USER_A), USER_A);
    expect(getApiRegistrationView().loaded).toBe(true);

    bindApiRegistrationUser(USER_B);
    const view = getApiRegistrationView();
    expect(view.boundUserId).toBe(USER_B);
    expect(view.loaded).toBe(false);
    expect(view.snapshot).toBeUndefined();
  });
});
