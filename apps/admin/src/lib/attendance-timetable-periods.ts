/**
 * Resolve timetable periods for Admin/Coordinator Attendance mark UI.
 * Feeds the one Attendance Engine — never invents placeholder Period 1.
 */

import {
  canonicalAttendanceClassId,
  periodsFromTimetableSlots,
  type PeriodInput,
} from "@lumenx/module-attendance";
import {
  getRecordSchedule,
  type TimetableRecord,
} from "@/lib/timetable-data";
import {
  findTimetableForClass,
  loadTimetableDirectory,
} from "@/lib/timetable-directory-store";
import {
  getActiveDays,
  isSlotApplicable,
} from "@/lib/timetable-schedule";

function weekdayNameFromIso(date: string): string {
  try {
    return new Date(`${date.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
    });
  } catch {
    return "";
  }
}

function findTimetableRecord(
  gradeOrClassLabel: string,
  section: string,
): TimetableRecord | null {
  const sec = section.trim().toUpperCase();
  const exact = findTimetableForClass(gradeOrClassLabel, section.trim());
  if (exact) return exact;
  // Also try uppercase section match / canonical class id vs "Grade 10"
  const want = canonicalAttendanceClassId(gradeOrClassLabel);
  return (
    loadTimetableDirectory().find(
      (row) =>
        canonicalAttendanceClassId(row.grade) === want &&
        row.section.trim().toUpperCase() === sec,
    ) ?? null
  );
}

/**
 * Teaching periods scheduled for this class · section on `date`.
 * Empty array when no timetable / non-teaching day / no filled cells.
 */
export function attendancePeriodsForSectionDate(
  gradeOrClassLabel: string,
  section: string,
  date: string,
): PeriodInput[] {
  const record = findTimetableRecord(gradeOrClassLabel, section);
  if (!record) return [];

  const schedule = getRecordSchedule(record);
  const days = getActiveDays(schedule);
  const dayName = weekdayNameFromIso(date);
  if (!dayName) return [];

  const dayIdx = days.findIndex(
    (d) => d.name.toLowerCase() === dayName.toLowerCase(),
  );
  if (dayIdx < 0) return [];

  const dayCol = record.grid[dayIdx] ?? [];
  const rows: { subject: string; time: string }[] = [];

  schedule.periodRows.forEach((row, periodIdx) => {
    if (!isSlotApplicable(schedule, dayIdx, periodIdx)) return;
    const cell = dayCol[periodIdx];
    if (cell?.subject?.trim()) {
      rows.push({
        subject: cell.subject.trim(),
        time: `${row.start}–${row.end}`,
      });
    }
  });

  // Dense 0..n-1 indexes — same as Connect `periodsFromTimetableSlots`.
  return periodsFromTimetableSlots(rows);
}

const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function formatSlotTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

/**
 * Resolve teaching periods from API timetable slots for period-wise attendance.
 */
export function attendancePeriodsFromTimetableSlots(
  slots: Array<{
    id: string;
    dayOfWeek: number;
    periodIndex: number;
    startsAt: string;
    endsAt: string;
    subjectLabel: string;
    status: string;
  }>,
  date: string,
): Array<{
  index: number;
  subject: string;
  time: string;
  timetableSlotId: string;
  startsAt: string;
  endsAt: string;
  slotCode: string;
  slotLabel: string;
}> {
  const dayName = weekdayNameFromIso(date);
  const dayIdx = DAY_NAMES.findIndex(
    (name) => name.toLowerCase() === dayName.toLowerCase(),
  );
  if (dayIdx < 1) return [];

  const active = slots
    .filter((slot) => slot.status === "active" && slot.dayOfWeek === dayIdx)
    .sort((a, b) => a.periodIndex - b.periodIndex);

  return active.map((slot, denseIndex) => {
    const subject = slot.subjectLabel.trim() || "Period";
    const startsAt = formatSlotTime(slot.startsAt);
    const endsAt = formatSlotTime(slot.endsAt);
    return {
      index: denseIndex,
      subject,
      time: `${startsAt}–${endsAt}`,
      timetableSlotId: slot.id,
      startsAt,
      endsAt,
      slotCode: `slot:period:${denseIndex}`,
      slotLabel: `P${denseIndex + 1} · ${subject}`,
    };
  });
}
