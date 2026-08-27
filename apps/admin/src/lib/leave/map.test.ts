import { describe, expect, it } from "vitest";
import { daysBetween, leaveDtoToListItem, leaveDtosToListItems } from "./map";
import type { LeaveRequestDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT = "11111111-1111-4111-8111-111111111111";
const TEACHER = "22222222-2222-4222-8222-222222222222";
const USER = "33333333-3333-4333-8333-333333333333";

function dto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: "lv-1",
    instituteId: INST,
    subjectKind: "teacher",
    studentId: null,
    teacherId: TEACHER,
    requestedByUserId: USER,
    leaveType: "casual",
    intendedApproverRole: "institute_admin",
    startDate: "2026-06-01",
    endDate: "2026-06-03",
    reason: "Family event",
    status: "pending",
    academicYearId: null,
    classId: null,
    sectionId: null,
    createdAt: "2026-05-30T10:00:00Z",
    updatedAt: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

describe("leave DTO mapping", () => {
  it("maps teacher DTO with approver label", () => {
    const item = leaveDtoToListItem(dto());
    expect(item).toMatchObject({
      id: "lv-1",
      subjectKind: "teacher",
      status: "pending",
      type: "casual",
      from: "2026-06-01",
      to: "2026-06-03",
      days: 3,
      reason: "Family event",
      toRole: "Institute admin",
      className: "—",
    });
    expect(item.name).toMatch(/^Teacher 22222222/);
    expect(item.applied).toBe("2026-05-30");
  });

  it("maps student DTO into the student side only", () => {
    const item = leaveDtoToListItem(
      dto({
        id: "lv-2",
        subjectKind: "student",
        studentId: STUDENT,
        teacherId: null,
        leaveType: "general",
        intendedApproverRole: null,
        classId: "44444444-4444-4444-8444-444444444444",
        sectionId: "55555555-5555-4555-8555-555555555555",
      }),
    );
    expect(item.subjectKind).toBe("student");
    expect(item.name).toMatch(/^Student 11111111/);
    expect(item.className).toMatch(/^Sec 55555555/);
    expect(item.toRole).toBe("—");
    expect(item.dept).toBe("—");
  });

  it("keeps subject rows in their own tab after list mapping", () => {
    const items = leaveDtosToListItems([
      dto({ id: "s1", subjectKind: "student", studentId: STUDENT, teacherId: null }),
      dto({ id: "t1", subjectKind: "teacher" }),
      dto({ id: "s2", subjectKind: "student", studentId: STUDENT, teacherId: null }),
    ]);
    const students = items.filter((i) => i.subjectKind === "student");
    const teachers = items.filter((i) => i.subjectKind === "teacher");
    expect(students.map((i) => i.id)).toEqual(["s1", "s2"]);
    expect(teachers.map((i) => i.id)).toEqual(["t1"]);
    for (const s of students) expect(s.subjectKind).toBe("student");
    for (const t of teachers) expect(t.subjectKind).toBe("teacher");
  });

  it.each([
    ["pending", "pending"],
    ["approved", "approved"],
    ["rejected", "rejected"],
    ["ignored", "ignored"],
    ["cancelled", "cancelled"],
  ] as const)("passes through backend status %s", (input, expected) => {
    expect(leaveDtoToListItem(dto({ status: input })).status).toBe(expected);
  });

  it("falls back to requesting user when identity IDs are absent", () => {
    const item = leaveDtoToListItem(
      dto({ subjectKind: "teacher", teacherId: null, requestedByUserId: USER }),
    );
    expect(item.name).toMatch(/^User 33333333/);
  });

  it("returns 0 days and safe strings for invalid dates", () => {
    const item = leaveDtoToListItem(
      dto({
        startDate: "not-a-date",
        endDate: "also-bad",
        createdAt: "nope",
      }),
    );
    expect(item.days).toBe(0);
    expect(item.applied).toBe("—");
  });

  it("computes inclusive day span", () => {
    expect(daysBetween("2026-06-01", "2026-06-01")).toBe(1);
    expect(daysBetween("2026-06-01", "2026-06-03")).toBe(3);
    expect(daysBetween("2026-06-03", "2026-06-01")).toBe(0);
    expect(daysBetween("bad", "2026-06-01")).toBe(0);
  });
});
