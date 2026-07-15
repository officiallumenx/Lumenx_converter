/** Minimum total (/100) required to pass a subject or exam aggregate. */
export const PASS_MARK_THRESHOLD = 33;

export function isPassing(total: number): boolean {
  return total >= PASS_MARK_THRESHOLD;
}

/**
 * Single grading policy for the whole app. Grade bands are aligned with the pass
 * threshold: the lowest passing grade (D) extends down to PASS_MARK_THRESHOLD, and
 * anything below it is F. Keeps pass/fail and letter grades consistent everywhere.
 */
export function gradeFor(total: number): "A+" | "A" | "B+" | "B" | "C" | "D" | "F" {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 70) return "B+";
  if (total >= 60) return "B";
  if (total >= 50) return "C";
  if (total >= PASS_MARK_THRESHOLD) return "D";
  return "F";
}

export function passFailLabel(total: number): "Pass" | "Fail" {
  return isPassing(total) ? "Pass" : "Fail";
}

export function countPassFail(marks: { total: number }[]): { passed: number; failed: number } {
  const passed = marks.filter((m) => isPassing(m.total)).length;
  return { passed, failed: marks.length - passed };
}
