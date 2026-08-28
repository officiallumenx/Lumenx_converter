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
});
