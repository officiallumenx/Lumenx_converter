import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { ExamDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ExamDto> = {}): ExamDto {
  return {
    id: "ee111111-1111-4111-8111-111111111111",
    instituteId: INST,
    academicYearId: "yyyyyyyy-yyyy-4yyy-8yyy-yyyyyyyyyyyy",
    name: "Mid-Term Examination",
    header: "Mid-Term 2026",
    startDate: "2026-09-01",
    endDate: "2026-09-15",
    defaultStartsAt: "09:00:00",
    defaultEndsAt: "12:00:00",
    totalMarks: 100,
    internalMarks: null,
    externalMarks: null,
    audienceScope: "year",
    scheduleStatus: "draft",
    lifecycleStatus: "open",
    schedulePublishedAt: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    targetSections: [],
    subjectSchedules: [],
    ...overrides,
  };
}

describe("loadExamsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listExams = vi.fn();
    vi.doMock("./api", () => ({ listExams }));
    const { loadExamsList } = await import("./load");
    const result = await loadExamsList(INST);
    expect(result.status).toBe("demo");
    expect(listExams).not.toHaveBeenCalled();
  });

  it("maps successful API list without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listExams = vi.fn().mockResolvedValue([dto()]);
    const listSubjects = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listExams }));
    vi.doMock("@/lib/subjects", () => ({ listSubjects }));
    const { loadExamsList } = await import("./load");
    const result = await loadExamsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items[0]?.name).toBe("Mid-Term Examination");
    expect(listExams).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listExams = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listExams }));
    const { loadExamsList } = await import("./load");
    const result = await loadExamsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});
