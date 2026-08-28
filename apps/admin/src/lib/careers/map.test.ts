import { describe, expect, it } from "vitest";
import {
  careerApplicationDtoToListItem,
  mapCareerStatusToStage,
} from "./map";
import type { CareerApplicationDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<CareerApplicationDto> = {}): CareerApplicationDto {
  return {
    id: "ca111111-1111-4111-8111-111111111111",
    instituteId: INST,
    jobId: "jj111111-1111-4111-8111-111111111111",
    candidateProfileId: null,
    applicantUserId: "uu111111-1111-4111-8111-111111111111",
    status: "offer_accepted",
    coverLetter: null,
    payload: { name: "Priya Nair", jobTitle: "Math Teacher" },
    decisionNote: null,
    convertedTeacherId: null,
    submittedAt: "2026-06-01T10:00:00Z",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("careers DTO mapping", () => {
  it("maps application fields and status to stage", () => {
    const item = careerApplicationDtoToListItem(dto());
    expect(item.name).toBe("Priya Nair");
    expect(item.role).toBe("Math Teacher");
    expect(item.stage).toBe("approved");
    expect(item.docs).toBe("—/—");
    expect(item.jobId).toBe("jj111111-1111-4111-8111-111111111111");
  });

  it("maps backend statuses to admin stages", () => {
    expect(mapCareerStatusToStage("shortlisted")).toBe("verification");
    expect(mapCareerStatusToStage("interview_scheduled")).toBe("interview");
    expect(mapCareerStatusToStage("on_hold")).toBe("waitlist");
    expect(mapCareerStatusToStage("rejected")).toBe("rejected");
  });
});
