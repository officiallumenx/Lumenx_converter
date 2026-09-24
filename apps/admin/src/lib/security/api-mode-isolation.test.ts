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
