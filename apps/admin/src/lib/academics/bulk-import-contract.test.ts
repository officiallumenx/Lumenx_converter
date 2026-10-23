import { describe, expect, it } from "vitest";
import {
  bulkImportFieldsFor,
  requiredColumns,
  teacherContractMatchesParser,
} from "./bulk-import-contract";

describe("academics bulk import contracts", () => {
  it("keeps teacher columns locked to the live Excel parser", () => {
    expect(teacherContractMatchesParser()).toBe(true);
    expect(requiredColumns("teachers")).toEqual(
      expect.arrayContaining(["display_name", "phone"]),
    );
    expect(requiredColumns("teachers")).not.toContain("full_name");
  });

  it("documents class/section/subject columns from create APIs", () => {
    expect(bulkImportFieldsFor("classes").some((f) => f.column === "code")).toBe(
      true,
    );
    expect(requiredColumns("sections")).toEqual(
      expect.arrayContaining(["class_code", "name", "code"]),
    );
    expect(requiredColumns("subjects")).toEqual(
      expect.arrayContaining(["name", "code"]),
    );
    expect(bulkImportFieldsFor("subjects").some((f) => f.column === "capacity")).toBe(
      true,
    );
  });
});
