import { beforeEach, describe, expect, it, vi } from "vitest";

const REG_ID = "11111111-1111-4111-8111-111111111111";
const INST_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function approvedDto() {
  return {
    id: REG_ID,
    applicantUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    applicantName: "Applicant",
    email: "principal@school.edu",
    phone: null,
    payload: { instituteName: "Alpha School" },
    status: "approved" as const,
    reviewedBy: "reviewer-1",
    reviewedAt: "2024-06-02T08:00:00Z",
    rejectionReason: null,
    instituteId: INST_ID,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-02T08:00:00Z",
  };
}

describe("performApiApprove", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls the approve API endpoint", async () => {
    const approveRegistration = vi.fn().mockResolvedValue(approvedDto());
    vi.doMock("./api", () => ({ approveRegistration, rejectRegistration: vi.fn() }));

    const { performApiApprove } = await import("./review-actions");
    const result = await performApiApprove(REG_ID);

    expect(approveRegistration).toHaveBeenCalledWith(REG_ID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("approve");
      expect(result.registration.instituteId).toBe(INST_ID);
    }
  });

  it("does not fake approval when the API fails", async () => {
    const approveRegistration = vi.fn().mockRejectedValue(new Error("Server error"));
    const approveInstituteRegistration = vi.fn();
    vi.doMock("./api", () => ({ approveRegistration, rejectRegistration: vi.fn() }));
    vi.doMock("@lumenx/utils", () => ({ approveInstituteRegistration }));

    const { performApiApprove } = await import("./review-actions");
    const result = await performApiApprove(REG_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe("Server error");
    }
    expect(approveInstituteRegistration).not.toHaveBeenCalled();
  });

  it("handles unauthorized approve responses", async () => {
    const { ApiClientError } = await import("@/lib/api");
    const approveRegistration = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ approveRegistration, rejectRegistration: vi.fn() }));

    const { performApiApprove } = await import("./review-actions");
    const result = await performApiApprove(REG_ID);

    expect(result).toEqual({
      ok: false,
      action: "approve",
      message: "Authentication required",
      unauthorized: true,
      forbidden: false,
    });
  });
});

describe("performApiReject", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("calls the reject API endpoint with reason", async () => {
    const rejectRegistration = vi.fn().mockResolvedValue({
      ...approvedDto(),
      status: "rejected",
      instituteId: null,
      rejectionReason: "Incomplete documents",
    });
    vi.doMock("./api", () => ({ approveRegistration: vi.fn(), rejectRegistration }));

    const { performApiReject } = await import("./review-actions");
    const result = await performApiReject(REG_ID, "Incomplete documents");

    expect(rejectRegistration).toHaveBeenCalledWith(REG_ID, "Incomplete documents");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.action).toBe("reject");
      expect(result.registration.status).toBe("rejected");
    }
  });

  it("requires a rejection reason before calling the API", async () => {
    const rejectRegistration = vi.fn();
    vi.doMock("./api", () => ({ approveRegistration: vi.fn(), rejectRegistration }));

    const { performApiReject } = await import("./review-actions");
    const result = await performApiReject(REG_ID, "   ");

    expect(rejectRegistration).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/reason is required/i);
    }
  });

  it("does not fake rejection when the API fails", async () => {
    const rejectRegistration = vi.fn().mockRejectedValue(new Error("Forbidden"));
    const rejectInstituteRegistration = vi.fn();
    vi.doMock("./api", () => ({ approveRegistration: vi.fn(), rejectRegistration }));
    vi.doMock("@lumenx/utils", () => ({ rejectInstituteRegistration }));

    const { performApiReject } = await import("./review-actions");
    const result = await performApiReject(REG_ID, "Invalid affiliation");

    expect(result.ok).toBe(false);
    expect(rejectInstituteRegistration).not.toHaveBeenCalled();
  });

  it("handles forbidden reject responses", async () => {
    const { ApiClientError } = await import("@/lib/api");
    const rejectRegistration = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "Insufficient platform role",
      }),
    );
    vi.doMock("./api", () => ({ approveRegistration: vi.fn(), rejectRegistration }));

    const { performApiReject } = await import("./review-actions");
    const result = await performApiReject(REG_ID, "Does not meet criteria");

    expect(result).toEqual({
      ok: false,
      action: "reject",
      message: "Insufficient platform role",
      unauthorized: false,
      forbidden: true,
    });
  });
});

describe("queue refresh after review action", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("reloads registrations from the API after a successful approve", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const approved = approvedDto();
    const listRegistrations = vi
      .fn()
      .mockResolvedValueOnce([{ ...approved, status: "pending", instituteId: null }])
      .mockResolvedValueOnce([approved]);
    const approveRegistration = vi.fn().mockResolvedValue(approved);

    vi.doMock("./api", () => ({
      listRegistrations,
      approveRegistration,
      rejectRegistration: vi.fn(),
    }));

    const { performApiApprove } = await import("./review-actions");
    const { loadRegistrationsQueue } = await import("./load-queue");

    const before = await loadRegistrationsQueue();
    const action = await performApiApprove(REG_ID);
    const after = await loadRegistrationsQueue();

    expect(action.ok).toBe(true);
    expect(listRegistrations).toHaveBeenCalledTimes(2);
    if (before.status === "ready" && after.status === "ready") {
      expect(before.applications[0]?.status).toBe("pending");
      expect(after.applications[0]?.status).toBe("approved");
    }
  });
});
