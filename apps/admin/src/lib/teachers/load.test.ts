import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { TeacherDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<TeacherDto> = {}): TeacherDto {
  return {
    id: "bb111111-1111-4111-8111-111111111111",
    instituteId: INST,
    userProfileId: null,
    legacyCode: null,
    employeeId: "EMP-1041",
    displayName: "Sarah Jenkins",
    phone: null,
    email: null,
    department: "Mathematics",
    qualification: null,
    dateOfBirth: null,
    joinedOn: null,
    teachingScope: "subject_teacher",
    portalAccessLevel: "faculty_grading",
    status: "active",
    subjects: null,
    assignedSectionLabels: null,
    sourceCareerApplicationId: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadTeachersList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listTeachers = vi.fn();
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listTeachers).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn();
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    await expect(loadTeachersList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadTeachersList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listTeachers).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Sarah Jenkins");
    expect(listTeachers).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    await expect(loadTeachersList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTeachers = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listTeachers }));
    const { loadTeachersList } = await import("./load");
    const result = await loadTeachersList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});

describe("loadTeacherDetail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("maps teacher detail on success", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getTeacher = vi.fn().mockResolvedValue(dto());
    vi.doMock("./api", () => ({ getTeacher }));
    const { loadTeacherDetail } = await import("./load");
    const result = await loadTeacherDetail(dto().id, INST);
    expect(result.status).toBe("ready");
    expect(result.teacher?.instituteId).toBe(INST);
    expect(result.teacher?.name).toBe("Sarah Jenkins");
  });

  it("rejects detail when institute does not match", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const getTeacher = vi.fn().mockResolvedValue(dto({ instituteId: OTHER }));
    vi.doMock("./api", () => ({ getTeacher }));
    const { loadTeacherDetail } = await import("./load");
    const result = await loadTeacherDetail(dto().id, INST);
    expect(result.status).toBe("empty");
    expect(result.teacher).toBeNull();
  });

  it("returns forbidden without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getTeacher = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ getTeacher }));
    const { loadTeacherDetail } = await import("./load");
    const result = await loadTeacherDetail(dto().id, INST);
    expect(result.status).toBe("forbidden");
    expect(result.teacher).toBeNull();
  });
});
