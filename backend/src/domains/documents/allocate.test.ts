import { describe, expect, it, vi } from "vitest";
import { allowDocumentNumberMaxFallback } from "../../config/env.js";
import {
  advanceDocumentNumberSeries,
  classifyAllocateRpcError,
  documentNumberSeedFloor,
  formatDocumentNumber,
  isUniqueNumberConflict,
  nextSequenceFromNumbers,
  resolvePreservedDocumentNumber,
} from "./numbering.js";

/**
 * Allocation strategy:
 * - Prefer allocate_document_number RPC (concurrent-safe after migration).
 * - Max+1 only when RPC is confirmed unavailable AND allowDocumentNumberMaxFallback.
 * - Soft-deleted reserved numbers seed max+1 (no reuse).
 * - Concurrent safety is NOT claimed while fallback is enabled.
 *
 * Series catch-up tests below mirror the SQL proposal in pure TypeScript.
 * They are NOT a substitute for staging Postgres concurrency verification
 * (see docs/proposals/document_number_uniqueness_concurrency_test.sql).
 */
describe("document number allocation strategy", () => {
  it("fallback sequence is deterministic from reserved numbers", () => {
    const year = 2026;
    const reserved = ["DOC/2026/0001", "DOC/2026/0003"];
    const first = nextSequenceFromNumbers(reserved, year);
    expect(formatDocumentNumber(year, first)).toBe("DOC/2026/0004");
    const raced = nextSequenceFromNumbers(reserved, year);
    expect(raced).toBe(first);
  });

  it("soft-deleted reserved numbers still consume sequence (no reuse)", () => {
    const reservedIncludingSoftDeleted = ["DOC/2026/0001", "DOC/2026/0002"];
    expect(nextSequenceFromNumbers(reservedIncludingSoftDeleted, 2026)).toBe(3);
  });

  it("republish / stamped draft preserves existing number (no reallocation)", () => {
    expect(resolvePreservedDocumentNumber("DOC/2026/0042")).toBe("DOC/2026/0042");
  });

  it("empty drafts allocate via max+1 when RPC unavailable", async () => {
    const tryRpc = vi.fn().mockResolvedValue({
      kind: "unavailable" as const,
      message: "Unsupported mock RPC: allocate_document_number",
    });
    const listReserved = vi.fn().mockResolvedValue(["DOC/2026/0009"]);
    const rpc = await tryRpc();
    expect(rpc.kind).toBe("unavailable");
    expect(classifyAllocateRpcError(rpc.message, "PGRST202")).toBe("unavailable");
    const seq = nextSequenceFromNumbers(await listReserved(), 2026);
    expect(formatDocumentNumber(2026, seq)).toBe("DOC/2026/0010");
  });

  it("permission errors are not treated as missing RPC", () => {
    expect(
      classifyAllocateRpcError(
        "permission denied for function allocate_document_number",
        "42501",
      ),
    ).toBe("error");
  });

  it("allowDocumentNumberMaxFallback: explicit flag and non-production default", () => {
    expect(
      allowDocumentNumberMaxFallback({
        NODE_ENV: "production",
        DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK: true,
      } as never),
    ).toBe(true);
    expect(
      allowDocumentNumberMaxFallback({
        NODE_ENV: "production",
        DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK: false,
      } as never),
    ).toBe(false);
    expect(
      allowDocumentNumberMaxFallback({
        NODE_ENV: "production",
        DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK: undefined,
      } as never),
    ).toBe(false);
    expect(
      allowDocumentNumberMaxFallback({
        NODE_ENV: "test",
        DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK: undefined,
      } as never),
    ).toBe(true);
  });

  it("formats sequences wider than four digits without truncation", () => {
    expect(formatDocumentNumber(2026, 10000)).toBe("DOC/2026/10000");
    expect(formatDocumentNumber(2026, 7)).toBe("DOC/2026/0007");
  });
});

