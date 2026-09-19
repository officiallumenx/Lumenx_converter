/**
 * Normalize spreadsheet / form date strings to YYYY-MM-DD for API Zod schemas.
 * Returns null for empty input; throws nothing — callers decide how to handle invalid.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(year: number, month: number, day: number): string | null {
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    year < 1900 ||
    year > 2100 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Excel serial date → YYYY-MM-DD (1900 date system). */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100_000) return null;
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86_400_000;
  const d = new Date(utc);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Coerce common Excel / locale date strings to YYYY-MM-DD.
 * Prefer DD/MM when ambiguous (India-first product).
 */
export function normalizeDateOnlyInput(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const value = String(raw).trim();
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return ymd(y!, m!, d!);
  }

  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value)) {
    const [y, m, d] = value.split("/").map(Number);
    return ymd(y!, m!, d!);
  }

  // Pure Excel serial (or float serial as string)
  if (/^\d{4,5}(\.\d+)?$/.test(value)) {
    const fromSerial = fromExcelSerial(Number(value));
    if (fromSerial) return fromSerial;
  }

  const slash = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (slash) {
    let a = Number(slash[1]);
    let b = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += year >= 70 ? 1900 : 2000;
    let day: number;
    let month: number;
    if (a > 12) {
      day = a;
      month = b;
    } else if (b > 12) {
      month = a;
      day = b;
    } else {
      // Ambiguous — DD/MM (en-IN)
      day = a;
      month = b;
    }
    return ymd(year, month, day);
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return ymd(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return null;
}

/** Empty → null; invalid non-empty → null with `invalid` flag via tuple helper. */
export function coerceOptionalDateOnly(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; raw: string } {
  if (raw == null || !String(raw).trim()) {
    return { ok: true, value: null };
  }
  const normalized = normalizeDateOnlyInput(raw);
  if (!normalized) return { ok: false, raw: String(raw).trim() };
  return { ok: true, value: normalized };
}
