import { describe, expect, it } from "vitest";
import { parseHubView, validateHubViewSearch } from "@/lib/hub-view-search";

describe("hub view search helpers", () => {
  const config = {
    views: ["overview", "details", "settings"] as const,
    defaultView: "overview" as const,
    aliases: {
      legacy: "details",
    } as const,
  };

  it("returns default view for unknown values", () => {
    expect(parseHubView(undefined, config)).toBe("overview");
    expect(parseHubView("missing", config)).toBe("overview");
  });

  it("maps aliases and valid views", () => {
    expect(parseHubView("legacy", config)).toBe("details");
    expect(parseHubView("settings", config)).toBe("settings");
  });

  it("validates search payload consistently", () => {
    expect(validateHubViewSearch({ view: "details" }, config)).toEqual({ view: "details" });
    expect(validateHubViewSearch({ view: "legacy" }, config)).toEqual({ view: "details" });
  });
});
