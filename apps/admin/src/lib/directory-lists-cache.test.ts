import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("listSubmittedMarkEntriesCached", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("coalesces concurrent submitted-marks walks for the same institute", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listMarkEntries = vi.fn().mockResolvedValue([{ id: "m1" }]);
    vi.doMock("@/lib/marks/api", () => ({ listMarkEntries }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));

    const { invalidateAdminInstituteCache } = await import(
      "./admin-resource-cache"
    );
    invalidateAdminInstituteCache(INST);
    const { listSubmittedMarkEntriesCached } = await import(
      "./directory-lists-cache"
    );

    const [a, b] = await Promise.all([
      listSubmittedMarkEntriesCached(INST),
      listSubmittedMarkEntriesCached(INST),
    ]);

    expect(a).toEqual([{ id: "m1" }]);
    expect(b).toEqual([{ id: "m1" }]);
    expect(listMarkEntries).toHaveBeenCalledTimes(1);
  });
});
