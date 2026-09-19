import { describe, expect, it } from "vitest";
import {
  capitalizeClassName,
  capitalizeSectionName,
  classCodeFromName,
  classIdentityKey,
  classSectionExists,
  classSortRank,
  classesReferToSame,
  normalizeSchoolClassName,
  sectionSortRank,
} from "./name-format";

describe("class name-format", () => {
  it("capitalizes class and section names", () => {
    expect(capitalizeClassName("class 8")).toBe("Class 8");
    expect(capitalizeClassName("CLASS 10")).toBe("Class 10");
    expect(capitalizeSectionName("a")).toBe("A");
    expect(capitalizeSectionName("b1")).toBe("B1");
  });

  it("normalizes Grade/Class/bare numbers to Class N", () => {
    expect(normalizeSchoolClassName("8")).toBe("Class 8");
    expect(normalizeSchoolClassName("Grade 8")).toBe("Class 8");
    expect(normalizeSchoolClassName("class 8")).toBe("Class 8");
    expect(normalizeSchoolClassName("CLASS-8")).toBe("Class 8");
    expect(normalizeSchoolClassName("Nursery")).toBe("Nursery");
  });

  it("treats Grade 8 / Class 8 / 8 as the same identity", () => {
    expect(classIdentityKey("Grade 8")).toBe(classIdentityKey("Class 8"));
    expect(classIdentityKey("8")).toBe(classIdentityKey("Class 8"));
    expect(classesReferToSame({ name: "8", code: "8" }, "Class 8", "CLASS-8")).toBe(
      true,
    );
    expect(classesReferToSame({ name: "Class 9", code: "CLASS-9" }, "Class 8")).toBe(
      false,
    );
  });

  it("builds stable class codes", () => {
    expect(classCodeFromName("8")).toBe("CLASS-8");
    expect(classCodeFromName("Grade 10")).toBe("CLASS-10");
  });

  it("ranks classes Class 1…12 by number regardless of label form", () => {
    expect(classSortRank("Class 1")).toBe(1);
    expect(classSortRank("8")).toBe(8);
    expect(classSortRank("Grade 10")).toBe(10);
    expect(classSortRank("CLASS-12")).toBe(12);
    expect(classSortRank("Nursery")).toBeGreaterThan(12);
    expect(classSortRank("Class 2")).toBeLessThan(classSortRank("Class 10"));
  });

  it("ranks sections A before B before C", () => {
    expect(sectionSortRank("A")).toBeLessThan(sectionSortRank("B"));
    expect(sectionSortRank("b")).toBeLessThan(sectionSortRank("C"));
    expect(sectionSortRank("Sec B")).toBe(sectionSortRank("B"));
    expect(sectionSortRank("Section A")).toBeLessThan(sectionSortRank("Sec B"));
  });

  it("detects existing class+section pairs", () => {
    const items = [{ name: "Class 8 · Sec A", section: "A" }];
    expect(classSectionExists(items, "Class 8", "A")).toBe(true);
    expect(classSectionExists(items, "class 8", "a")).toBe(true);
    expect(classSectionExists(items, "8", "A")).toBe(true);
    expect(classSectionExists(items, "Class 9", "A")).toBe(false);
  });
});
