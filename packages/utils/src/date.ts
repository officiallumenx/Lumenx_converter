/** Local-calendar date helpers (avoid UTC shift from `toISOString()`). */

/** Local calendar date as YYYY-MM-DD. */
export function toLocalIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today in local calendar as YYYY-MM-DD. */
export function todayLocalIso(now = new Date()): string {
  return toLocalIsoDate(now);
}

/** Add calendar days to a YYYY-MM-DD local date. */
export function addLocalDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  dt.setDate(dt.getDate() + delta);
  return toLocalIsoDate(dt);
}

/** UTC calendar date as YYYY-MM-DD (`toISOString` slice). */
export function todayUtcIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * ISO date → en-IN display with weekday.
 * Treats empty / "TBD" as "TBD". Uses noon local to avoid DST edge flips.
 */
export function formatDisplayDate(iso: string): string {
  if (!iso || iso === "TBD") return "TBD";
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** ISO date → en-IN month + year (e.g. "June 2026"). */
export function formatMonthYear(iso: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Date → en-IN datetime with 12h clock. */
export function formatDateTimeEnIn(value: Date): string {
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Infer academic year label from ISO date (April start).
 * Example: 2026-05-01 → "2026–27"
 */
export function inferAcademicYearLabel(dateIso: string): string {
  const year = Number(dateIso.slice(0, 4));
  const month = Number(dateIso.slice(5, 7));
  if (month >= 4) return `${year}–${String(year + 1).slice(-2)}`;
  return `${year - 1}–${String(year).slice(-2)}`;
}
