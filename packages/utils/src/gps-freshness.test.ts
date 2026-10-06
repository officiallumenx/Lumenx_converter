import { describe, expect, it } from "vitest";
import {
  classifyGpsFreshness,
  formatGpsAgeLabel,
  formatRelativeTransportTime,
  isGpsShownAsLive,
} from "./gps-freshness";

describe("gps-freshness", () => {
  it("never labels stale as live", () => {
    const now = Date.now();
    const stale = new Date(now - 5 * 60_000).toISOString();
    expect(classifyGpsFreshness(stale, now)).toBe("stale");
    expect(isGpsShownAsLive("stale")).toBe(false);
    expect(formatGpsAgeLabel(stale, now)).toMatch(/last updated/i);
  });

  it("formats relative times without calling stale live", () => {
    const now = Date.now();
    expect(formatRelativeTransportTime(new Date(now + 10 * 60_000).toISOString(), now)).toBe(
      "In 10 min",
    );
    expect(formatRelativeTransportTime(new Date(now - 2 * 60_000).toISOString(), now)).toBe(
      "2 min ago",
    );
  });
});
