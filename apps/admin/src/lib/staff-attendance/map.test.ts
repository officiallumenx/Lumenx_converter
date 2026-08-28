import { describe, expect, it } from "vitest";
import { staffAttendanceDtosToDaySummary } from "./map";
import type { StaffAttendanceDto } from "./types";
import type { TeacherListItem } from "@/lib/teachers/types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("staff-attendance map", () => {
  it("summarizes mark counts and resolves teacher names", () => {
    const teachersById = new Map<string, TeacherListItem>([
      [
        TEACHER_ID,
        {
          id: TEACHER_ID,
          name: "Jane Doe",
          email: "jane@example.com",
          phone: null,
          status: "active",
          department: "Science",
          employeeId: "T-001",
          joinedOn: "2024-01-01",
          subjects: [],
        },
      ],
    ]);
    const rows: StaffAttendanceDto[] = [
      {
        id: "m1",
        instituteId: INST,
        teacherId: TEACHER_ID,
        attendanceDate: "2026-06-01",
        status: "present",
        checkIn: "08:15:00",
        checkOut: null,
        note: null,
        dayStatus: "submitted",
        markedByUserId: "u1",
        submittedAt: "2026-06-01T10:00:00Z",
        submittedByUserId: "u1",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
      {
        id: "m2",
        instituteId: INST,
        teacherId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        attendanceDate: "2026-06-01",
        status: "absent",
        checkIn: null,
        checkOut: null,
        note: "Sick",
        dayStatus: "draft",
        markedByUserId: "u1",
        submittedAt: null,
        submittedByUserId: null,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
    const summary = staffAttendanceDtosToDaySummary(rows, teachersById, "2026-06-01");
    expect(summary.total).toBe(2);
    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.dayStatus).toBe("submitted");
    expect(summary.marks[0]?.teacherName).toBe("Jane Doe");
    expect(summary.marks[0]?.checkIn).toBe("08:15");
  });
});
