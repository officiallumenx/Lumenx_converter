import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAttendanceConfigList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAttendanceConfig = vi.fn();
    vi.doMock("./api", () => ({ listAttendanceConfig }));
    const { loadAttendanceConfigList } = await import("./config-load");
    const result = await loadAttendanceConfigList(INST);
    expect(result.status).toBe("demo");
    expect(listAttendanceConfig).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadAttendanceConfigList } = await import("./config-load");
    const result = await loadAttendanceConfigList("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});

describe("resolveAttendanceConfigView", () => {
  it("blocks stale institute paint during switch", async () => {
    const { resolveAttendanceConfigView } = await import("./config-view");
    const view = resolveAttendanceConfigView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedItems: [],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.rowsValid).toBe(false);
  });
});
