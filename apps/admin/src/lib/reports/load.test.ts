import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadReportsCatalog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listReportCatalog = vi.fn();
    vi.doMock("./api", () => ({ listReportCatalog, listReportJobs: vi.fn() }));
    const { loadReportsCatalog } = await import("./load");
    const result = await loadReportsCatalog(INST);
    expect(result.status).toBe("demo");
    expect(listReportCatalog).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadReportsCatalog } = await import("./load");
    const result = await loadReportsCatalog("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });

  it("keeps catalog ready when jobs list fails", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      listReportCatalog: vi.fn().mockResolvedValue([
        { id: "students", name: "Students", module: "Students", generationSupported: true },
      ]),
      listReportJobs: vi.fn().mockRejectedValue(new Error("Database operation failed")),
    }));
    const { loadReportsCatalog } = await import("./load");
    const result = await loadReportsCatalog(INST);
    expect(result.status).toBe("ready");
    expect(result.catalog).toHaveLength(1);
    expect(result.jobs).toEqual([]);
    expect(result.jobsErrorMessage).toBe("Database operation failed");
  });
});
