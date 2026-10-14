/**
 * Calendar date helpers for five-year retention eligibility.
 * Uses civil YYYY-MM-DD arithmetic (no timezone shift).
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(value: string, field = "date"): string {
  if (!ISO_DATE.test(value)) {
    throw new Error(`${field} must be YYYY-MM-DD`);
  }
  return value;
}

/** Last calendar day of month (1–12) in UTC year. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Add whole calendar years to a YYYY-MM-DD date.
 * Feb 29 + N years lands on Feb 28 when the target year is not a leap year.
 */
export function addCalendarYears(isoDate: string, years: number): string {
  assertIsoDate(isoDate);
  const [ys, ms, ds] = isoDate.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const targetYear = y + years;
  const day = Math.min(d, daysInMonth(targetYear, m));
  return `${String(targetYear).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Default retention review eligibility: five calendar years after graduation. */
export function reviewEligibleOnFromGraduation(graduatedOn: string): string {
  return addCalendarYears(graduatedOn, 5);
}

export function todayIsoDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
