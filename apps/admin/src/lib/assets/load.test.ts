import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadStorageUsage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAssets = vi.fn();
    vi.doMock("./api", () => ({ listAssets }));
    const { loadStorageUsage } = await import("./load");
    const result = await loadStorageUsage(INST);
    expect(result.status).toBe("demo");
    expect(listAssets).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadStorageUsage } = await import("./load");
    const result = await loadStorageUsage("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});

describe("resolveStorageUsageView", () => {
  it("blocks stale institute paint during switch", async () => {
    const { resolveStorageUsageView } = await import("./list-view");
    const view = resolveStorageUsageView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedSummary: { totalAssets: 3, totalBytes: 100, byCategory: [] },
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.rowsValid).toBe(false);
  });
});
