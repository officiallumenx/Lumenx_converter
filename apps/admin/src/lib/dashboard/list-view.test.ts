import { describe, expect, it } from "vitest";
import {
  resolveDashboardSummaryView,
  shouldCommitDashboardLoad,
} from "./list-view";
import type { DashboardSummary } from "./load";

const summary: DashboardSummary = {
  students: 12,
  teachers: 3,
  parents: 8,
  openComplaints: 1,
  pendingLeave: 2,
  homeworkItems: 4,
};

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("resolveDashboardSummaryView", () => {
  it("keeps demo mode free of fabricated KPI totals", () => {
    const view = resolveDashboardSummaryView({
      apiMode: false,
      instituteStatus: "demo",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedSummary: summary,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("demo");
    expect(view.summary).toBeNull();
    expect(view.rowsValid).toBe(false);
  });

  it("surfaces institute forbidden without masking as loading", () => {
    const view = resolveDashboardSummaryView({
      apiMode: true,
      instituteStatus: "forbidden",
      activeInstituteId: INST,
      resolvedForInstituteId: null,
      storedSummary: null,
      storedStatus: "forbidden",
      storedErrorMessage: "denied",
      instituteErrorMessage: "Access denied",
    });
    expect(view.status).toBe("forbidden");
    expect(view.summary).toBeNull();
    expect(view.errorMessage).toBe("Access denied");
  });

  it("returns ready summary only when institute and resolved ids match", () => {
    const view = resolveDashboardSummaryView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: INST,
      storedSummary: summary,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("ready");
    expect(view.summary?.students).toBe(12);
    expect(view.rowsValid).toBe(true);
  });

  it("treats institute switch as loading until data matches", () => {
    const view = resolveDashboardSummaryView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedSummary: summary,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.summary).toBeNull();
  });
});

describe("shouldCommitDashboardLoad", () => {
  it("rejects cancelled or mismatched institute responses", () => {
    expect(
      shouldCommitDashboardLoad({
        cancelled: true,
        requestInstituteId: INST,
        activeInstituteId: INST,
      }),
    ).toBe(false);
    expect(
      shouldCommitDashboardLoad({
        cancelled: false,
        requestInstituteId: INST,
        activeInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).toBe(false);
    expect(
      shouldCommitDashboardLoad({
        cancelled: false,
        requestInstituteId: INST,
        activeInstituteId: INST,
      }),
    ).toBe(true);
  });
});
