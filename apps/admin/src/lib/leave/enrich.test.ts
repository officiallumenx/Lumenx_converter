import { describe, expect, it } from "vitest";
import {
  buildLeaveEnrichmentContext,
  enrichLeaveDtoToListItem,
} from "./enrich";
import type { LeaveRequestDto } from "./types";
import type { StudentListItem } from "@/lib/students/types";
import type { TeacherListItem } from "@/lib/teachers/types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STUDENT = "ac111111-1111-4111-8111-111111111111";
const TEACHER = "bb111111-1111-4111-8111-111111111111";
const SECTION = "cc111111-1111-4111-8111-111111111111";
const CLASS = "ff111111-1111-4111-8111-111111111111";

function studentDto(overrides: Partial<LeaveRequestDto> = {}): LeaveRequestDto {
  return {
    id: "lv-1",
    instituteId: INST,
    subjectKind: "student",
    studentId: STUDENT,
    teacherId: null,
    requestedByUserId: "user-1",
    leaveType: "general",
    intendedApproverRole: null,
    startDate: "2026-06-01",
    endDate: "2026-06-02",
    reason: "Family event",
    status: "approved",
    academicYearId: null,
    classId: CLASS,
    sectionId: SECTION,
    createdAt: "2026-05-30T10:00:00Z",
    updatedAt: "2026-05-31T10:00:00Z",
    ...overrides,
  };
}

const studentListItem: StudentListItem = {
  id: STUDENT,
  name: "Aanya Sharma",
  firstName: "Aanya",
  surname: "Sharma",
  displayName: "Aanya Sharma",
  grade: "10",
  classLabel: "10",
  sectionLabel: "A",
  rollNo: "12",
  admissionNumber: null,
  status: "active",
  accessStatus: "active",
  gender: "female",
  instituteId: INST,
};

const teacherListItem: TeacherListItem = {
  id: TEACHER,
  instituteId: INST,
  name: "Ms. Ananya Iyer",
  role: "teacher",
  dept: "Mathematics",
  email: "t@x.com",
  phone: "9",
  password: "",
  employeeId: "T-1",
  joined: "2020-01-01",
  classes: 2,
  assignedSections: ["10-A"],
  status: "active",
  subjects: ["Math"],
  portalAccess: "full",
  qualification: "M.Sc",
  lastLogin: "",
  credentialsSentAt: null,
  identityLabel: "T-1",
};

describe("leave enrich", () => {
  it("replaces truncated student id with real name and class label", () => {
    const ctx = buildLeaveEnrichmentContext({
      students: [studentListItem],
      teachers: [],
      classes: [
        {
          id: CLASS,
          instituteId: INST,
          academicYearId: "y",
          name: "Class 10",
          code: "10",
          sortOrder: 1,
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
      ],
      sections: [
        {
          id: SECTION,
          instituteId: INST,
          academicYearId: "y",
          classId: CLASS,
          name: "A",
          code: "A",
          capacity: 40,
          room: null,
          sortOrder: 1,
          status: "active",
          createdAt: "",
          updatedAt: "",
        },
      ],
      decisionNotes: new Map([["lv-1", "Approved by class teacher."]]),
    });

    const item = enrichLeaveDtoToListItem(studentDto(), ctx);
    expect(item.name).toBe("Aanya Sharma");
    expect(item.className).toBe("Class 10-A");
    expect(item.decisionNote).toBe("Approved by class teacher.");
  });

  it("enriches teacher rows with department and decision note", () => {
    const ctx = buildLeaveEnrichmentContext({
      students: [],
      teachers: [teacherListItem],
      classes: [],
      sections: [],
      decisionNotes: new Map([["lv-2", "Accepted."]]),
    });

    const item = enrichLeaveDtoToListItem(
      studentDto({
        id: "lv-2",
        subjectKind: "teacher",
        studentId: null,
        teacherId: TEACHER,
        leaveType: "casual",
        intendedApproverRole: "institute_admin",
      }),
      ctx,
    );
    expect(item.name).toBe("Ms. Ananya Iyer");
    expect(item.dept).toBe("Mathematics");
    expect(item.decisionNote).toBe("Accepted.");
  });
});
