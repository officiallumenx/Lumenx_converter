import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadTeacherPerformanceList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listTeacherPerformance = vi.fn();
    vi.doMock("./api", () => ({ listTeacherPerformance }));
    const { loadTeacherPerformanceList } = await import("./load");
    const result = await loadTeacherPerformanceList(INST);
    expect(result.status).toBe("demo");
    expect(listTeacherPerformance).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadTeacherPerformanceList } = await import("./load");
    const result = await loadTeacherPerformanceList("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});
