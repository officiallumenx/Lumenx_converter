import { describe, expect, it } from "vitest";
import { mapRegistrationDtoToApplication } from "./map";
import type { InstituteRegistrationDto } from "./types";

describe("mapRegistrationDtoToApplication", () => {
  it("maps backend registration fields for Nexus review UI", () => {
    const dto: InstituteRegistrationDto = {
      id: "11111111-1111-4111-8111-111111111111",
      applicantUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      applicantName: "Dr. Ananya Verma",
      email: "principal@school.edu",
      phone: "+919876543210",
      payload: {
        instituteName: "Alpha School",
        city: "Bengaluru",
        state: "Karnataka",
        principalEmail: "principal@school.edu",
      },
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      instituteId: null,
      createdAt: "2024-06-01T08:00:00Z",
      updatedAt: "2024-06-01T08:00:00Z",
    };

    const app = mapRegistrationDtoToApplication(dto);
    expect(app.id).toBe(dto.id);
    expect(app.payload.instituteName).toBe("Alpha School");
    expect(app.referenceId).toMatch(/^LX-REG-/);
    expect(app.emailVerified).toBe(true);
  });
});
