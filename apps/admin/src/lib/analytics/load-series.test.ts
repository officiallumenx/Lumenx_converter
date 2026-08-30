import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAnalyticsSeries", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling series API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSeries = vi.fn();
    vi.doMock("./api", () => ({ getAnalyticsSeries }));
    const { loadAnalyticsSeries } = await import("./load-series");
    const result = await loadAnalyticsSeries(INST, "term");
    expect(result.status).toBe("demo");
    expect(result.series).toBeNull();
    expect(getAnalyticsSeries).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadAnalyticsSeries } = await import("./load-series");
    const result = await loadAnalyticsSeries("not-a-uuid", "year");
    expect(result.status).toBe("needs_institute");
  });

  it("maps series DTO in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getAnalyticsSeries = vi.fn().mockResolvedValue({
      instituteId: INST,
      range: "term",
      fromMonth: "2026-05",
      toMonth: "2026-08",
      studentStatus: [{ status: "active", label: "Active", count: 3 }],
      enrollmentMonthly: [],
      attendanceMonthly: [],
      attendanceByClass: [],
      feePaymentsMonthly: [],
      subjectAverages: [],
    });
    vi.doMock("./api", () => ({ getAnalyticsSeries }));
    const { loadAnalyticsSeries, chartHasStatusData } = await import("./load-series");
    const result = await loadAnalyticsSeries(INST, "term");
    expect(result.status).toBe("ready");
    expect(result.series?.studentStatus[0]?.count).toBe(3);
    expect(getAnalyticsSeries).toHaveBeenCalledWith(INST, "term");
    expect(chartHasStatusData(result.series)).toBe(true);
  });

  it("surfaces API errors without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { ApiClientError } = await import("@/lib/api");
    const getAnalyticsSeries = vi
      .fn()
      .mockRejectedValue(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "boom",
        }),
      );
    vi.doMock("./api", () => ({ getAnalyticsSeries }));
    const { loadAnalyticsSeries } = await import("./load-series");
    const result = await loadAnalyticsSeries(INST, "year");
    expect(result.status).toBe("error");
    expect(result.series).toBeNull();
  });

  it("treats empty month buckets as no chart signal (no fabricated points)", async () => {
    const { chartHasEnrollmentData, chartHasAttendanceData, chartHasFeeData } =
      await import("./load-series");
    const empty = {
      instituteId: INST,
      range: "term" as const,
      fromMonth: "2026-05",
      toMonth: "2026-08",
      studentStatus: [],
      enrollmentMonthly: [
        { month: "2026-05", label: "May 26", newEnrollments: 0, totalStudents: 0 },
      ],
      attendanceMonthly: [
        { month: "2026-05", label: "May 26", presentPct: null, markCount: 0 },
      ],
      attendanceByClass: [],
      feePaymentsMonthly: [
        { month: "2026-05", label: "May 26", collected: 0, paymentCount: 0 },
      ],
      subjectAverages: [],
    };
    expect(chartHasEnrollmentData(empty)).toBe(false);
    expect(chartHasAttendanceData(empty)).toBe(false);
    expect(chartHasFeeData(empty)).toBe(false);
  });
});
