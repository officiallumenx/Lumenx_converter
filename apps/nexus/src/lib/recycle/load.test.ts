import { beforeEach, describe, expect, it, vi } from "vitest";

describe("loadPlatformRecycleList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "demo");
    const listPlatformRecycleItems = vi.fn();
    vi.doMock("./api", () => ({ listPlatformRecycleItems }));
    const { loadPlatformRecycleList } = await import("./load");
    const result = await loadPlatformRecycleList();
    expect(result.status).toBe("demo");
    expect(listPlatformRecycleItems).not.toHaveBeenCalled();
  });

  it("returns ready with mapped items in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      listPlatformRecycleItems: vi.fn().mockResolvedValue([
        {
          id: "a0111111-1111-4111-8111-111111111111",
          instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          entityKind: "student",
          entityId: "s0111111-1111-4111-8111-111111111111",
          module: "Students",
          title: "Ada",
          subtitle: null,
          status: "in_bin",
          deletedByUserId: "11111111-1111-4111-8111-111111111111",
          deletedAt: "2026-08-20T00:00:00.000Z",
          createdAt: "2026-08-20T00:00:00.000Z",
          updatedAt: "2026-08-20T00:00:00.000Z",
        },
      ]),
    }));
    const { loadPlatformRecycleList } = await import("./load");
    const result = await loadPlatformRecycleList();
    expect(result.status).toBe("ready");
    expect(result.items[0]?.title).toBe("Ada");
  });
});
