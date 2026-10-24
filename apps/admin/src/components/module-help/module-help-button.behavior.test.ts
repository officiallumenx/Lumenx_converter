import { describe, expect, it } from "vitest";
import { getModuleHelp } from "@/lib/module-help/registry";

describe("module help modal content contract", () => {
  it("send help documents category-specific announcement vs alert paths", () => {
    const help = getModuleHelp("send");
    expect(help).toBeTruthy();
    const blob =
      `${help!.whatIs} ${help!.whatYouCanDo.join(" ")} ${help!.howToUse.join(" ")}`.toLowerCase();
    expect(blob).toMatch(/announcement/);
    expect(blob).toMatch(/alert/);
    expect(blob).toMatch(/category/);
  });

  it("notifications help points compose to Send", () => {
    const help = getModuleHelp("notifications");
    expect(help).toBeTruthy();
    const blob = `${help!.whatIs} ${help!.howToUse.join(" ")}`.toLowerCase();
    expect(blob).toMatch(/send|inbox|notification/);
  });

  it("normalizes path keys to bare ids", () => {
    expect(getModuleHelp("/messages")?.id).toBe(getModuleHelp("messages")?.id);
  });
});
