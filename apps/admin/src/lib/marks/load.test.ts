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
    subjectId: "subj-math",
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
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("demo");
    expect(listMarkEntries).not.toHaveBeenCalled();
  });

  it("maps successful API list without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listMarkEntries = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listMarkEntries }));
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
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
    const { loadMarksList } = await import("./load");
    const result = await loadMarksList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});
