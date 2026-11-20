/**
 * Accumulators for bulk-import commit summaries.
 * Counts must reflect actual create attempts — never claim success without server confirm.
 * Importers are partial-success by design: each row is independent.
 */

export type BulkImportResultCounts = {
  created: number;
  failed: number;
  skipped: number;
};

export function emptyBulkImportResult(): BulkImportResultCounts {
  return { created: 0, failed: 0, skipped: 0 };
}

export function summarizeBulkImportResult(counts: BulkImportResultCounts): string {
  const parts = [`${counts.created} created`];
  if (counts.failed > 0) parts.push(`${counts.failed} failed`);
  if (counts.skipped > 0) parts.push(`${counts.skipped} skipped`);
  return parts.join(" · ");
}

/** True only when every attempted row succeeded (no failures/skips). */
export function isFullySuccessfulImport(counts: BulkImportResultCounts): boolean {
  return counts.created > 0 && counts.failed === 0 && counts.skipped === 0;
}

/**
 * Partial success must never be described as a clean full success string.
 * Call after commit loops so toast copy cannot lie.
 */
export function assertSummaryReflectsPartialFailures(
  counts: BulkImportResultCounts,
  summary: string = summarizeBulkImportResult(counts),
): boolean {
  if (counts.failed > 0 && !/\bfailed\b/i.test(summary)) return false;
  if (counts.skipped > 0 && !/\bskipped\b/i.test(summary)) return false;
  if (counts.failed === 0 && counts.skipped === 0 && counts.created === 0) {
    return summary.includes("0 created");
  }
  return true;
}

/** Preview rows ready to commit only when parse produced zero errors. */
export function previewCommitEligible(opts: {
  rowCount: number;
  errorCount: number;
}): boolean {
  return opts.rowCount > 0 && opts.errorCount === 0;
}
