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
});
