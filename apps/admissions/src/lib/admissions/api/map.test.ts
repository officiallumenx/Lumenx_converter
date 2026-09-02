import { describe, expect, it } from "vitest";
import {
  admissionApplicationDtoToPortal,
  admissionApplicationDtosToPortal,
  admissionProgramDtoToPortal,
} from "./map-portal";
import type { AdmissionApplicationDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AdmissionApplicationDto> = {}): AdmissionApplicationDto {
  return {
    id: "aa111111-1111-4111-8111-111111111111",
    instituteId: INST,
    openingId: "oo111111-1111-4111-8111-111111111111",
    programId: "pp111111-1111-4111-8111-111111111111",
    applicantUserId: "uu111111-1111-4111-8111-111111111111",
    studentDisplayName: "Aarav Sharma",
    status: "approved",
    payload: {
      grade: "Grade 10",
      programName: "High School",
      student: { name: "Aarav Sharma", gender: "male" },
      parent: { mobile: "+91 9876543210" },
    },
    decisionNote: null,
    convertedStudentId: null,
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("admissions api map-portal", () => {
  it("maps application dto to portal AdmissionApplication", () => {
    const app = admissionApplicationDtoToPortal(dto(), {
      applicantId: "uu111111-1111-4111-8111-111111111111",
    });
    expect(app.student.name).toBe("Aarav Sharma");
    expect(app.grade).toBe("Grade 10");
    expect(app.programName).toBe("High School");
    expect(app.status).toBe("approved");
    expect(app.applicantId).toBe("uu111111-1111-4111-8111-111111111111");
  });

  it("maps draft status to submitted for V2 UI", () => {
    const app = admissionApplicationDtoToPortal(dto({ status: "draft" }));
    expect(app.status).toBe("submitted");
  });

  it("rejects malformed applications payload", () => {
    expect(() =>
      admissionApplicationDtosToPortal({ not: "array" } as never),
    ).toThrow(/array/i);
  });

  it("maps program dto to portal AdmissionProgram", () => {
    const program = admissionProgramDtoToPortal({
      id: "pp111111-1111-4111-8111-111111111111",
      instituteId: INST,
      name: "Grade 10",
      slug: "grade-10",
      description: "Board program",
      duration: "2 years",
      eligibility: "Grade 8 pass",
      ageCriteria: "13–15 years",
      seatsAvailable: 40,
      grades: ["Grade 9", "Grade 10"],
      academicYearLabel: "2026–27",
      applicationDeadline: "2026-07-01T00:00:00Z",
      status: "published",
      createdByUserId: "uu111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    });
    expect(program.name).toBe("Grade 10");
    expect(program.grades).toEqual(["Grade 9", "Grade 10"]);
    expect(program.seatsAvailable).toBe(40);
  });
});
