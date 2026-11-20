import { describe, expect, it } from "vitest";
import {
  assertSummaryReflectsPartialFailures,
  emptyBulkImportResult,
  isFullySuccessfulImport,
  previewCommitEligible,
  summarizeBulkImportResult,
} from "./bulk-import-result";

describe("bulk import result counts", () => {
  it("summarizes created/failed/skipped without inventing success", () => {
    const counts = emptyBulkImportResult();
    expect(summarizeBulkImportResult(counts)).toBe("0 created");
    counts.created = 2;
    counts.failed = 1;
    counts.skipped = 1;
    expect(summarizeBulkImportResult(counts)).toBe(
      "2 created · 1 failed · 1 skipped",
    );
  });

  it("never treats partial failure as a fully successful import", () => {
    expect(
      isFullySuccessfulImport({ created: 3, failed: 0, skipped: 0 }),
    ).toBe(true);
    expect(
      isFullySuccessfulImport({ created: 2, failed: 1, skipped: 0 }),
    ).toBe(false);
    expect(
      assertSummaryReflectsPartialFailures({
        created: 2,
        failed: 1,
        skipped: 0,
      }),
    ).toBe(true);
    expect(
      assertSummaryReflectsPartialFailures(
        { created: 2, failed: 1, skipped: 0 },
        "2 created",
      ),
    ).toBe(false);
  });

  it("blocks commit when preview has parse errors or no rows", () => {
    expect(previewCommitEligible({ rowCount: 3, errorCount: 0 })).toBe(true);
    expect(previewCommitEligible({ rowCount: 3, errorCount: 1 })).toBe(false);
    expect(previewCommitEligible({ rowCount: 0, errorCount: 0 })).toBe(false);
  });
});
