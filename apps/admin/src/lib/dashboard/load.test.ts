import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadDashboardSummary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling analytics API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSummary = vi.fn();
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSummary }));
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary(INST);
    expect(result.status).toBe("demo");
    expect(getAnalyticsSummary).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });

  it("maps analytics summary in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getAnalyticsSummary = vi.fn().mockResolvedValue({
      instituteId: INST,
      students: 12,
      teachers: 3,
      parents: 8,
      openComplaints: 1,
      pendingLeave: 2,
      homeworkItems: 4,
    });
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSummary }));
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary(INST);
    expect(result.status).toBe("ready");
    expect(result.summary?.students).toBe(12);
    expect(getAnalyticsSummary).toHaveBeenCalledWith(INST);
  });

  it("surfaces API errors without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { ApiClientError } = await import("@/lib/api");
    const getAnalyticsSummary = vi
      .fn()
      .mockRejectedValue(
        new ApiClientError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "boom",
        }),
      );
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSummary }));
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary(INST);
    expect(result.status).toBe("error");
    expect(result.summary).toBeNull();
  });
});

describe("resolveDashboardSummaryView", () => {
  it("clears rows during institute switch", async () => {
    const { resolveDashboardSummaryView } = await import("./list-view");
    const view = resolveDashboardSummaryView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedSummary: {
        students: 5,
        teachers: 1,
        parents: 2,
        openComplaints: 0,
        pendingLeave: 0,
        homeworkItems: 0,
      },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.rowsValid).toBe(false);
  });
});
