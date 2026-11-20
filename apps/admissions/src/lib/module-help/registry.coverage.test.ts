import { describe, expect, it } from "vitest";
import { resolveModuleHelpKeyFromPath } from "@lumenx/module-help";
import { MODULE_HELP_REQUIRED_IDS, getModuleHelp } from "./registry";

describe("admissions module-help registry", () => {
  it("has complete content for every required id", () => {
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const help = getModuleHelp(id);
      expect(help, id).toBeTruthy();
      expect(help?.whatIs.trim().length).toBeGreaterThan(20);
      expect(help?.whatYouCanDo.length).toBeGreaterThanOrEqual(2);
      expect(help?.howToUse.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("resolves admissions routes", () => {
    expect(resolveModuleHelpKeyFromPath("/", getModuleHelp)).toBe("home");
    expect(resolveModuleHelpKeyFromPath("/institutes", getModuleHelp)).toBe("institutes");
    expect(resolveModuleHelpKeyFromPath("/institute/applications", getModuleHelp)).toBe(
      "institute-applications",
    );
    expect(resolveModuleHelpKeyFromPath("/faq", getModuleHelp)).toBe("faq");
  });
});
