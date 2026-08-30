import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { MarkEntryDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<MarkEntryDto> = {}): MarkEntryDto {
  return {
    id: "mm111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    classId: "cc111111-1111-4111-8111-111111111111",
    sectionId: "ss111111-1111-4111-8111-111111111111",
    examId: "ee111111-1111-4111-8111-111111111111",
    subjectId: "subj1111-1111-4111-8111-111111111111",
    teacherId: "tt111111-1111-4111-8111-111111111111",
    maxMarks: 100,
    status: "submitted",
    submittedAt: null,
    publishedAt: null,
    adminNote: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadMarksList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listMarkEntries = vi.fn();
    vi.doMock("./api", () => ({ listMarkEntries }));
    vi.doMock("@/lib/exams/api", () => ({ listExams: vi.fn() }));
    vi.doMock("@/lib/subjects/api", () => ({ listSubjects: vi.fn() }));
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers: vi.fn() }));
    vi.doMock("@/lib/teachers/map", () => ({ teacherDtosToListItems: () => [] }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("demo");
    expect(listMarkEntries).not.toHaveBeenCalled();
  });

  it("maps successful API list with lookup labels and no demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listMarkEntries = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listMarkEntries }));
    vi.doMock("@/lib/exams/api", () => ({
      listExams: vi.fn().mockResolvedValue([
        { id: "ee111111-1111-4111-8111-111111111111", name: "Midterm" },
      ]),
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([
        {
          id: "subj1111-1111-4111-8111-111111111111",
          name: "Mathematics",
          code: "MATH",
        },
      ]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([{ id: "tt111111-1111-4111-8111-111111111111" }]),
    }));
    vi.doMock("@/lib/teachers/map", () => ({
      teacherDtosToListItems: () => [
        { id: "tt111111-1111-4111-8111-111111111111", name: "Ada Teacher" },
      ],
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({
        classes: [
          {
            id: "cc111111-1111-4111-8111-111111111111",
            name: "Grade 10",
            code: "G10",
          },
        ],
        sections: [
          {
            id: "ss111111-1111-4111-8111-111111111111",
            name: "A",
            code: "A",
            classId: "cc111111-1111-4111-8111-111111111111",
          },
        ],
      }),
    }));
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.examName).toBe("Midterm");
    expect(result.items[0]?.subject).toBe("Mathematics");
    expect(result.items[0]?.teacherName).toBe("Ada Teacher");
    expect(listMarkEntries).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listMarkEntries = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listMarkEntries }));
    vi.doMock("@/lib/exams/api", () => ({ listExams: vi.fn() }));
    vi.doMock("@/lib/subjects/api", () => ({ listSubjects: vi.fn() }));
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers: vi.fn() }));
    vi.doMock("@/lib/teachers/map", () => ({ teacherDtosToListItems: () => [] }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on API failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listMarkEntries = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Server error",
      }),
    );
    vi.doMock("./api", () => ({ listMarkEntries }));
    vi.doMock("@/lib/exams/api", () => ({ listExams: vi.fn() }));
    vi.doMock("@/lib/subjects/api", () => ({ listSubjects: vi.fn() }));
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers: vi.fn() }));
    vi.doMock("@/lib/teachers/map", () => ({ teacherDtosToListItems: () => [] }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
