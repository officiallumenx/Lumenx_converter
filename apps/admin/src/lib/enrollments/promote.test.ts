import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ENROLL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("enrollment promote API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses demo mode", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => false }));
    const { promoteEnrollments } = await import("./promote");
    await expect(
      promoteEnrollments({
        instituteId: INST,
        sourceAcademicYearId: YEAR,
        targetAcademicYearId: YEAR,
        items: [{ enrollmentId: ENROLL, action: "hold" }],
      }),
    ).rejects.toThrow(/API auth mode/i);
  });

  it("posts promote batch in api mode", async () => {
    const post = vi.fn().mockResolvedValue({
      items: [
        {
          enrollmentId: ENROLL,
          action: "hold",
          sourceEnrollment: { id: ENROLL },
          targetEnrollment: null,
        },
      ],
    });
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    vi.doMock("@/lib/admin-api", () => ({
      getAdminApiClient: () => ({ post }),
    }));
    const { promoteEnrollments } = await import("./promote");
    const rows = await promoteEnrollments({
      instituteId: INST,
      sourceAcademicYearId: YEAR,
      targetAcademicYearId: YEAR,
      items: [{ enrollmentId: ENROLL, action: "hold" }],
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/enrollments/promote",
      expect.objectContaining({
        institute_id: INST,
        items: [expect.objectContaining({ enrollment_id: ENROLL, action: "hold" })],
      }),
    );
    expect(rows).toHaveLength(1);
  });

  it("posts graduate batch in api mode", async () => {
    const post = vi.fn().mockResolvedValue([{ id: ENROLL, status: "graduated" }]);
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    vi.doMock("@/lib/admin-api", () => ({
      getAdminApiClient: () => ({ post }),
    }));
    const { graduateEnrollments } = await import("./promote");
    const rows = await graduateEnrollments({
      instituteId: INST,
      academicYearId: YEAR,
      enrollmentIds: [ENROLL],
    });
    expect(post).toHaveBeenCalledWith(
      "/api/v1/enrollments/graduate",
      expect.objectContaining({
        institute_id: INST,
        enrollment_ids: [ENROLL],
      }),
    );
    expect(rows[0]?.status).toBe("graduated");
  });
});
