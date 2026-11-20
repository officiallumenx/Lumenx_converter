import { describe, expect, it } from "vitest";
import { resolveModuleHelpKeyFromPath } from "@lumenx/module-help";
import {
  MODULE_HELP_REQUIRED_IDS,
  getModuleHelp,
  normalizeModuleHelpKey,
} from "./registry";

describe("connect module-help registry", () => {
  it("has complete content for every required id", () => {
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const help = getModuleHelp(id);
      expect(help, id).toBeTruthy();
      expect(help?.id).toBe(id);
      expect(help?.title.trim().length).toBeGreaterThan(0);
      expect(help?.whatIs.trim().length).toBeGreaterThan(20);
      expect(help?.whatYouCanDo.length).toBeGreaterThanOrEqual(2);
      expect(help?.howToUse.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts path-like keys", () => {
    expect(getModuleHelp("/messages")?.id).toBe("messages");
    expect(normalizeModuleHelpKey("/attendance")).toBe("attendance");
  });

  it("resolves nav paths to registry keys", () => {
    const cases: Array<[string, string]> = [
      ["/", "home"],
      ["/attendance", "attendance"],
      ["/activity", "activity"],
      ["/activity/sports", "activity-sports"],
      ["/profile", "profile"],
    ];
    for (const [path, key] of cases) {
      expect(resolveModuleHelpKeyFromPath(path, getModuleHelp)).toBe(key);
    }
  });
});
