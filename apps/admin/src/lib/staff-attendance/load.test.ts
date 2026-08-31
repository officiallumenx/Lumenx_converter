import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadStaffAttendanceDay", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listStaffAttendance = vi.fn();
    vi.doMock("./api", () => ({ listStaffAttendance }));
    const { loadStaffAttendanceDay } = await import("./load");
    const result = await loadStaffAttendanceDay(INST, "2026-06-01");
    expect(result.status).toBe("demo");
    expect(listStaffAttendance).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStaffAttendance = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listStaffAttendance }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    const { loadStaffAttendanceDay } = await import("./load");
    const result = await loadStaffAttendanceDay(INST, "2026-06-01");
    expect(result.status).toBe("forbidden");
    expect(result.summary).toBeNull();
  });

  it("loads submitted range in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStaffAttendance = vi.fn().mockResolvedValue([
      {
        id: "m1",
        instituteId: INST,
        teacherId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        attendanceDate: "2026-06-01",
        status: "present",
        checkIn: null,
        checkOut: null,
        note: null,
        dayStatus: "submitted",
        markedByUserId: "u1",
        submittedAt: "2026-06-01T10:00:00Z",
        submittedByUserId: "u1",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ]);
    vi.doMock("./api", () => ({ listStaffAttendance }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          instituteId: INST,
          displayName: "Jane",
          department: "Math",
          teachingScope: "subject_teacher",
          portalAccessLevel: "faculty_grading",
          status: "active",
          email: null,
          phone: null,
          userProfileId: null,
          legacyCode: null,
          employeeId: null,
          qualification: null,
          dateOfBirth: null,
          joinedOn: null,
          subjects: null,
          assignedSectionLabels: null,
          sourceCareerApplicationId: null,
          createdAt: "",
          updatedAt: "",
        },
      ]),
    }));
    const { loadStaffAttendanceSubmittedRange } = await import("./load");
    const result = await loadStaffAttendanceSubmittedRange(INST);
    expect(result.status).toBe("ready");
    expect(result.overview).toHaveLength(1);
    expect(result.history).toHaveLength(1);
  });
});
