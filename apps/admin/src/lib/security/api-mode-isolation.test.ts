import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveWritesEnabled } from "./writes-enabled";

describe("api-mode isolation invariants", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("evaluateAllAlertRules returns 0 in API mode (no demo directory side effects)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { evaluateAllAlertRules } = await import("@/lib/alert-rules-store");
    expect(evaluateAllAlertRules()).toBe(0);
  });

  it("createStudent refuses demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createStudent } = await import("@/lib/students/mutations");
    await expect(
      createStudent({
        instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        firstName: "A",
        surname: "B",
        gender: "female",
        address: "Addr",
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
