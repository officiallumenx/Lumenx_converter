import { parseTransportTimestampMs } from "@lumenx/utils";

/** Authoritative default fallback timezone for educational transport operations. */
export const DEFAULT_TRANSPORT_TIMEZONE = "Asia/Kolkata";

/**
 * Validates and resolves an IANA timezone identifier.
 * Falls back to DEFAULT_TRANSPORT_TIMEZONE if missing, empty, or invalid.
 */
export function resolveTransportTimeZone(timeZone?: string | null): string {
  const candidate = timeZone?.trim();
  if (!candidate) return DEFAULT_TRANSPORT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TRANSPORT_TIMEZONE;
  }
}

/**
 * Parses an ISO timestamp, DB timestamp, or epoch into a Date object representing UTC.
 * Normalizes missing timezone offsets to UTC according to the API contract.
 */
export function parseTransportInstant(
  iso: string | number | Date | null | undefined,
): Date | null {
  const ms = parseTransportTimestampMs(iso);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

/**
 * Format an ISO boarding/drop/cutoff timestamp for learner Transport UI.
 * Defaults to the institute timezone (fallback "Asia/Kolkata") to avoid host device skew.
 */
export function formatTransportInstant(
  iso: string | null | undefined,
  options?: { timeZone?: string; locale?: string },
): string | null {
  if (!iso?.trim()) return null;
  const date = parseTransportInstant(iso);
  if (!date) return null;
  const timeZone = resolveTransportTimeZone(options?.timeZone);
  const locale = options?.locale ?? "en-US";
  try {
    return date.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    try {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: DEFAULT_TRANSPORT_TIMEZONE,
      });
    } catch {
      return null;
    }
  }
}

/**
 * Extracts YYYY-MM-DD service date in the given timezone.
 */
function getServiceDateInTimeZone(date: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const d = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${d}`;
  }
}

/**
 * Format a trip date or ISO timestamp into a localized date string.
 * Supports relative output ("Today", "Yesterday") when relative option is true.
 * Pure YYYY-MM-DD strings are immune to UTC midnight day-shift bugs.
 */
export function formatTransportDate(
  dateOrIso: string | Date | null | undefined,
  options?: { timeZone?: string; locale?: string; relative?: boolean },
): string | null {
  if (!dateOrIso) return null;
  const timeZone = resolveTransportTimeZone(options?.timeZone);
  const locale = options?.locale ?? "en-US";

  let dateStr: string;
  let targetDate: Date;
  let isDateOnly = false;

  if (typeof dateOrIso === "string") {
    const trimmed = dateOrIso.trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      dateStr = trimmed;
      isDateOnly = true;
      const [year, month, day] = trimmed.split("-").map(Number);
      if (!year || !month || !day) return null;
      targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      const parsed = parseTransportInstant(trimmed);
      if (!parsed) return null;
      targetDate = parsed;
      dateStr = getServiceDateInTimeZone(targetDate, timeZone);
    }
  } else if (dateOrIso instanceof Date) {
    if (Number.isNaN(dateOrIso.getTime())) return null;
    targetDate = dateOrIso;
    dateStr = getServiceDateInTimeZone(targetDate, timeZone);
  } else {
    return null;
  }

  if (options?.relative) {
    const now = new Date();
    const todayStr = getServiceDateInTimeZone(now, timeZone);
    if (dateStr === todayStr) {
      return "Today";
    }

    // Determine yesterday in timeZone
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getServiceDateInTimeZone(yesterdayDate, timeZone);
    if (dateStr === yesterdayStr) {
      return "Yesterday";
    }
  }

  try {
    return targetDate.toLocaleDateString(locale, {
      timeZone: isDateOnly ? "UTC" : timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats both date and time (e.g. "Nov 9, 2026, 8:02 AM").
 */
export function formatTransportDateTime(
  iso: string | null | undefined,
  options?: { timeZone?: string; locale?: string },
): string | null {
  if (!iso?.trim()) return null;
  const date = parseTransportInstant(iso);
  if (!date) return null;
  const timeZone = resolveTransportTimeZone(options?.timeZone);
  const locale = options?.locale ?? "en-US";
  try {
    return date.toLocaleString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return null;
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
