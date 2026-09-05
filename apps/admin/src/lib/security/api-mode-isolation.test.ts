import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWritesEnabled } from "./writes-enabled";

/**
 * Isolation invariants for Dashboard / Alerts / Analytics / Reports API mode.
 * Failures must not fall back to demo KPIs or localStorage exports.
 */
describe("dashboard+alerts+analytics+reports api-mode isolation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("evaluateAllAlertRules returns 0 in API mode (no demo directory side effects)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { evaluateAllAlertRules } = await import("@/lib/alert-rules-store");
    expect(evaluateAllAlertRules()).toBe(0);
  });

  it("loadDashboardSummary does not call analytics in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSummary = vi.fn();
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSummary }));
    const { loadDashboardSummary } = await import("@/lib/dashboard/load");
    const result = await loadDashboardSummary(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(result.status).toBe("demo");
    expect(result.summary).toBeNull();
    expect(getAnalyticsSummary).not.toHaveBeenCalled();
  });

  it("loadAnalyticsSummary does not call network in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSummary = vi.fn();
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSummary }));
    const { loadAnalyticsSummary } = await import("@/lib/analytics/load");
    const result = await loadAnalyticsSummary(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(result.status).toBe("demo");
    expect(result.summary).toBeNull();
    expect(getAnalyticsSummary).not.toHaveBeenCalled();
  });

  it("loadAnalyticsSeries does not call network in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getAnalyticsSeries = vi.fn();
    vi.doMock("@/lib/analytics/api", () => ({ getAnalyticsSeries }));
    const { loadAnalyticsSeries } = await import("@/lib/analytics/load-series");
    const result = await loadAnalyticsSeries(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "term",
    );
    expect(result.status).toBe("demo");
    expect(result.series).toBeNull();
    expect(getAnalyticsSeries).not.toHaveBeenCalled();
  });

  it("loadAlertRules does not evaluate on load", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAlertRules = vi.fn().mockResolvedValue([]);
    const listAlertFires = vi.fn().mockResolvedValue([]);
    const evaluateAlertRules = vi.fn();
    vi.doMock("@/lib/alert-rules-api/api", () => ({
      listAlertRules,
      listAlertFires,
      evaluateAlertRules,
    }));
    const { loadAlertRules } = await import("@/lib/alert-rules-api/load");
    const result = await loadAlertRules(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(result.status).toBe("empty");
    expect(result.fired).toEqual([]);
    expect(evaluateAlertRules).not.toHaveBeenCalled();
  });

  it("loadReportsCatalog does not call network in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listReportCatalog = vi.fn();
    const listReportJobs = vi.fn();
    vi.doMock("@/lib/reports/api", () => ({
      listReportCatalog,
      listReportJobs,
    }));
    const { loadReportsCatalog } = await import("@/lib/reports/load");
    const result = await loadReportsCatalog(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
    expect(result.status).toBe("demo");
    expect(result.catalog).toEqual([]);
    expect(listReportCatalog).not.toHaveBeenCalled();
    expect(listReportJobs).not.toHaveBeenCalled();
  });

  it("getAnalyticsSummary refuses demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.doUnmock("@/lib/analytics/api");
    const mod = await import("@/lib/analytics/api");
    await expect(
      mod.getAnalyticsSummary("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).rejects.toThrow(/API auth mode/);
  });

  it("createReportJob refuses demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.doUnmock("@/lib/reports/api");
    const { createReportJob } = await import("@/lib/reports/api");
    await expect(
      createReportJob({
        instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        reportId: "students-roster",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("resolveWritesEnabled blocks API writes without a ready institute", () => {
    expect(
      resolveWritesEnabled(true, {
        status: "needs_selection",
        activeInstituteId: null,
      }),
    ).toBe(false);
    expect(
      resolveWritesEnabled(true, {
        status: "ready",
        activeInstituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      }),
    ).toBe(true);
    expect(
      resolveWritesEnabled(false, {
        status: "demo",
        activeInstituteId: null,
      }),
    ).toBe(true);
  });
});
