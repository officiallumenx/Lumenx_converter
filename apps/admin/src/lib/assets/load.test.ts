import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSET = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

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
    expect(result.assets).toEqual([]);
    expect(listAssets).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadStorageUsage } = await import("./load");
    const result = await loadStorageUsage("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });

  it("returns assets and summary in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAssets = vi.fn().mockResolvedValue([
      {
        id: ASSET,
        instituteId: INST,
        bucket: "student-media",
        objectPath: "a.jpg",
        category: "student_photo",
        fileName: "a.jpg",
        contentType: "image/jpeg",
        byteSize: 2048,
        checksum: null,
        visibility: "institute",
        status: "active",
        linkedEntityKind: null,
        linkedEntityId: null,
        ownerUserId: null,
        createdByUserId: ASSET,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    vi.doMock("./api", () => ({ listAssets }));
    vi.doMock("@/lib/storage/api", () => ({
      getStorageUsage: vi.fn().mockResolvedValue({
        instituteId: INST,
        totalAssets: 1,
        totalBytes: 2048,
        byCategory: [
          { key: "student_photo", label: "student photo", count: 1, bytes: 2048 },
        ],
        byBucket: [
          { key: "student-media", label: "student media", count: 1, bytes: 2048 },
        ],
      }),
    }));
    const { loadStorageUsage } = await import("./load");
    const result = await loadStorageUsage(INST);
    expect(result.status).toBe("ready");
    expect(result.assets).toHaveLength(1);
    expect(result.summary?.totalAssets).toBe(1);
    expect(result.summary?.totalBytes).toBe(2048);
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
      storedAssets: [],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.rowsValid).toBe(false);
    expect(view.assets).toEqual([]);
  });
});
