import { describe, expect, it } from "vitest";
import {
  academicsImportTemplateCsv,
  parseClassImportCsv,
  parseSectionImportCsv,
  parseSubjectImportCsv,
} from "./bulk-import-parse";

describe("academics bulk import parse", () => {
  it("parses a valid class CSV and rejects empty files", () => {
    expect(parseClassImportCsv("").errors[0]).toMatch(/empty/i);
    const ok = parseClassImportCsv(academicsImportTemplateCsv("classes"));
    expect(ok.errors).toEqual([]);
    expect(ok.rows).toHaveLength(1);
    expect(ok.rows[0]?.code).toBe("G6");
  });

  it("rejects missing class columns and bad sort_order", () => {
    const missing = parseClassImportCsv("name\nGrade 6\n");
    expect(missing.errors.some((e) => e.includes("code"))).toBe(true);

    const badSort = parseClassImportCsv(
      "name,code,sort_order\nGrade 6,G6,not-a-number\n",
    );
    expect(badSort.errors.some((e) => e.includes("sort_order"))).toBe(true);

    const negativeSort = parseClassImportCsv(
      "name,code,sort_order\nGrade 6,G6,-1\n",
    );
    expect(negativeSort.errors.some((e) => e.includes("nonnegative"))).toBe(
      true,
    );
  });

  it("rejects duplicate class codes in the same file", () => {
    const result = parseClassImportCsv(
      "name,code\nGrade 6,G6\nGrade 6B,G6\n",
    );
    expect(result.errors.some((e) => e.includes("duplicate class code"))).toBe(
      true,
    );
  });

  it("validates section class_code against catalog (fail closed when empty)", () => {
    const csv = academicsImportTemplateCsv("sections");
    const emptyCatalog = parseSectionImportCsv(csv, { classCodes: [] });
    expect(emptyCatalog.errors.some((e) => e.includes("catalog is empty"))).toBe(
      true,
    );

    const unknown = parseSectionImportCsv(csv, { classCodes: ["G7"] });
    expect(unknown.errors.some((e) => e.includes("class_code"))).toBe(true);

    const ok = parseSectionImportCsv(csv, { classCodes: ["G6"] });
    expect(ok.errors).toEqual([]);
    expect(ok.rows[0]?.classCode).toBe("G6");
  });

  it("parses subjects and flags duplicate codes / bad capacity", () => {
    const ok = parseSubjectImportCsv(academicsImportTemplateCsv("subjects"));
    expect(ok.errors).toEqual([]);
    expect(ok.rows[0]?.capacity).toBe("40");

    const dup = parseSubjectImportCsv(
      "name,code,capacity\nMath,MATH,10\nAlgebra,MATH,5\n",
    );
    expect(dup.errors.some((e) => e.includes("duplicate"))).toBe(true);

    const badCap = parseSubjectImportCsv("name,code,capacity\nMath,MATH,-1\n");
    expect(badCap.errors.some((e) => e.includes("capacity"))).toBe(true);
  });

  it("rejects missing required subject headers", () => {
    const result = parseSubjectImportCsv("name\nMath\n");
    expect(result.errors.some((e) => e.includes("code"))).toBe(true);
  });

  it("ignores extra unknown columns without inventing field mappings", () => {
    const result = parseClassImportCsv(
      "name,code,extra_ignored\nGrade 6,G6,should-not-map\n",
    );
    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ name: "Grade 6", code: "G6" });
  });

  it("rejects section rows with missing required values", () => {
    const result = parseSectionImportCsv(
      "class_code,name,code\n,A,A\n",
      { classCodes: ["G6"] },
    );
    expect(result.errors.some((e) => e.includes("class_code is required"))).toBe(
      true,
    );
  });

  it("rejects duplicate section codes for the same class_code in file", () => {
    const result = parseSectionImportCsv(
      "class_code,name,code\nG6,A,A\nG6,A-dup,A\n",
      { classCodes: ["G6"] },
    );
    expect(result.errors.some((e) => e.includes("duplicate section"))).toBe(
      true,
    );
  });
});
