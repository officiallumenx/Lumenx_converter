import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadDashboardWidgets", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling list APIs in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listStudents = vi.fn();
    const listTeachers = vi.fn();
    const listDiaryDays = vi.fn();
    const listAttendanceRegisters = vi.fn();
    const listMarkEntries = vi.fn();
    vi.doMock("@/lib/students/api", () => ({ listStudents }));
    vi.doMock("@/lib/teachers/api", () => ({ listTeachers }));
    vi.doMock("@/lib/diary/api", () => ({ listDiaryDays }));
    vi.doMock("@/lib/attendance/api", () => ({ listAttendanceRegisters }));
    vi.doMock("@/lib/marks/api", () => ({ listMarkEntries }));
    const { loadDashboardWidgets } = await import("./load-widgets");
    const result = await loadDashboardWidgets(INST);
    expect(result.status).toBe("demo");
    expect(listStudents).not.toHaveBeenCalled();
    expect(listMarkEntries).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadDashboardWidgets } = await import("./load-widgets");
    const result = await loadDashboardWidgets("admin-tenant");
    expect(result.status).toBe("needs_institute");
    expect(result.birthdays.rows).toEqual([]);
  });

  it("composes birthdays, diary, attendance drafts, and marks from list APIs", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const onDate = new Date(2026, 7, 29);
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          displayName: "Ada",
          dateOfBirth: "2012-08-29",
          classLabel: "5",
          sectionLabel: "A",
        },
      ]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/diary/api", () => ({
      listDiaryDays: vi.fn().mockResolvedValue([
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          teacherId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          diaryDate: "2026-08-29",
          scope: "subject",
          submittedAt: "2026-08-29T10:00:00.000Z",
          rows: [{ id: "1" }],
        },
      ]),
    }));
    vi.doMock("@/lib/attendance/api", () => ({
      listAttendanceRegisters: vi.fn().mockResolvedValue([
        {
          id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
          sectionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          slotLabel: "Morning",
          attendanceDate: "2026-08-29",
          status: "draft",
        },
      ]),
    }));
    vi.doMock("@/lib/marks/api", () => ({
      listMarkEntries: vi.fn().mockResolvedValue([
        {
          id: "11111111-1111-4111-8111-111111111111",
          teacherId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
          examId: "22222222-2222-4222-8222-222222222222",
          subjectId: "33333333-3333-4333-8333-333333333333",
          sectionId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          submittedAt: "2026-08-28T12:00:00.000Z",
          status: "submitted",
        },
      ]),
    }));

    const { loadDashboardWidgets } = await import("./load-widgets");
    const result = await loadDashboardWidgets(INST, onDate);
    expect(result.status).toBe("ready");
    expect(result.birthdays.rows).toHaveLength(1);
    expect(result.birthdays.rows[0]?.name).toBe("Ada");
    expect(result.diary.todaySubmittedCount).toBe(1);
    expect(result.attendanceDrafts.rows).toHaveLength(1);
    expect(result.marksPending.rows).toHaveLength(1);
  });

  it("keeps successful slices when one list API fails (no demo fallback)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/diary/api", () => ({
      listDiaryDays: vi.fn().mockRejectedValue(new Error("diary down")),
    }));
    vi.doMock("@/lib/attendance/api", () => ({
      listAttendanceRegisters: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/marks/api", () => ({
      listMarkEntries: vi.fn().mockResolvedValue([]),
    }));

    const { loadDashboardWidgets } = await import("./load-widgets");
    const result = await loadDashboardWidgets(INST, new Date(2026, 7, 29));
    expect(result.status).toBe("ready");
    expect(result.diary.status).toBe("error");
    expect(result.diary.errorMessage).toBe("diary down");
    expect(result.birthdays.status).toBe("empty");
    expect(result.marksPending.rows).toEqual([]);
  });
});

describe("shouldCommitDashboardLoad (widgets)", () => {
  it("rejects stale institute responses", async () => {
    const { shouldCommitDashboardLoad } = await import("./list-view");
    expect(
      shouldCommitDashboardLoad({
        cancelled: false,
        requestInstituteId: INST,
        activeInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      }),
    ).toBe(false);
    expect(
      shouldCommitDashboardLoad({
        cancelled: false,
        requestInstituteId: INST,
        activeInstituteId: INST,
      }),
    ).toBe(true);
  });
});
