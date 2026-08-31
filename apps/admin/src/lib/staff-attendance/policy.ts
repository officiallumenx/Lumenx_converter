/** Hours after submit during which attendance may still be edited — mirrors backend. */
export const STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS = 20;

export function canEditSubmittedStaffAttendanceDay(
  submittedAt?: string | null,
  now = Date.now(),
): boolean {
  if (!submittedAt) return false;
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return false;
  const elapsed = now - submittedMs;
  return elapsed >= 0 && elapsed <= STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS * 60 * 60 * 1000;
}

export function staffAttendanceEditWindowRemainingMs(
  submittedAt?: string | null,
  now = Date.now(),
): number {
  if (!submittedAt) return 0;
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return 0;
  const deadline = submittedMs + STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS * 60 * 60 * 1000;
  return Math.max(0, deadline - now);
}
