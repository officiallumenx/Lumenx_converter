/**
 * Pure birthday matching for the admin home widget.
 * Matches on month + day only (year ignored).
 */

import { normalizeDateOnlyInput } from "@/lib/date-only";

export type BirthdayRole = "Student" | "Teacher";

export type BirthdayRow = {
  id: string;
  name: string;
  role: BirthdayRole;
  detail: string;
  turningAge: number | null;
  href: string | null;
  photoAssetPath: string | null;
  /** Best available phone for WhatsApp wish (teacher phone / student emergency). */
  phone: string | null;
};

/** Local calendar YYYY-MM-DD (not UTC). */
export function localYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type MonthDay = { month: number; day: number };

function validMonthDay(month: number, day: number): MonthDay | null {
  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  return { month, day };
}

/**
 * Extract month + day from any common DOB wire value.
 * Year is parsed when present but never used for "is today" matching.
 */
export function extractMonthDay(
  dateOfBirth: string | number | Date | null | undefined,
): MonthDay | null {
  if (dateOfBirth == null || dateOfBirth === "") return null;

  if (dateOfBirth instanceof Date) {
    if (Number.isNaN(dateOfBirth.getTime())) return null;
    return validMonthDay(dateOfBirth.getMonth() + 1, dateOfBirth.getDate());
  }

  if (typeof dateOfBirth === "number") {
    const normalized = normalizeDateOnlyInput(String(dateOfBirth));
    if (!normalized) return null;
    const [, m, d] = normalized.split("-").map(Number);
    return validMonthDay(m!, d!);
  }

  const trimmed = String(dateOfBirth).trim();
  if (!trimmed) return null;

  // Pure calendar date — use month/day digits as-is (no timezone shift).
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnly) {
    return validMonthDay(Number(dateOnly[2]), Number(dateOnly[3]));
  }

  // ISO datetime — prefer local calendar day (handles IST midnight shift).
  if (/^\d{4}-\d{2}-\d{2}[T\s]/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return validMonthDay(parsed.getMonth() + 1, parsed.getDate());
    }
    const prefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (prefix) return validMonthDay(Number(prefix[2]), Number(prefix[3]));
  }

  // DMY / MDY slash forms — India-first (DD/MM) when ambiguous.
  const slash = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(trimmed);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    if (a > 12) return validMonthDay(b, a);
    if (b > 12) return validMonthDay(a, b);
    return validMonthDay(b, a); // DD/MM
  }

  const normalized = normalizeDateOnlyInput(trimmed);
  if (normalized) {
    const [, m, d] = normalized.split("-").map(Number);
    return validMonthDay(m!, d!);
  }

  return null;
}

/** @deprecated Prefer extractMonthDay — kept for call sites/tests. */
export function parseDobParts(
  dateOfBirth: string | null | undefined,
): { year: number; month: number; day: number } | null {
  if (dateOfBirth == null) return null;
  const trimmed = String(dateOfBirth).trim();
  if (!trimmed) return null;
  const md = extractMonthDay(trimmed);
  if (!md) return null;
  const iso = /^(\d{4})/.exec(trimmed);
  const year = iso ? Number(iso[1]) : 0;
  return { year, month: md.month, day: md.day };
}

/** True when DOB month-day matches the given calendar day (year ignored). */
export function isBirthdayOnDate(
  dateOfBirth: string | number | Date | null | undefined,
  onDate: Date = new Date(),
): boolean {
  const md = extractMonthDay(dateOfBirth);
  if (!md) return false;
  return md.month === onDate.getMonth() + 1 && md.day === onDate.getDate();
}

export function turningAgeOnDate(
  dateOfBirth: string,
  onDate: Date = new Date(),
): number | null {
  const trimmed = String(dateOfBirth).trim();
  const yearMatch = /^(\d{4})/.exec(trimmed);
  if (!yearMatch) {
    const normalized = normalizeDateOnlyInput(trimmed);
    if (!normalized) return null;
    const birthYear = Number(normalized.slice(0, 4));
    if (!birthYear) return null;
    return onDate.getFullYear() - birthYear;
  }
  const birthYear = Number(yearMatch[1]);
  if (!birthYear) return null;
  return onDate.getFullYear() - birthYear;
}

function readDob(row: Record<string, unknown>): unknown {
  return row.dateOfBirth ?? row.date_of_birth ?? null;
}

function readName(row: Record<string, unknown>): string {
  const value =
    row.displayName ?? row.display_name ?? row.name ?? "";
  const name = String(value).trim();
  return name || "Unknown";
}

function readPhoto(row: Record<string, unknown>): string | null {
  const value = row.photoAssetPath ?? row.photo_asset_path ?? null;
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function readPhone(row: Record<string, unknown>): string | null {
  const candidates = [
    row.phone,
    row.parentPhone,
    row.parent_phone,
    row.emergencyContact,
    row.emergency_contact,
    row.mobile,
    row.mobileNumber,
    row.mobile_number,
  ];
  for (const value of candidates) {
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function collectBirthdaysToday(input: {
  students: Array<Record<string, unknown>>;
  teachers: Array<Record<string, unknown>>;
  onDate?: Date;
}): BirthdayRow[] {
  const onDate = input.onDate ?? new Date();
  const rows: BirthdayRow[] = [];

  for (const s of input.students) {
    const dob = readDob(s);
    if (!isBirthdayOnDate(dob as string | null, onDate)) continue;
    const dobStr = dob == null ? "" : String(dob);
    const classLabel = s.classLabel ?? s.class_label ?? null;
    const sectionLabel = s.sectionLabel ?? s.section_label ?? null;
    const classPart =
      [classLabel, sectionLabel].filter((v) => v != null && String(v).trim()).join(" · ") ||
      "Student";
    rows.push({
      id: String(s.id ?? ""),
      name: readName(s) === "Unknown" ? "Student" : readName(s),
      role: "Student",
      detail: classPart,
      turningAge: dobStr ? turningAgeOnDate(dobStr, onDate) : null,
      href: s.id ? `/students/${String(s.id)}` : null,
      photoAssetPath: readPhoto(s),
      phone: readPhone(s),
    });
  }

  for (const t of input.teachers) {
    const dob = readDob(t);
    if (!isBirthdayOnDate(dob as string | null, onDate)) continue;
    const dobStr = dob == null ? "" : String(dob);
    const department = String(t.department ?? t.dept ?? "").trim() || "Teacher";
    const name = readName(t);
    rows.push({
      id: String(t.id ?? ""),
      name: name === "Unknown" ? "Teacher" : name,
      role: "Teacher",
      detail: department,
      turningAge: dobStr ? turningAgeOnDate(dobStr, onDate) : null,
      href: "/teachers",
      photoAssetPath: readPhoto(t),
      phone: readPhone(t),
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows.filter((r) => Boolean(r.id));
}
