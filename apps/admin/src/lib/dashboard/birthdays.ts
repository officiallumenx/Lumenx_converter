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
};

/** Local calendar YYYY-MM-DD (not UTC). */
export function localYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when DOB month-day matches the given calendar day (year ignored). */
export function isBirthdayOnDate(
  dateOfBirth: string | null | undefined,
  onDate: Date = new Date(),
): boolean {
  if (!dateOfBirth || typeof dateOfBirth !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth.trim());
  if (!match) return false;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!month || !day) return false;
  return month === onDate.getMonth() + 1 && day === onDate.getDate();
}

export function turningAgeOnDate(
  dateOfBirth: string,
  onDate: Date = new Date(),
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth.trim());
  if (!match) return null;
  const birthYear = Number(match[1]);
  if (!birthYear) return null;
  return onDate.getFullYear() - birthYear;
}

export function collectBirthdaysToday(input: {
  students: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    classLabel: string | null;
    sectionLabel: string | null;
  }>;
  teachers: Array<{
    id: string;
    displayName: string;
    dateOfBirth: string | null;
    department: string;
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
    });
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
