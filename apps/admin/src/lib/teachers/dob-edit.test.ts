import { describe, expect, it } from "vitest";
import {
  hydrateTeacherDateOfBirthInput,
  resolveTeacherEditDateOfBirth,
} from "./dob-edit";

describe("resolveTeacherEditDateOfBirth", () => {
  it("sends the form value when the date input is filled", () => {
    expect(
      resolveTeacherEditDateOfBirth({
        formValue: "1990-10-02",
        baselineValue: "1985-08-18",
      }),
    ).toBe("1990-10-02");
  });

  it("preserves by omitting date_of_birth when form and baseline are empty", () => {
    expect(
      resolveTeacherEditDateOfBirth({
        formValue: "",
        baselineValue: "",
      }),
    ).toBeUndefined();
    expect(
      resolveTeacherEditDateOfBirth({
        formValue: "   ",
        baselineValue: null,
      }),
    ).toBeUndefined();
  });

  it("treats empty form after a hydrated baseline as an intentional clear", () => {
    expect(
      resolveTeacherEditDateOfBirth({
        formValue: "",
        baselineValue: "1985-08-18",
      }),
    ).toBeNull();
  });

  it("keeps a filled form value even when it matches the baseline", () => {
    expect(
      resolveTeacherEditDateOfBirth({
        formValue: "1985-08-18",
        baselineValue: "1985-08-18",
      }),
    ).toBe("1985-08-18");
  });
});

describe("hydrateTeacherDateOfBirthInput", () => {
  it("normalizes common DOB formats to YYYY-MM-DD for date inputs", () => {
    expect(hydrateTeacherDateOfBirthInput("1985-08-18")).toBe("1985-08-18");
    expect(hydrateTeacherDateOfBirthInput("18/08/1985")).toBe("1985-08-18");
  });

  it("returns empty string for missing DOB", () => {
    expect(hydrateTeacherDateOfBirthInput(null)).toBe("");
    expect(hydrateTeacherDateOfBirthInput(undefined)).toBe("");
    expect(hydrateTeacherDateOfBirthInput("")).toBe("");
  });
});
