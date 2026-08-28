import { describe, expect, it } from "vitest";
import {
  admissionApplicationDtoToListItem,
  admissionApplicationDtosToListItems,
} from "./map";
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
    payload: { className: "Grade 10" },
    decisionNote: null,
    convertedStudentId: null,
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("admissions DTO mapping", () => {
  it("maps application to AdminSyncRow-compatible list item", () => {
    const item = admissionApplicationDtoToListItem(dto());
    expect(item.name).toBe("Aarav Sharma");
    expect(item.grade).toBe("Grade 10");
    expect(item.stage).toBe("approved");
    expect(item.docs).toBe("—/—");
    expect(item.instituteId).toBe(INST);
  });

  it("maps draft status to submitted stage", () => {
    const item = admissionApplicationDtoToListItem(dto({ status: "draft" }));
    expect(item.stage).toBe("submitted");
  });

  it("rejects malformed payload", () => {
    expect(() =>
      admissionApplicationDtosToListItems({ not: "array" } as never),
    ).toThrow(/array/i);
  });

  it("maps program and opening list items", async () => {
    const {
      admissionOpeningDtoToListItem,
      admissionProgramDtoToListItem,
    } = await import("./map");
    const program = admissionProgramDtoToListItem({
      id: "pp111111-1111-4111-8111-111111111111",
      instituteId: INST,
      name: "Grade 10",
      slug: "grade-10",
      description: null,
      duration: null,
      eligibility: null,
      ageCriteria: null,
      seatsAvailable: 40,
      grades: null,
      academicYearLabel: "2026–27",
      applicationDeadline: "2026-07-01T00:00:00Z",
      status: "published",
      createdByUserId: "uu111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    });
    expect(program.name).toBe("Grade 10");
    expect(program.seatsAvailable).toBe(40);

    const opening = admissionOpeningDtoToListItem({
      id: "oo111111-1111-4111-8111-111111111111",
      instituteId: INST,
      programId: "pp111111-1111-4111-8111-111111111111",
      name: "Grade 10 · 2026",
      slug: "grade-10-2026",
      description: null,
      seatsAvailable: 20,
      academicYearLabel: "2026–27",
      applicationDeadline: null,
      status: "open",
      createdByUserId: "uu111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    });
    expect(opening.programId).toBe("pp111111-1111-4111-8111-111111111111");
    expect(opening.status).toBe("open");
  });
});
