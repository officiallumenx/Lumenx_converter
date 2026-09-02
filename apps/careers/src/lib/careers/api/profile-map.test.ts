import { describe, expect, it } from "vitest";
import {
  candidateProfileDtoToProfile,
  candidateProfileToUpsertInput,
} from "./profile-map";
import { defaultCandidateProfile } from "../profile-repository";
import type { CandidateProfileDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "uu111111-1111-4111-8111-111111111111";

describe("careers profile map", () => {
  it("maps dto payload into CandidateProfile", () => {
    const dto: CandidateProfileDto = {
      id: "pp111111-1111-4111-8111-111111111111",
      instituteId: INST,
      userProfileId: USER,
      displayName: "Priya Nair",
      headline: "Math teacher",
      summary: "Experienced educator",
      phone: "+91 90000 00000",
      email: "priya@example.com",
      payload: {
        city: "Hyderabad",
        state: "Telangana",
        skills: ["Algebra", "Geometry"],
      },
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };

    const profile = candidateProfileDtoToProfile(dto, USER);
    expect(profile.headline).toBe("Math teacher");
    expect(profile.city).toBe("Hyderabad");
    expect(profile.skills).toEqual(["Algebra", "Geometry"]);
  });

  it("builds upsert input from profile", () => {
    const profile = {
      ...defaultCandidateProfile(USER),
      headline: "Engineer",
      summary: "Backend developer",
      skills: ["Node.js"],
    };
    const input = candidateProfileToUpsertInput(profile, INST, {
      name: "Priya Nair",
      email: "priya@example.com",
    });
    expect(input.instituteId).toBe(INST);
    expect(input.displayName).toBe("Priya Nair");
    expect(input.headline).toBe("Engineer");
    expect(input.payload).toMatchObject({ skills: ["Node.js"] });
  });
});
