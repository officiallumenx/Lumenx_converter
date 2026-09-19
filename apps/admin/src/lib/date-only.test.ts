import { describe, expect, it } from "vitest";
import { normalizeDateOnlyInput } from "./date-only";

describe("normalizeDateOnlyInput", () => {
  it("keeps ISO dates", () => {
    expect(normalizeDateOnlyInput("1990-05-12")).toBe("1990-05-12");
  });

  it("parses DD/MM/YYYY and Excel-style slashes", () => {
    expect(normalizeDateOnlyInput("12/05/1990")).toBe("1990-05-12");
    expect(normalizeDateOnlyInput("5/12/90")).toBe("1990-12-05");
  });

  it("parses Excel serial days", () => {
    // 1990-05-12 ≈ serial 33005
    expect(normalizeDateOnlyInput("33005")).toBe("1990-05-12");
  });

  it("returns null for empty / garbage", () => {
    expect(normalizeDateOnlyInput("")).toBeNull();
    expect(normalizeDateOnlyInput("not-a-date")).toBeNull();
  });
});
