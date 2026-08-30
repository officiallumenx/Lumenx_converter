import { describe, expect, it } from "vitest";
import {
  buildStudentGradeLabel,
  studentDtoToDetailItem,
  studentDtoToListItem,
  studentDtosToListItems,
} from "./map";
import type { StudentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<StudentDto> = {}): StudentDto {
  return {
    id: "stu-1",
    instituteId: INST,
    userProfileId: null,
    legacyCode: null,
    admissionNumber: "ADM-1001",
    sourceAdmissionApplicationId: null,
    firstName: "Aanya",
    surname: "Sharma",
    displayName: "Aanya Sharma",
    gender: "female",
    dateOfBirth: "2010-05-01",
    address: "12 Park Lane",
    classLabel: "Grade 10",
    sectionLabel: "A",
    rollNo: "14",
    status: "active",
    accessStatus: "active",
    bloodGroup: null,
    emergencyContact: null,
    house: null,
    photoAssetPath: null,
    idCardIssuedOn: null,
    idCardValidTill: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("students DTO mapping", () => {
  it("maps display name and grade from class/section labels", () => {
    const item = studentDtoToListItem(dto());
    expect(item.name).toBe("Aanya Sharma");
    expect(item.grade).toBe("Grade 10-A");
    expect(item.rollNo).toBe("14");
    expect(item.admissionNumber).toBe("ADM-1001");
  });

  it("falls back name when display name is blank", () => {
    const item = studentDtoToListItem(
      dto({ displayName: "   ", firstName: "Ravi", surname: "Kumar" }),
    );
    expect(item.name).toBe("Ravi Kumar");
  });

  it("maps unknown status to active", () => {
    const item = studentDtoToListItem(
      dto({ status: "unknown-status" as StudentDto["status"] }),
    );
    expect(item.status).toBe("active");
  });

  it("sets demo-compat metrics to neutral API placeholders", () => {
    const item = studentDtoToListItem(dto());
    expect(item.attendance).toBe(0);
    expect(item.gpa).toBe(0);
    expect(item.parent).toBe("");
  });

  it("buildStudentGradeLabel handles sparse labels", () => {
    expect(buildStudentGradeLabel(null, null)).toBe("—");
    expect(buildStudentGradeLabel("Grade 9", null)).toBe("Grade 9");
    expect(buildStudentGradeLabel(null, "B")).toBe("B");
  });

  it("maps multiple DTOs and rejects malformed payload", () => {
    const items = studentDtosToListItems([dto(), dto({ id: "stu-2" })]);
    expect(items).toHaveLength(2);
    expect(() => studentDtosToListItems({ not: "array" } as never)).toThrow(
      /array/i,
    );
  });

  it("detail mapping keeps instituteId for tenant checks", () => {
    const detail = studentDtoToDetailItem(dto());
    expect(detail.instituteId).toBe(INST);
    expect(detail.address).toBe("12 Park Lane");
  });
});
