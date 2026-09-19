import { describe, expect, it } from "vitest";
import {
  emptyPublicProfile,
  mergeInstituteSettingsJson,
  publicProfileFromRegistrationPayload,
} from "../src/domains/identity/institute-public-profile.js";

describe("institute public profile", () => {
  it("seeds profile from registration payload", () => {
    const profile = publicProfileFromRegistrationPayload("Test1School", {
      instituteName: "Test1School",
      principalName: "Anita Rao",
      principalEmail: "registrar@greenfield.edu.in",
      principalMobile: "9876543210",
      address: "45 Residency Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560025",
      logoPreview: "data:image/png;base64,abc",
    });
    expect(profile.name).toBe("Test1School");
    expect(profile.principal).toBe("Anita Rao");
    expect(profile.address).toContain("Bengaluru");
    expect(profile.logo).toContain("data:image");
  });

  it("accepts registration logos within the signup 2 MB file limit", () => {
    const logoPreview = `data:image/png;base64,${"a".repeat(250_000)}`;
    const profile = publicProfileFromRegistrationPayload("Logo School", {
      instituteName: "Logo School",
      logoPreview,
    });

    expect(profile.logo).toBe(logoPreview);
  });

  it("merges profile patch without dropping other settings keys", () => {
    const merged = mergeInstituteSettingsJson(
      { attendance: { mode: "daily" }, profile: emptyPublicProfile("Old") },
      {
        profile: { ...emptyPublicProfile("New School"), vision: "Grow together" },
      },
    );
    expect(merged.attendance).toEqual({ mode: "daily" });
    expect((merged.profile as { name: string; vision: string }).name).toBe("New School");
    expect((merged.profile as { vision: string }).vision).toBe("Grow together");
  });
});
