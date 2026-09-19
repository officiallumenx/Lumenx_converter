import { describe, expect, it } from "vitest";
import { maskIsoDateTyping, parseFlexibleDateInput } from "@lumenx/ui-admin";

describe("maskIsoDateTyping", () => {
  it("inserts dashes after year and month", () => {
    expect(maskIsoDateTyping("2011")).toBe("2011");
    expect(maskIsoDateTyping("201108")).toBe("2011-08");
    expect(maskIsoDateTyping("20110817")).toBe("2011-08-17");
  });

  it("strips non-digits and caps at 8 digits", () => {
    expect(maskIsoDateTyping("2011-08-17")).toBe("2011-08-17");
    expect(maskIsoDateTyping("2011081799")).toBe("2011-08-17");
  });
});

describe("parseFlexibleDateInput", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(parseFlexibleDateInput("2011-08-17")).toBe("2011-08-17");
  });

  it("rejects invalid calendar dates", () => {
    expect(parseFlexibleDateInput("2011-02-31")).toBeNull();
  });
});
