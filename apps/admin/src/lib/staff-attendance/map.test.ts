import { describe, expect, it } from "vitest";
import {
  mergeTeachersIntoDaySummary,
  staffAttendanceDtosToDaySummary,
} from "./map";
import type { StaffAttendanceDto } from "./types";
import type { TeacherListItem } from "@/lib/teachers/types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TEACHER_2 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

function teacherStub(
  partial: Pick<TeacherListItem, "id" | "name"> & Partial<TeacherListItem>,
): TeacherListItem {
  return {
    instituteId: INST,
    role: "subject-teacher",
    dept: "Science",
    email: "",
    phone: "",
    password: "",
    employeeId: "",
    joined: "",
    classes: 0,
    assignedSections: [],
    status: "active",
    subjects: [],
    portalAccess: "",
    qualification: "",
    lastLogin: "",
    credentialsSentAt: null,
    identityLabel: partial.name,
    ...partial,
  };
}

describe("staff-attendance map", () => {
  it("summarizes mark counts and resolves teacher names", () => {
    const teachersById = new Map<string, TeacherListItem>([
      [
        TEACHER_ID,
        teacherStub({
          id: TEACHER_ID,
          name: "Jane Doe",
          email: "jane@example.com",
          employeeId: "T-001",
        }),
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
    expect(summary.submittedAt).toBe("2026-06-01T10:00:00Z");
    expect(summary.marks[0]?.teacherName).toBe("Jane Doe");
    expect(summary.marks[0]?.checkIn).toBe("08:15");
  });

  it("fills unmarked teachers as draft absent placeholders", () => {
    const teachers = [
      teacherStub({ id: TEACHER_ID, name: "Jane Doe" }),
      teacherStub({ id: TEACHER_2, name: "Bob" }),
    ];
    const byId = new Map(teachers.map((t) => [t.id, t]));
    const rows: StaffAttendanceDto[] = [
      {
        id: "m1",
        instituteId: INST,
        teacherId: TEACHER_ID,
        attendanceDate: "2026-06-01",
        status: "present",
        checkIn: "09:00:00",
        checkOut: null,
        note: null,
        dayStatus: "draft",
        markedByUserId: "u1",
        submittedAt: null,
        submittedByUserId: null,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
    const summary = staffAttendanceDtosToDaySummary(rows, byId, "2026-06-01");
    const merged = mergeTeachersIntoDaySummary(summary, teachers);
    expect(merged.total).toBe(2);
    expect(merged.marks.find((m) => m.teacherId === TEACHER_ID)?.status).toBe(
      "present",
    );
    expect(merged.marks.find((m) => m.teacherId === TEACHER_2)?.id).toBe(
      `pending:${TEACHER_2}`,
    );
    expect(merged.marks.find((m) => m.teacherId === TEACHER_2)?.status).toBe(
      "absent",
    );
  });
});
