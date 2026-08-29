import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadDashboardSummary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling APIs in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listStudents = vi.fn();
    vi.doMock("@/lib/students/api", () => ({ listStudents }));
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary(INST);
    expect(result.status).toBe("demo");
    expect(listStudents).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadDashboardSummary } = await import("./load");
    const result = await loadDashboardSummary("admin-tenant");
    expect(result.status).toBe("needs_institute");
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
      storedSummary: { students: 5, teachers: 1, parents: 2, openComplaints: 0, pendingLeave: 0, homeworkItems: 0 },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.rowsValid).toBe(false);
  });
});
