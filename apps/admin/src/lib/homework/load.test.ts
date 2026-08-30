import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HW = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SECTION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SUBJECT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const TEACHER = "11111111-1111-4111-8111-111111111111";

const dto = {
  id: HW,
  instituteId: INST,
  academicYearId: YEAR,
  classId: CLASS,
  sectionId: SECTION,
  subjectId: SUBJECT,
  teacherId: TEACHER,
  kind: "homework" as const,
  title: "Essay",
  description: "Write",
  instructions: null,
  dueDate: "2026-09-01",
  status: "published" as const,
  publishedAt: "2026-08-01T00:00:00Z",
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
};

describe("loadHomeworkList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listHomework = vi.fn();
    vi.doMock("./api", () => ({ listHomework, getHomework: vi.fn() }));
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
    vi.doMock("./api", () => ({ listHomework, getHomework: vi.fn() }));
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

  it("loads real homework roster in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listHomework = vi.fn().mockResolvedValue([dto]);
    vi.doMock("./api", () => ({ listHomework, getHomework: vi.fn() }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({
        classes: [
          {
            id: CLASS,
            name: "Grade 10",
            code: "G10",
            academicYearId: YEAR,
            instituteId: INST,
          },
        ],
        sections: [
          {
            id: SECTION,
            classId: CLASS,
            name: "A",
            code: "A",
            academicYearId: YEAR,
            instituteId: INST,
          },
        ],
      }),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([
        {
          id: TEACHER,
          instituteId: INST,
          firstName: "Ada",
          surname: "Lovelace",
          displayName: "Ada Lovelace",
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
      ]),
    }));
    vi.doMock("@/lib/teachers/map", () => ({
      teacherDtosToListItems: (rows: Array<{ id: string; displayName: string }>) =>
        rows.map((r) => ({ id: r.id, name: r.displayName })),
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([
        {
          id: SUBJECT,
          instituteId: INST,
          name: "Math",
          code: "M",
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
      ]),
    }));
    vi.doMock("@/lib/subjects/map", () => ({
      subjectDtosToListItems: (rows: Array<{ id: string; name: string }>) =>
        rows.map((r) => ({ id: r.id, name: r.name })),
    }));
    const { loadHomeworkList } = await import("./load");
    const result = await loadHomeworkList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Essay");
    expect(result.items[0]?.description).toBe("Write");
    expect(listHomework).toHaveBeenCalledWith({ instituteId: INST });
  });
});

describe("loadHomeworkDetail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses invalid homework id without calling get", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getHomework = vi.fn();
    vi.doMock("./api", () => ({ listHomework: vi.fn(), getHomework }));
    const { loadHomeworkDetail } = await import("./load");
    const result = await loadHomeworkDetail(INST, "not-a-uuid");
    expect(result.status).toBe("error");
    expect(getHomework).not.toHaveBeenCalled();
  });

  it("rejects cross-institute detail without falling back to demo", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const otherInst = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const getHomework = vi.fn().mockResolvedValue({ ...dto, instituteId: otherInst });
    vi.doMock("./api", () => ({ listHomework: vi.fn(), getHomework }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({ classes: [], sections: [] }),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/teachers/map", () => ({
      teacherDtosToListItems: () => [],
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/subjects/map", () => ({
      subjectDtosToListItems: () => [],
    }));
    const { loadHomeworkDetail } = await import("./load");
    const result = await loadHomeworkDetail(INST, HW);
    expect(result.status).toBe("forbidden");
    expect(result.item).toBeNull();
  });
});
