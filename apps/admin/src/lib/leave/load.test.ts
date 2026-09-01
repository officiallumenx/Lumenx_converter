import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { LeaveRequestDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: "lv-1",
    instituteId: INST,
    subjectKind: "teacher",
    studentId: null,
    teacherId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    leaveType: "casual",
    intendedApproverRole: "institute_admin",
    startDate: "2026-06-01",
    endDate: "2026-06-02",
    reason: "Personal",
    status: "pending",
    academicYearId: null,
    classId: null,
    sectionId: null,
    createdAt: "2026-05-30T10:00:00Z",
    updatedAt: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

describe("loadLeaveRequestsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listLeaveRequests = vi.fn();
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listLeaveRequests).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn();
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    await expect(loadLeaveRequestsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadLeaveRequestsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listLeaveRequests).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockResolvedValue([dto()]);
    const getLeaveDecision = vi.fn().mockRejectedValue(new Error("no decision"));
    vi.doMock("./api", () => ({ listLeaveRequests, getLeaveDecision }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/students/map", () => ({
      studentDtosToListItems: vi.fn().mockReturnValue([]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/teachers/map", () => ({
      teacherDtosToListItems: vi.fn().mockReturnValue([]),
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi.fn().mockResolvedValue({ classes: [], sections: [] }),
    }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("lv-1");
    expect(listLeaveRequests).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    await expect(loadLeaveRequestsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listLeaveRequests = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listLeaveRequests }));
    const { loadLeaveRequestsList } = await import("./load");
    const result = await loadLeaveRequestsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
