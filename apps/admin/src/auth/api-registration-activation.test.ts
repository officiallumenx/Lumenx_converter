import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "./types";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

const USER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_INST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

const user: AuthUser = {
  id: USER_ID,
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

function approvedRegistration(
  overrides: Partial<InstituteRegistrationDto> = {},
): InstituteRegistrationDto {
  return {
    id: "reg-1",
    applicantUserId: USER_ID,
    applicantName: user.name,
    email: user.email,
    phone: null,
    payload: { instituteName: "Alpha School" },
    status: "approved",
    reviewedBy: "reviewer-1",
    reviewedAt: "2024-06-02T08:00:00Z",
    rejectionReason: null,
    instituteId: INST_ID,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
    ...overrides,
  };
}

describe("approvedRegistrationNeedsActivation", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns true when approved registration institute is not bound on the user", async () => {
    const { approvedRegistrationNeedsActivation } = await import(
      "./api-registration-activation"
    );
    expect(
      approvedRegistrationNeedsActivation(user, approvedRegistration()),
    ).toBe(true);
  });

  it("returns false when user already has the approved institute", async () => {
    const { approvedRegistrationNeedsActivation } = await import(
      "./api-registration-activation"
    );
    expect(
      approvedRegistrationNeedsActivation(
        { ...user, instituteId: INST_ID },
        approvedRegistration(),
      ),
    ).toBe(false);
  });

  it("returns false for pending registration", async () => {
    const { approvedRegistrationNeedsActivation } = await import(
      "./api-registration-activation"
    );
    expect(
      approvedRegistrationNeedsActivation(user, {
        ...approvedRegistration(),
        status: "pending",
        instituteId: null,
      }),
    ).toBe(false);
  });
});

describe("activateApprovedApiRegistration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("binds active institute when /me membership exists", async () => {
    const hydrateFromAccessToken = vi
      .fn()
      .mockResolvedValueOnce({
        user: { ...user, instituteId: "", instituteName: "Institute" },
        meInstitutes: [{ instituteId: INST_ID, status: "active", roles: ["institute_admin"] }],
        activeInstituteId: null,
      })
      .mockResolvedValueOnce({
        user: { ...user, instituteId: INST_ID, instituteName: "Alpha School" },
        meInstitutes: [{ instituteId: INST_ID, status: "active", roles: ["institute_admin"] }],
        activeInstituteId: INST_ID,
      });
    const selectActiveInstitute = vi.fn();
    const saveSession = vi.fn();
    vi.doMock("./api-auth", () => ({ hydrateFromAccessToken }));
    vi.doMock("@/lib/supabase-browser", () => ({
      getSupabaseAccessToken: vi.fn().mockResolvedValue("token-1"),
    }));
    vi.doMock("@/lib/active-institute", () => ({ selectActiveInstitute }));
    vi.doMock("./auth-store", () => ({ saveSession }));

    const { activateApprovedApiRegistration } = await import(
      "./api-registration-activation"
    );
    const result = await activateApprovedApiRegistration(approvedRegistration());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.activeInstituteId).toBe(INST_ID);
      expect(result.user.instituteId).toBe(INST_ID);
      expect(result.user.isVerified).toBe(true);
    }
    expect(selectActiveInstitute).toHaveBeenCalledWith(INST_ID, [
      { instituteId: INST_ID, status: "active", roles: ["institute_admin"] },
    ]);
    expect(saveSession).toHaveBeenCalled();
  });

  it("does not fake institute authority when membership is missing", async () => {
    const hydrateFromAccessToken = vi.fn().mockResolvedValue({
      user,
      meInstitutes: [],
      activeInstituteId: null,
    });
    const selectActiveInstitute = vi.fn();
    const saveSession = vi.fn();
    vi.doMock("./api-auth", () => ({ hydrateFromAccessToken }));
    vi.doMock("@/lib/supabase-browser", () => ({
      getSupabaseAccessToken: vi.fn().mockResolvedValue("token-1"),
    }));
    vi.doMock("@/lib/active-institute", () => ({ selectActiveInstitute }));
    vi.doMock("./auth-store", () => ({ saveSession }));

    const { activateApprovedApiRegistration } = await import(
      "./api-registration-activation"
    );
    const result = await activateApprovedApiRegistration(approvedRegistration());

    expect(result).toEqual({
      ok: false,
      reason: "no_membership",
      message: "Institute membership is not active yet. Try refreshing in a moment.",
    });
    expect(selectActiveInstitute).not.toHaveBeenCalled();
    expect(saveSession).not.toHaveBeenCalled();
  });

  it("rejects cross-institute selection outside membership", async () => {
    const hydrateFromAccessToken = vi.fn().mockResolvedValue({
      user,
      meInstitutes: [{ instituteId: OTHER_INST, status: "active", roles: ["institute_admin"] }],
      activeInstituteId: null,
    });
    const selectActiveInstitute = vi.fn(() => {
      throw new Error("Selected institute is not available for this account");
    });
    vi.doMock("./api-auth", () => ({ hydrateFromAccessToken }));
    vi.doMock("@/lib/supabase-browser", () => ({
      getSupabaseAccessToken: vi.fn().mockResolvedValue("token-1"),
    }));
    vi.doMock("@/lib/active-institute", () => ({ selectActiveInstitute }));
    vi.doMock("./auth-store", () => ({ saveSession: vi.fn() }));

    const { activateApprovedApiRegistration } = await import(
      "./api-registration-activation"
    );
    const result = await activateApprovedApiRegistration(approvedRegistration());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("no_membership");
    }
  });
});

describe("finalizeApiAuthUser", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("activates approved registration on bootstrap", async () => {
    const hydrated = {
      user,
      meInstitutes: [],
      activeInstituteId: null,
    };
    const ensureApiRegistrationForUser = vi
      .fn()
      .mockResolvedValue(approvedRegistration());
    const activateApprovedApiRegistration = vi.fn().mockResolvedValue({
      ok: true,
      user: { ...user, instituteId: INST_ID, instituteName: "Alpha School" },
      activeInstituteId: INST_ID,
    });
    vi.doMock("./api-registration-state", () => ({
      ensureApiRegistrationForUser,
    }));
    vi.doMock("./api-registration-activation", () => ({
      approvedRegistrationNeedsActivation: vi.fn(() => true),
      activateApprovedApiRegistration,
    }));

    const { finalizeApiAuthUser } = await import("./api-auth-finalize");
    const next = await finalizeApiAuthUser(hydrated);

    expect(ensureApiRegistrationForUser).toHaveBeenCalledWith(USER_ID);
    expect(activateApprovedApiRegistration).toHaveBeenCalled();
    expect(next.instituteId).toBe(INST_ID);
  });

  it("returns hydrated user when registration is still pending", async () => {
    const hydrated = {
      user,
      meInstitutes: [],
      activeInstituteId: null,
    };
    vi.doMock("./api-registration-state", () => ({
      ensureApiRegistrationForUser: vi.fn().mockResolvedValue({
        ...approvedRegistration(),
        status: "pending",
        instituteId: null,
      }),
    }));
    vi.doMock("./api-registration-activation", () => ({
      approvedRegistrationNeedsActivation: vi.fn(() => false),
      activateApprovedApiRegistration: vi.fn(),
    }));

    const { finalizeApiAuthUser } = await import("./api-auth-finalize");
    const next = await finalizeApiAuthUser(hydrated);
    expect(next).toBe(user);
  });
});