describe("advanceDocumentNumberSeries (SQL catch-up model — unit/mock)", () => {
  it("missing series row with existing reserved numbers seeds above max", () => {
    const step = advanceDocumentNumberSeries({
      seriesNextSequence: null,
      reservedSequencesForYear: [1, 2, 12],
    });
    expect(step.issuedSequence).toBe(13);
    expect(step.nextSeriesSequence).toBe(14);
    expect(documentNumberSeedFloor([1, 2, 12])).toBe(13);
  });

  it("series row behind highest reserved number catches up in one step", () => {
    const step = advanceDocumentNumberSeries({
      seriesNextSequence: 3,
      reservedSequencesForYear: [100],
    });
    expect(step.issuedSequence).toBe(101);
    expect(step.nextSeriesSequence).toBe(102);
  });

  it("series row ahead of reserved numbers continues from series", () => {
    const step = advanceDocumentNumberSeries({
      seriesNextSequence: 50,
      reservedSequencesForYear: [10],
    });
    expect(step.issuedSequence).toBe(50);
    expect(step.nextSeriesSequence).toBe(51);
  });

  it("includes soft-deleted reserved sequences in the seed floor", () => {
    // Caller passes soft-deleted sequences in the same reserved list (SQL has no deleted_at filter).
    const step = advanceDocumentNumberSeries({
      seriesNextSequence: 1,
      reservedSequencesForYear: [1, 2],
    });
    expect(step.issuedSequence).toBe(3);
  });

  it("handles reserved sequences wider than four digits", () => {
    const step = advanceDocumentNumberSeries({
      seriesNextSequence: null,
      reservedSequencesForYear: [9999, 10000],
    });
    expect(step.issuedSequence).toBe(10001);
    expect(formatDocumentNumber(2026, step.issuedSequence)).toBe("DOC/2026/10001");
  });

  it("serialized concurrent first allocations (no series row) yield distinct sequences", () => {
    // Models Postgres row-lock serialization of INSERT…ON CONFLICT for the same institute+year.
    // Same reserved snapshot for all callers (numbers not stamped yet).
    const reserved = [5];
    let series: number | null = null;
    const issued: number[] = [];
    for (let i = 0; i < 8; i++) {
      const step = advanceDocumentNumberSeries({
        seriesNextSequence: series,
        reservedSequencesForYear: reserved,
      });
      issued.push(step.issuedSequence);
      series = step.nextSeriesSequence;
    }
    expect(issued).toEqual([6, 7, 8, 9, 10, 11, 12, 13]);
    expect(new Set(issued).size).toBe(issued.length);
  });

  it("serialized concurrent allocations with existing series yield distinct sequences", () => {
    const reserved = [1, 2];
    let series: number | null = 10; // next to issue
    const issued: number[] = [];
    for (let i = 0; i < 5; i++) {
      const step = advanceDocumentNumberSeries({
        seriesNextSequence: series,
        reservedSequencesForYear: reserved,
      });
      issued.push(step.issuedSequence);
      series = step.nextSeriesSequence;
    }
    expect(issued).toEqual([10, 11, 12, 13, 14]);
  });

  it("retry after unique conflict allocates a fresh number above reserved set", () => {
    // App retry: allocateDocumentNumber(..., null) after unique index conflict.
    // Prior attempt's number may now appear in reserved (winner stamped it).
    let series = 6; // was about to issue 6; conflicted
    const reservedAfterConflict = [1, 2, 5, 6];
    expect(isUniqueNumberConflict('duplicate key value violates unique constraint "generated_document_institute_number_uidx"')).toBe(
      true,
    );
    const retry = advanceDocumentNumberSeries({
      seriesNextSequence: series,
      reservedSequencesForYear: reservedAfterConflict,
    });
    expect(retry.issuedSequence).toBe(7);
    // Behind-series + conflict: catch-up still wins in one retry.
    const farBehind = advanceDocumentNumberSeries({
      seriesNextSequence: 2,
      reservedSequencesForYear: [1, 50],
    });
    expect(farBehind.issuedSequence).toBe(51);
  });
});
