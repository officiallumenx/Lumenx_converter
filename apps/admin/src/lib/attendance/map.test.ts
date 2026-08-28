import { describe, expect, it } from "vitest";
import { attendanceRegisterDtoToListItem } from "./map";
import type { AttendanceRegisterDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("attendance map", () => {
  it("summarizes mark counts on register list item", () => {
    const dto: AttendanceRegisterDto = {
      id: "ee111111-1111-4111-8111-111111111111",
      instituteId: INST,
      academicYearId: "cc111111-1111-4111-8111-111111111111",
      classId: "dd111111-1111-4111-8111-111111111111",
      sectionId: "ff111111-1111-4111-8111-111111111111",
      configVersionId: "aa111111-1111-4111-8111-111111111111",
      method: "daily",
      owner: "class_teacher",
      attendanceDate: "2026-06-01",
      slotKind: "day",
      slotCode: "day",
      periodIndex: null,
      timetableSlotId: null,
      slotLabel: "Full day",
      subjectLabel: null,
      startsAt: null,
      endsAt: null,
      status: "submitted",
      markedByTeacherId: null,
      submittedAt: "2026-06-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
      marks: [
        {
          id: "m1",
          enrollmentId: "e1",
          studentId: "s1",
          status: "present",
          createdAt: "2026-06-01T10:00:00Z",
          updatedAt: "2026-06-01T10:00:00Z",
        },
        {
          id: "m2",
          enrollmentId: "e2",
          studentId: "s2",
          status: "absent",
          createdAt: "2026-06-01T10:00:00Z",
          updatedAt: "2026-06-01T10:00:00Z",
        },
      ],
    };
    const row = attendanceRegisterDtoToListItem(dto);
    expect(row.presentCount).toBe(1);
    expect(row.absentCount).toBe(1);
    expect(row.totalMarks).toBe(2);
  });
});
