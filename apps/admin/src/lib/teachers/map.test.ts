import { describe, expect, it } from "vitest";
import {
  apiStatusToTeacherStatus,
  formatJoinedLabel,
  portalAccessLevelToLabel,
  teacherDtoToListItem,
  teacherDtosToListItems,
  teacherIdentityLabel,
  teachingScopeToRole,
} from "./map";
import type { TeacherDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<TeacherDto> = {}): TeacherDto {
  return {
    id: "bb111111-1111-4111-8111-111111111111",
    instituteId: INST,
    userProfileId: null,
    legacyCode: "T-001",
    employeeId: "EMP-1041",
    displayName: "Sarah Jenkins",
    phone: "+1 555 010 2201",
    email: "s.jenkins@institute.edu",
    department: "Mathematics",
    qualification: "M.Sc Mathematics · B.Ed",
    dateOfBirth: "1985-08-18",
    joinedOn: "2019-08-01",
    teachingScope: "subject_teacher",
    portalAccessLevel: "faculty_grading",
    status: "active",
    subjects: ["Mathematics", "Algebra"],
    assignedSectionLabels: ["10-A", "10-B", "11-A"],
    sourceCareerApplicationId: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("teachers DTO mapping", () => {
  it("maps display name, role, status, and sections", () => {
    const item = teacherDtoToListItem(dto());
    expect(item.name).toBe("Sarah Jenkins");
    expect(item.role).toBe("subject-teacher");
    expect(item.status).toBe("active");
    expect(item.dept).toBe("Mathematics");
    expect(item.instituteId).toBe(INST);
    expect(item.assignedSections).toEqual(["10-A", "10-B", "11-A"]);
    expect(item.classes).toBe(3);
    expect(item.subjects).toEqual(["Mathematics", "Algebra"]);
    expect(item.portalAccess).toBe("Faculty + Grading");
  });

  it("falls back name when display name is blank", () => {
    const item = teacherDtoToListItem(dto({ displayName: "   " }));
    expect(item.name).toBe("Teacher");
  });

  it("maps teaching scopes and API status values", () => {
    expect(teachingScopeToRole("activity_coordinator")).toBe(
      "activity-coordinator",
    );
    expect(teachingScopeToRole("dual_role")).toBe("both");
    expect(apiStatusToTeacherStatus("on_leave")).toBe("on-leave");
    expect(portalAccessLevelToLabel("read_only")).toBe("Read-only");
  });

  it("uses employee or legacy code for identity label", () => {
    expect(teacherIdentityLabel(dto())).toBe("EMP-1041");
    expect(
      teacherIdentityLabel(
        dto({ employeeId: null, legacyCode: "T-001", id: "uuid-full-id" }),
      ),
    ).toBe("T-001");
    expect(
      teacherIdentityLabel(
        dto({
          employeeId: null,
          legacyCode: null,
          id: "bb111111-1111-4111-8111-111111111111",
        }),
      ),
    ).toBe("bb111111");
  });

  it("handles null sparse fields and demo-compat placeholders", () => {
    const item = teacherDtoToListItem(
      dto({
        email: null,
        phone: null,
        qualification: null,
        subjects: null,
        assignedSectionLabels: null,
        joinedOn: null,
      }),
    );
    expect(item.email).toBe("");
    expect(item.phone).toBe("");
    expect(item.qualification).toBe("");
    expect(item.subjects).toEqual([]);
    expect(item.assignedSections).toEqual([]);
    expect(item.classes).toBe(0);
    expect(item.joined).toBe("—");
    expect(item.password).toBe("");
    expect(item.lastLogin).toBe("—");
    expect(item.credentialsSentAt).toBeNull();
  });

  it("formatJoinedLabel handles invalid dates safely", () => {
    expect(formatJoinedLabel("2019-08-01")).toMatch(/2019/);
    expect(formatJoinedLabel("not-a-date")).toBe("not-a-date");
    expect(formatJoinedLabel(null)).toBe("—");
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = teacherDtosToListItems([dto(), dto({ id: "t-2" })]);
    expect(items).toHaveLength(2);
    expect(() => teacherDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });
});
