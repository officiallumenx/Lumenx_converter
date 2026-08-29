import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAlertRules", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAlertRules = vi.fn();
    vi.doMock("./api", () => ({
      listAlertRules,
      evaluateAlertRules: vi.fn(),
    }));
    const { loadAlertRules } = await import("./load");
    const result = await loadAlertRules(INST);
    expect(result.status).toBe("demo");
    expect(listAlertRules).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadAlertRules } = await import("./load");
    const result = await loadAlertRules("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});
