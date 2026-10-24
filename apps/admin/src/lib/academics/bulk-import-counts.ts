/**
 * Keep import toast counts honest when an outer failure interrupts a row loop.
 */

export function remainingFailedAfterOuterError(opts: {
  totalRows: number;
  created: number;
  failed: number;
}): number {
  const remaining = opts.totalRows - opts.created - opts.failed;
  return remaining > 0 ? remaining : 0;
}
