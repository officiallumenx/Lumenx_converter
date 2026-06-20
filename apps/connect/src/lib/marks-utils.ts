/** Minimum total (/100) required to pass a subject or exam aggregate. */
export const PASS_MARK_THRESHOLD = 33;

export function isPassing(total: number): boolean {
  return total >= PASS_MARK_THRESHOLD;
}

export function passFailLabel(total: number): "Pass" | "Fail" {
  return isPassing(total) ? "Pass" : "Fail";
}

export function countPassFail(marks: { total: number }[]): { passed: number; failed: number } {
  const passed = marks.filter((m) => isPassing(m.total)).length;
  return { passed, failed: marks.length - passed };
}
