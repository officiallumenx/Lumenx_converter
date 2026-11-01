import { describe, expect, it } from "vitest";
import { normalizeStopId } from "./stop-id";

describe("normalizeStopId", () => {
  it("returns undefined for null, undefined, and blank", () => {
    expect(normalizeStopId(null)).toBeUndefined();
    expect(normalizeStopId(undefined)).toBeUndefined();
    expect(normalizeStopId("")).toBeUndefined();
    expect(normalizeStopId("   ")).toBeUndefined();
  });

  it("trims valid ids", () => {
    expect(normalizeStopId(" stop-1 ")).toBe("stop-1");
  });
});
