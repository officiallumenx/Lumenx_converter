/** Normalize stop ids from API/roster — never treat "" as a valid id. */
export function normalizeStopId(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || undefined;
}

export const STOP_NOT_ASSIGNED_REASON =
  "Stop not assigned — open Route Setup to assign a pickup stop, or wait for Admin approval.";
