import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("pending-reviews-api-store", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns zero counts outside API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { refreshPendingReviewsApi, getPendingReviewsApiCounts } = await import(
      "./pending-reviews-api-store"
    );
    await refreshPendingReviewsApi(INST, 3);
    expect(getPendingReviewsApiCounts()).toEqual({
      submittedMarks: 0,
      pendingTeacherLeave: 0,
      pendingAdmissionConverts: 0,
      pendingCareerHires: 0,
      pendingTransportStops: 0,
      pendingTransportAssignments: 0,
    });
  });

  it("counts submitted marks and approved admissions awaiting convert", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/lib/marks/api", () => ({
      listMarkEntries: vi.fn().mockResolvedValue([{ id: "m1" }, { id: "m2" }]),
    }));
    vi.doMock("@/lib/admissions/api", () => ({
      listAdmissionApplications: vi.fn().mockResolvedValue([
        { status: "approved", convertedStudentId: null },
        { status: "approved", convertedStudentId: "student-1" },
      ]),
    }));
    vi.doMock("@/lib/careers/api", () => ({
      listCareerApplications: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/transport/approval-api", () => ({
      listTransportReviewQueue: vi.fn().mockResolvedValue([]),
    }));

    const { refreshPendingReviewsApi, getPendingReviewsApiCounts } = await import(
      "./pending-reviews-api-store"
    );
    await refreshPendingReviewsApi(INST, 4);

    expect(getPendingReviewsApiCounts()).toMatchObject({
      submittedMarks: 2,
      pendingTeacherLeave: 4,
      pendingAdmissionConverts: 1,
      pendingCareerHires: 0,
    });
  });
});
