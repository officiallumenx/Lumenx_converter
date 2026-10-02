/**
 * Pure birthday matching for the admin home widget.
 * Uses date_of_birth from students/teachers — no demo wish workflow.
 */

export type BirthdayRole = "Student" | "Teacher";

export type BirthdayRow = {
  id: string;
  name: string;
  role: BirthdayRole;
  detail: string;
  turningAge: number | null;
  href: string | null;
  photoAssetPath: string | null;
};

/** Local calendar YYYY-MM-DD (not UTC). */
export function localYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

type ParsedDob = { year: number; month: number; day: number };

/** Accept ISO YYYY-MM-DD (optionally with time) and common DMY forms. */
export function parseDobParts(dateOfBirth: string | null | undefined): ParsedDob | null {
  if (!dateOfBirth || typeof dateOfBirth !== "string") return null;
  const trimmed = dateOfBirth.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  return null;
}

/** True when DOB month-day matches the given calendar day (year ignored). */
export function isBirthdayOnDate(
  dateOfBirth: string | null | undefined,
  onDate: Date = new Date(),
): boolean {
  const dob = parseDobParts(dateOfBirth);
  if (!dob) return false;
  return dob.month === onDate.getMonth() + 1 && dob.day === onDate.getDate();
}

export function turningAgeOnDate(
  dateOfBirth: string,
  onDate: Date = new Date(),
): number | null {
  const dob = parseDobParts(dateOfBirth);
  if (!dob?.year) return null;
  return onDate.getFullYear() - dob.year;
}

export function collectBirthdaysToday(input: {
  students: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    classLabel: string | null;
    sectionLabel: string | null;
    photoAssetPath?: string | null;
  }>;
  teachers: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    department: string;
    photoAssetPath?: string | null;
  }>;
  onDate?: Date;
}): BirthdayRow[] {
  const onDate = input.onDate ?? new Date();
  const rows: BirthdayRow[] = [];

  for (const s of input.students) {
    if (!isBirthdayOnDate(s.dateOfBirth, onDate) || !s.dateOfBirth) continue;
    const classPart = [s.classLabel, s.sectionLabel].filter(Boolean).join(" · ") || "Student";
    rows.push({
      id: s.id,
      name: s.displayName,
      role: "Student",
      detail: classPart,
      turningAge: turningAgeOnDate(s.dateOfBirth, onDate),
      href: `/students/${s.id}`,
      photoAssetPath: s.photoAssetPath?.trim() || null,
    });
  }

  for (const t of input.teachers) {
    if (!isBirthdayOnDate(t.dateOfBirth, onDate) || !t.dateOfBirth) continue;
    rows.push({
      id: t.id,
      name: t.displayName,
      role: "Teacher",
      detail: t.department || "Teacher",
      turningAge: turningAgeOnDate(t.dateOfBirth, onDate),
      href: "/teachers",
      photoAssetPath: t.photoAssetPath?.trim() || null,
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
