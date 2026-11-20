import { describe, expect, it } from "vitest";
import {
  buildGenerationKey,
  classifyAllocateRpcError,
  documentNumberYear,
  extractClassSection,
  extractGenerationKey,
  formatDocumentNumber,
  isPreservableDocumentNumber,
  isUniqueNumberConflict,
  isValidGenerationKey,
  nextSequenceFromNumbers,
  parseDocumentNumber,
  resolvePreservedDocumentNumber,
} from "./numbering.js";

describe("document numbering", () => {
  it("formats and parses DOC/{year}/{seq}", () => {
    expect(formatDocumentNumber(2026, 7)).toBe("DOC/2026/0007");
    expect(parseDocumentNumber("DOC/2026/0007")).toEqual({
      year: 2026,
      sequence: 7,
    });
    expect(parseDocumentNumber("doc/2026/0007")).toEqual({
      year: 2026,
      sequence: 7,
    });
    expect(parseDocumentNumber("CERT/2026/0001")).toBeNull();
  });

  it("continues from the highest reserved sequence for the year (incl. soft-delete inputs)", () => {
    expect(
      nextSequenceFromNumbers(
        ["DOC/2026/0001", "DOC/2025/0099", "DOC/2026/0012", null, "custom"],
        2026,
      ),
    ).toBe(13);
  });

  it("starts at 1 when no numbers exist for the year", () => {
    expect(nextSequenceFromNumbers([], 2026)).toBe(1);
    expect(nextSequenceFromNumbers(["DOC/2025/0005"], 2026)).toBe(1);
  });

  it("uses UTC year for allocation", () => {
    expect(documentNumberYear(new Date("2026-01-01T00:00:00.000Z"))).toBe(2026);
  });

  it("validates generation keys for draft idempotency", () => {
    const key = buildGenerationKey({
      batchId: "11111111-1111-4111-8111-111111111111",
      templateId: "22222222-2222-4222-8222-222222222222",
      studentId: "33333333-3333-4333-8333-333333333333",
    });
    expect(isValidGenerationKey(key)).toBe(true);
    expect(isValidGenerationKey("short")).toBe(false);
    expect(isValidGenerationKey("bad key with spaces!!!!")).toBe(false);
  });

  it("extracts generationKey and class/section from payload", () => {
    const key = buildGenerationKey({
      batchId: "batch-aaaaaaaa",
      templateId: "tpl-bbbbbbbb",
      studentId: "stu-cccccccc",
    });
    expect(
      extractGenerationKey({
        generationKey: key,
        classLabel: "10",
        sectionLabel: "A",
      }),
    ).toBe(key);
    expect(extractClassSection({ classLabel: "10", sectionLabel: "A" })).toEqual({
      classLabel: "10",
      sectionLabel: "A",
    });
  });

  it("detects unique-number conflict messages for publish retry", () => {
    expect(
      isUniqueNumberConflict(
        'duplicate key value violates unique constraint "generated_document_institute_number_uidx"',
      ),
    ).toBe(true);
    expect(isUniqueNumberConflict("network timeout")).toBe(false);
  });
});

describe("resolvePreservedDocumentNumber / legacy validation", () => {
  it("returns null for empty values so caller allocates", () => {
    expect(resolvePreservedDocumentNumber(null)).toBeNull();
    expect(resolvePreservedDocumentNumber(undefined)).toBeNull();
    expect(resolvePreservedDocumentNumber("")).toBeNull();
    expect(resolvePreservedDocumentNumber("   ")).toBeNull();
  });

  it("preserves valid DOC/{year}/{seq} and normalizes padding", () => {
    expect(resolvePreservedDocumentNumber("DOC/2026/0001")).toBe("DOC/2026/0001");
    expect(resolvePreservedDocumentNumber("doc/2026/42")).toBe("DOC/2026/0042");
    expect(isPreservableDocumentNumber("DOC/2026/0001")).toBe(true);
  });

  it("preserves a different calendar year within supported bounds (legacy keep)", () => {
    // Historical stamp year need not match the current UTC year.
    expect(resolvePreservedDocumentNumber("DOC/2025/0009")).toBe("DOC/2025/0009");
  });

  it("rejects wrong-year (out of supported range) without renumbering", () => {
    expect(() => resolvePreservedDocumentNumber("DOC/1999/0001")).toThrow(
      /out of range/i,
    );
    expect(() => resolvePreservedDocumentNumber("DOC/2101/0001")).toThrow(
      /out of range/i,
    );
    expect(isPreservableDocumentNumber("DOC/1999/0001")).toBe(false);
  });

  it("rejects malformed values with an actionable error", () => {
    expect(() => resolvePreservedDocumentNumber("CERT-1")).toThrow(/Expected DOC\//);
    expect(() => resolvePreservedDocumentNumber("DOC/26/0001")).toThrow(
      /Expected DOC\//,
    );
    expect(() => resolvePreservedDocumentNumber("DOC/2026/")).toThrow(
      /Expected DOC\//,
    );
    expect(() => resolvePreservedDocumentNumber("not-a-number")).toThrow(
      /Expected DOC\//,
    );
  });

  it("republish path reuses the same validated number", () => {
    const existing = "DOC/2026/0042";
    const first = resolvePreservedDocumentNumber(existing);
    const second = resolvePreservedDocumentNumber(first);
    expect(first).toBe("DOC/2026/0042");
    expect(second).toBe(first);
  });
});

describe("classifyAllocateRpcError", () => {
  it("treats confirmed missing-function cases as unavailable", () => {
    expect(
      classifyAllocateRpcError("Could not find the function public.allocate_document_number", "PGRST202"),
    ).toBe("unavailable");
    expect(
      classifyAllocateRpcError('function public.allocate_document_number(uuid, integer) does not exist', "42883"),
    ).toBe("unavailable");
    expect(
      classifyAllocateRpcError("Unsupported mock RPC: allocate_document_number", "PGRST202"),
    ).toBe("unavailable");
  });

  it("treats permission, schema, and unexpected failures as error (fail closed)", () => {
    expect(
      classifyAllocateRpcError("permission denied for function allocate_document_number", "42501"),
    ).toBe("error");
    expect(classifyAllocateRpcError("JWT expired", "PGRST301")).toBe("error");
    expect(classifyAllocateRpcError("connection refused")).toBe("error");
    expect(classifyAllocateRpcError("syntax error in query")).toBe("error");
  });
});
