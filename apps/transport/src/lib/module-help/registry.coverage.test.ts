import { describe, expect, it } from "vitest";
import { resolveModuleHelpKeyFromPath } from "@lumenx/module-help";
import {
  MODULE_HELP_REQUIRED_IDS,
  getModuleHelp,
} from "./registry";

describe("transport module-help registry", () => {
  it("has complete content for every required id", () => {
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const help = getModuleHelp(id);
      expect(help, id).toBeTruthy();
      expect(help?.whatIs.trim().length).toBeGreaterThan(20);
      expect(help?.whatYouCanDo.length).toBeGreaterThanOrEqual(2);
      expect(help?.howToUse.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("resolves transport routes", () => {
    expect(resolveModuleHelpKeyFromPath("/", getModuleHelp)).toBe("home");
    expect(resolveModuleHelpKeyFromPath("/attendance", getModuleHelp)).toBe("attendance");
    expect(resolveModuleHelpKeyFromPath("/more/bus-information", getModuleHelp)).toBe(
      "bus-information",
    );
    expect(resolveModuleHelpKeyFromPath("/notifications", getModuleHelp)).toBe("alerts");
  });
});
