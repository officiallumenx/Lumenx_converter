import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAnalyticsSummary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSummary = vi.fn();
    vi.doMock("./api", () => ({ getAnalyticsSummary }));
    const { loadAnalyticsSummary } = await import("./load");
    const result = await loadAnalyticsSummary(INST);
    expect(result.status).toBe("demo");
    expect(getAnalyticsSummary).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadAnalyticsSummary } = await import("./load");
    const result = await loadAnalyticsSummary("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});

describe("resolveAnalyticsSummaryView", () => {
  it("blocks stale institute paint during switch", async () => {
    const { resolveAnalyticsSummaryView } = await import("./list-view");
    const view = resolveAnalyticsSummaryView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedSummary: {
        instituteId: INST,
        students: 1,
        teachers: 1,
        parents: 0,
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
