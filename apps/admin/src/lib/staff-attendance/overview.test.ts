import { describe, expect, it } from "vitest";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { StaffAttendanceDto } from "./types";
import {
  buildStaffAttendanceHistoryDays,
  buildStaffAttendanceOverview,
} from "./overview";

const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";

const teachersById = new Map<string, TeacherListItem>([
  [
    TEACHER_A,
    {
      id: TEACHER_A,
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Alice",
      role: "subject-teacher",
      dept: "Math",
      email: "a@x.com",
      phone: "",
      password: "",
      employeeId: "EMP-1",
      joined: "Jan 2024",
      classes: 2,
      assignedSections: [],
      status: "active",
      subjects: ["Math"],
      portalAccess: "Faculty + Grading",
      qualification: "",
      lastLogin: "",
      credentialsSentAt: null,
      identityLabel: "EMP-1",
    },
  ],
  [
    TEACHER_B,
    {
      id: TEACHER_B,
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Bob",
      role: "subject-teacher",
      dept: "Physics",
      email: "b@x.com",
      phone: "",
      password: "",
      employeeId: "EMP-2",
      joined: "Feb 2024",
      classes: 2,
      assignedSections: [],
      status: "active",
      subjects: ["Physics"],
      portalAccess: "Faculty + Grading",
      qualification: "",
      lastLogin: "",
      credentialsSentAt: null,
      identityLabel: "EMP-2",
    },
  ],
]);

function dto(
  partial: Partial<StaffAttendanceDto> & Pick<StaffAttendanceDto, "teacherId" | "attendanceDate" | "status">,
): StaffAttendanceDto {
  return {
    id: partial.id ?? `att-${partial.teacherId}-${partial.attendanceDate}`,
    instituteId: partial.instituteId ?? "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    teacherId: partial.teacherId,
    attendanceDate: partial.attendanceDate,
    status: partial.status,
    checkIn: partial.checkIn ?? null,
    checkOut: partial.checkOut ?? null,
    note: partial.note ?? null,
    dayStatus: partial.dayStatus ?? "submitted",
    markedByUserId: partial.markedByUserId ?? "11111111-1111-4111-8111-111111111111",
    submittedAt: partial.submittedAt ?? "2026-06-01T10:00:00.000Z",
    submittedByUserId: partial.submittedByUserId ?? "11111111-1111-4111-8111-111111111111",
    createdAt: partial.createdAt ?? "2026-06-01T09:00:00.000Z",
    updatedAt: partial.updatedAt ?? "2026-06-01T10:00:00.000Z",
  };
}

describe("staff-attendance overview", () => {
  it("builds per-teacher attendance percentages from submitted rows", () => {
    const rows = [
      dto({ teacherId: TEACHER_A, attendanceDate: "2026-06-01", status: "present" }),
      dto({ teacherId: TEACHER_A, attendanceDate: "2026-06-02", status: "absent", note: "Sick" }),
      dto({ teacherId: TEACHER_B, attendanceDate: "2026-06-01", status: "late", note: "Traffic" }),
    ];

    const overview = buildStaffAttendanceOverview(rows, teachersById);
    expect(overview).toHaveLength(2);

    const alice = overview.find((row) => row.id === TEACHER_A)!;
    expect(alice.attendancePct).toBe(50);
    expect(alice.absent).toBe(1);
    expect(alice.exceptions).toHaveLength(1);

    const bob = overview.find((row) => row.id === TEACHER_B)!;
    expect(bob.late).toBe(1);
    expect(bob.attendancePct).toBe(100);
  });

  it("ignores draft rows when building overview", () => {
    const rows = [
      dto({
        teacherId: TEACHER_A,
        attendanceDate: "2026-06-01",
        status: "present",
        dayStatus: "draft",
        submittedAt: null,
      }),
    ];
    expect(buildStaffAttendanceOverview(rows, teachersById)).toHaveLength(0);
  });

  it("groups submitted marks into history days sorted newest first", () => {
    const rows = [
      dto({ teacherId: TEACHER_A, attendanceDate: "2026-06-01", status: "present" }),
      dto({ teacherId: TEACHER_B, attendanceDate: "2026-06-01", status: "absent" }),
      dto({ teacherId: TEACHER_A, attendanceDate: "2026-06-03", status: "leave" }),
    ];

    const history = buildStaffAttendanceHistoryDays(rows, teachersById);
    expect(history.map((day) => day.date)).toEqual(["2026-06-03", "2026-06-01"]);
    expect(history[1]?.present).toBe(1);
    expect(history[1]?.absent).toBe(1);
    expect(history[1]?.marks).toHaveLength(2);
  });
});
