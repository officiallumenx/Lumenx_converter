/** Format an ISO boarding/drop timestamp for learner Transport UI. */
export function formatTransportInstant(
  iso: string | null | undefined,
  options?: { timeZone?: string; locale?: string },
): string | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date.toLocaleTimeString(options?.locale ?? undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: options?.timeZone,
    });
  } catch {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

/**
 * Label for expected pickup when the API only has institute default HH:MM
 * (not a per-stop schedule).
 */
export function formatExpectedPickupLabel(
  expectedPickupTime: string | null | undefined,
  hasPickupStop: boolean,
): string {
  if (!hasPickupStop) return "Stop not assigned";
  const raw = expectedPickupTime?.trim();
  if (!raw) return "Not scheduled";
  // Institute settings store HH:MM (sometimes HH:MM:SS) — not a stop ETA.
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(raw)) {
    return `Institute default · ${raw.slice(0, 5)}`;
  }
  return raw;
}
