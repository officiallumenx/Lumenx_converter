import { beforeEach, describe, expect, it, vi } from "vitest";
import { invalidateAdminCache } from "@/lib/admin-resource-cache";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("directory-lists-cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    invalidateAdminCache("admin:teachers-dir");
    invalidateAdminCache("admin:students-dir");
  });

  it("coalesces concurrent teacher list fetches into one network call", async () => {
    const listTeachers = vi.fn().mockResolvedValue([{ id: "t1" }]);
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));

    const { listTeachersCached } = await import("./directory-lists-cache");
    const [a, b] = await Promise.all([
      listTeachersCached(INST),
      listTeachersCached(INST),
    ]);
    expect(a).toEqual([{ id: "t1" }]);
    expect(b).toEqual([{ id: "t1" }]);
    expect(listTeachers).toHaveBeenCalledTimes(1);
  });

  it("retries rate-limited teacher fetches before succeeding", async () => {
    vi.useFakeTimers();
    try {
      const listTeachers = vi
        .fn()
        .mockRejectedValueOnce({
          status: 429,
          code: "RATE_LIMITED",
          message: "Too many requests",
        })
        .mockResolvedValueOnce([{ id: "t1" }]);
      vi.doMock("@/lib/teachers/api", () => ({ listTeachers }));
      vi.doMock("@/lib/students/api", () => ({
        listStudents: vi.fn().mockResolvedValue([]),
      }));

      const { listTeachersCached } = await import("./directory-lists-cache");
      const pending = listTeachersCached(INST);
      await vi.runAllTimersAsync();
      await expect(pending).resolves.toEqual([{ id: "t1" }]);
      expect(listTeachers).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
