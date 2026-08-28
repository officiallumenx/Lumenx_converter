import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadHomeworkList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listHomework = vi.fn();
    vi.doMock("./api", () => ({ listHomework }));
    const { loadHomeworkList } = await import("./load");
    const result = await loadHomeworkList(INST);
    expect(result.status).toBe("demo");
    expect(listHomework).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listHomework = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listHomework }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({ classes: [], sections: [] }),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([]),
    }));
    const { loadHomeworkList } = await import("./load");
    const result = await loadHomeworkList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});
