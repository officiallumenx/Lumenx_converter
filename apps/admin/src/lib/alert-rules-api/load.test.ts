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
    const evaluateAlertRules = vi.fn();
    vi.doMock("./api", () => ({
      listAlertRules,
      evaluateAlertRules,
    }));
    const { loadAlertRules } = await import("./load");
    const result = await loadAlertRules(INST);
    expect(result.status).toBe("demo");
    expect(listAlertRules).not.toHaveBeenCalled();
    expect(evaluateAlertRules).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadAlertRules } = await import("./load");
    const result = await loadAlertRules("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });

  it("lists rules without evaluating on load", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAlertRules = vi.fn().mockResolvedValue([
      { id: "r1", name: "Rule", active: true },
    ]);
    const evaluateAlertRules = vi.fn();
    vi.doMock("./api", () => ({
      listAlertRules,
      evaluateAlertRules,
    }));
    const { loadAlertRules } = await import("./load");
    const result = await loadAlertRules(INST);
    expect(result.status).toBe("ready");
    expect(result.fired).toEqual([]);
    expect(listAlertRules).toHaveBeenCalledWith(INST);
    expect(evaluateAlertRules).not.toHaveBeenCalled();
  });
});
