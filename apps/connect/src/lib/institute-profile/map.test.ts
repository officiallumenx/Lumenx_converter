import { describe, expect, it } from "vitest";
import { demoProfileToSettingsPatch, settingsToDemoProfile } from "./map";
import type { InstituteSettingsDto } from "./types";

describe("connect institute-profile map", () => {
  it("maps settings profile jsonb to demo profile", () => {
    const settings: InstituteSettingsDto = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {
        profile: {
          name: "Alpha",
          founded: "",
          founder: "",
          principal: "Dr. P",
          vision: "V",
          mission: "M",
          ranking: "",
          logo: "",
          profilePhoto: "",
          phone: "",
          email: "",
          address: "",
          history: [],
          awards: [],
          achievements: [],
          customFields: [],
        },
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(settingsToDemoProfile({ name: "Alpha" }, settings).principal).toBe("Dr. P");
    const merged = demoProfileToSettingsPatch(settings.settings, {
      ...settingsToDemoProfile({ name: "Alpha" }, settings),
      vision: "New vision",
    });
    expect((merged.profile as { vision: string }).vision).toBe("New vision");
  });
});
