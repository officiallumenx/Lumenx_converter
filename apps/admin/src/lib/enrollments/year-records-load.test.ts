import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("loadYearEnrollmentRecords", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo without calling API", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => false }));
    const listEnrollments = vi.fn();
    vi.doMock("./api", () => ({ listEnrollments }));
    const { loadYearEnrollmentRecords } = await import("./year-records-load");
    const result = await loadYearEnrollmentRecords(INST, YEAR);
    expect(result.status).toBe("demo");
    expect(listEnrollments).not.toHaveBeenCalled();
  });

  it("maps enrollments in api mode", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    vi.doMock("./api", () => ({
      listEnrollments: vi.fn().mockResolvedValue([
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          instituteId: INST,
          academicYearId: YEAR,
          studentId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          studentName: "Aarav",
          classId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          sectionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          rollNo: "04",
          status: "active",
          enrolledOn: "2026-04-01",
          withdrawnOn: null,
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ]),
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({
        classes: [
          {
            id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            name: "4th",
            code: "4",
            sortOrder: 4,
          },
        ],
        sections: [
          {
            id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
            classId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
            name: "A",
            code: "A",
            sortOrder: 1,
          },
        ],
      }),
    }));
    const { loadYearEnrollmentRecords } = await import("./year-records-load");
    const result = await loadYearEnrollmentRecords(INST, YEAR);
    expect(result.status).toBe("ready");
    expect(result.items[0]?.name).toBe("Aarav");
    expect(result.items[0]?.status).toBe("Active");
  });
});
