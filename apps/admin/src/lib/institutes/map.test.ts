import { describe, expect, it } from "vitest";
import { demoProfileToSettingsPatch, settingsToDemoProfile } from "./map";
import type { InstituteDto, InstituteSettingsDto } from "./types";

const institute: InstituteDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  code: "LX-A",
  name: "Alpha School",
  kind: "school",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("institutes map", () => {
  it("round-trips rich profile through settings jsonb", () => {
    const settings: InstituteSettingsDto = {
      instituteId: institute.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {
        profile: {
          name: "Alpha School",
          founded: "1998",
          founder: "Founder",
          principal: "Dr. Principal",
          vision: "Vision text",
          mission: "Mission text",
          ranking: "NAAC A+",
          logo: "",
          profilePhoto: "",
          phone: "+91 99999 99999",
          email: "office@alpha.edu",
          address: "Campus Road",
          history: [{ year: "1998", event: "Founded" }],
          awards: [{ title: "Best School", year: "2024", body: "State award" }],
          achievements: ["Top results"],
          customFields: [],
        },
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const profile = settingsToDemoProfile(institute, settings);
    expect(profile.principal).toBe("Dr. Principal");
    expect(profile.vision).toBe("Vision text");

    const merged = demoProfileToSettingsPatch(settings.settings, {
      ...profile,
      mission: "Updated mission",
    });
    expect((merged.profile as { mission: string }).mission).toBe("Updated mission");
  });

  it("falls back to institute name when profile is missing", () => {
    const settings: InstituteSettingsDto = {
      instituteId: institute.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(settingsToDemoProfile(institute, settings).name).toBe("Alpha School");
  });
});
