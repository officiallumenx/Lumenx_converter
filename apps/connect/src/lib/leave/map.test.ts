import { describe, expect, it } from "vitest";
import {
  leaveDtoToConnectRequest,
  leaveDtoToTeacherLeaveRequest,
  toLeaveBadgeStatus,
} from "./map";
import type { LeaveRequestDto, StudentNameLookup } from "./types";

const lookup: StudentNameLookup = new Map([
  [
    "ac111111-1111-4111-8111-111111111111",
    { name: "Aarav Sharma", className: "Class 10", section: "B" },
  ],
]);

describe("connect leave map", () => {
  it("maps student leave dto to connect request with ignored status", () => {
    const dto: LeaveRequestDto = {
      id: "lv-1",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      subjectKind: "student",
      studentId: "ac111111-1111-4111-8111-111111111111",
      teacherId: null,
      requestedByUserId: "user-1",
      leaveType: "general",
      intendedApproverRole: null,
      startDate: "2026-06-04",
      endDate: "2026-06-05",
      reason: "Family wedding",
      status: "ignored",
      academicYearId: null,
      classId: null,
      sectionId: null,
      createdAt: "2026-06-01T09:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    };

    const row = leaveDtoToConnectRequest(dto, lookup, {
      id: "d-1",
      instituteId: dto.instituteId,
      leaveRequestId: dto.id,
      outcome: "ignored",
      note: "Exam week",
      decidedByUserId: "t-1",
      decidedAt: "2026-06-02T10:00:00Z",
      createdAt: "2026-06-02T10:00:00Z",
      updatedAt: "2026-06-02T10:00:00Z",
    });

    expect(row.childName).toBe("Aarav Sharma");
    expect(row.status).toBe("ignored");
    expect(row.teacherNote).toBe("Exam week");
    expect(toLeaveBadgeStatus(row.status)).toBe("ignored");
  });

  it("maps teacher leave dto with principal approver", () => {
    const dto: LeaveRequestDto = {
      id: "lv-2",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      subjectKind: "teacher",
      studentId: null,
      teacherId: "bb111111-1111-4111-8111-111111111111",
      requestedByUserId: "user-2",
      leaveType: "sick",
      intendedApproverRole: "principal",
      startDate: "2026-06-10",
      endDate: "2026-06-10",
      reason: "Medical",
      status: "pending",
      academicYearId: null,
      classId: null,
      sectionId: null,
      createdAt: "2026-06-08T09:00:00Z",
      updatedAt: "2026-06-08T09:00:00Z",
    };

    const row = leaveDtoToTeacherLeaveRequest(dto);
    expect(row.type).toBe("sick");
    expect(row.to).toBe("principal");
    expect(row.status).toBe("pending");
  });
});
