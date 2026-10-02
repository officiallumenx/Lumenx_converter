import { describe, expect, it } from "vitest";
import { resolveBirthdayPrincipalName } from "./resolve-birthday-principal";
import type { InstituteDto, InstituteSettingsDto } from "@/lib/institutes/types";

const institute: InstituteDto = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  code: "LX-A",
  name: "Alpha School",
  kind: "school",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("resolveBirthdayPrincipalName", () => {
  it("reads principal from institute settings profile (not nested twice)", () => {
    const settings: InstituteSettingsDto = {
      instituteId: institute.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {
        profile: {
          name: "Alpha School",
          principal: "Lokesh Vella",
          founded: "",
          founder: "",
          vision: "",
          mission: "",
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
    };

    expect(
      resolveBirthdayPrincipalName({
        institute,
        settings,
        demoPrincipalName: "Dr. Alistair Vance",
        sessionUserName: "lokesh",
        apiMode: true,
      }),
    ).toBe("Lokesh Vella");
  });

  it("falls back to registered / session name when profile principal is empty", () => {
    const settings: InstituteSettingsDto = {
      instituteId: institute.id,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {},
    };

    expect(
      resolveBirthdayPrincipalName({
        institute,
        settings,
        registeredPrincipalName: "Anita Rao",
        demoPrincipalName: "Dr. Alistair Vance",
        apiMode: true,
      }),
    ).toBe("Anita Rao");

    expect(
      resolveBirthdayPrincipalName({
        institute,
        settings,
        sessionUserName: "lokesh",
        demoPrincipalName: "Dr. Alistair Vance",
        apiMode: true,
      }),
    ).toBe("lokesh");
  });
});
