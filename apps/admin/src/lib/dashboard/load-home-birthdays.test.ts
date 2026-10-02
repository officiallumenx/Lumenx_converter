import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadHomeBirthdaysToday", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns needs_institute for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadHomeBirthdaysToday } = await import("./load-home-birthdays");
    const result = await loadHomeBirthdaysToday("admin-tenant");
    expect(result.status).toBe("needs_institute");
    expect(result.rows).toEqual([]);
    expect(result.errorMessage).toBeNull();
  });

  it("returns error when both students and teachers lists fail", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockRejectedValue(new Error("students down")),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockRejectedValue(new Error("teachers down")),
    }));

    const { loadHomeBirthdaysToday } = await import("./load-home-birthdays");
    const result = await loadHomeBirthdaysToday(INST, new Date(2026, 9, 2));
    expect(result.status).toBe("error");
    expect(result.rows).toEqual([]);
    expect(result.errorMessage).toMatch(/students down|Failed to load birthdays/);
    expect(result.warningMessage).toBeNull();
  });

  it("still shows student birthdays when teachers fail, with a warning", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          displayName: "Ada",
          dateOfBirth: "2012-10-02",
          classLabel: "5",
          sectionLabel: "A",
        },
      ]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockRejectedValue(new Error("teachers down")),
    }));

    const { loadHomeBirthdaysToday } = await import("./load-home-birthdays");
    const result = await loadHomeBirthdaysToday(INST, new Date(2026, 9, 2));
    expect(result.status).toBe("ready");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.name).toBe("Ada");
    expect(result.errorMessage).toBeNull();
    expect(result.warningMessage).toMatch(/teachers down|teacher birthdays/i);
  });

  it("returns empty (not silent success hide) when directories load with no matches", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          displayName: "Sarah",
          dateOfBirth: "1985-08-18",
        },
      ]),
    }));

    const { loadHomeBirthdaysToday } = await import("./load-home-birthdays");
    const result = await loadHomeBirthdaysToday(INST, new Date(2026, 9, 2));
    expect(result.status).toBe("empty");
    expect(result.rows).toEqual([]);
    expect(result.errorMessage).toBeNull();
    expect(result.warningMessage).toBeNull();
  });
});
