import { describe, expect, it } from "vitest";
import {
  buildClassSiblingMap,
  classIdentityKey,
  siblingClassIds,
} from "./class-siblings.js";

describe("fees class-siblings", () => {
  it("normalizes Grade / Class / bare number to the same key", () => {
    expect(classIdentityKey("Grade 8")).toBe("8");
    expect(classIdentityKey("Class 8")).toBe("8");
    expect(classIdentityKey("8")).toBe("8");
  });

  it("maps sibling uuids that share a label", () => {
    const map = buildClassSiblingMap([
      { id: "a", name: "Grade 8" },
      { id: "b", name: "Class 8" },
      { id: "c", name: "Class 9" },
    ]);
    expect(siblingClassIds(map, "a").sort()).toEqual(["a", "b"]);
    expect(siblingClassIds(map, "b").sort()).toEqual(["a", "b"]);
    expect(siblingClassIds(map, "c")).toEqual(["c"]);
  });
});
