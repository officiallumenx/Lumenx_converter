/** Manager-facing readiness, validation, and sanitize helpers for timetables. */

import {
  cellRefKey,
  classKey,
  countEmptySlots,
  countTeachingSlotsPerWeek,
  detectConflicts,
  getRecordSchedule,
  maxPeriodsPerSubjectPerWeek,
  type PlacementPreference,
  type TimetableCellRef,
  type TimetableConflict,
  type TimetableGrid,
  type TimetableRecord,
} from "@/lib/timetable-data";
import {
  countSlotsMatchingPreference,
  getActiveDays,
  isSlotApplicable,
  matchesLunchPreference,
  timesOverlap,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";
import { getSubjectsByGrade } from "@/lib/subjects-data";

export type TimetableReadiness = "incomplete" | "conflicts" | "ready" | "published";

type PlacementValidation = {
  ok: boolean;
  reason?: string;
};

type PublishChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
};

type PublishReadiness = {
  readiness: TimetableReadiness;
  emptySlots: number;
  teachingSlots: number;
  filledSlots: number;
  conflicts: TimetableConflict[];
  teacherConflicts: number;
  roomConflicts: number;
  checklist: PublishChecklistItem[];
  canPublish: boolean;
  blockers: string[];
};

function subjectsForGrade(grade: string) {
  const byGrade = getSubjectsByGrade();
  return byGrade[grade] ?? byGrade["Grade 10"] ?? [];
}

/** Resolve per-week period count from overrides, else catalog default. */
function resolvedPeriodsPerWeek(
  subject: { id: string; periodsPerWeek: number },
  overrides?: Record<string, number>,
): number {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, subject.id)) {
    return Math.max(0, overrides[subject.id] ?? 0);
  }
  return Math.max(0, subject.periodsPerWeek);
}

export function getTimetableReadiness(
  record: TimetableRecord,
  allTimetables: TimetableRecord[],
  precomputedConflicts?: TimetableConflict[],
): TimetableReadiness {
  if (record.status === "published") return "published";
  const report = evaluatePublishReadiness(record, allTimetables, precomputedConflicts);
  if (report.conflicts.length > 0) return "conflicts";
  if (report.emptySlots > 0 || !report.canPublish) return "incomplete";
  return "ready";
}

/** One conflict scan + per-record readiness (avoids N× detectConflicts). */
export function buildTimetableReadinessById(
  timetables: TimetableRecord[],
  allConflicts?: TimetableConflict[],
): Record<string, TimetableReadiness> {
  const conflicts = allConflicts ?? detectConflicts(timetables);
  const map: Record<string, TimetableReadiness> = {};
  for (const timetable of timetables) {
    if (timetable.status === "published") {
      map[timetable.id] = "published";
      continue;
    }
    const classLabel = classKey(timetable.grade, timetable.section);
    const focused = conflicts.filter((c) => c.classes.includes(classLabel));
    map[timetable.id] = getTimetableReadiness(timetable, timetables, focused);
  }
  return map;
}

const READINESS_META: Record<
  TimetableReadiness,
  { tone: "success" | "warning" | "danger" | "info" | "neutral"; label: string }
> = {
  published: { tone: "success", label: "Published" },
  ready: { tone: "info", label: "Ready" },
  conflicts: { tone: "danger", label: "Conflicts" },
  incomplete: { tone: "warning", label: "Incomplete" },
};

export function readinessTone(
  readiness: TimetableReadiness,
): "success" | "warning" | "danger" | "info" | "neutral" {
  return READINESS_META[readiness].tone;
}

export function readinessLabel(readiness: TimetableReadiness): string {
  return READINESS_META[readiness].label;
}

export function sanitizeSubjectSlotSelections(
  selections: Record<string, TimetableCellRef[]>,
  schedule: TimetableScheduleConfig,
  preferences: Record<string, PlacementPreference> = {},
): Record<string, TimetableCellRef[]> {
  const next: Record<string, TimetableCellRef[]> = {};
  for (const [subjectId, cells] of Object.entries(selections)) {
    const preference = preferences[subjectId] ?? "any";
    const daysUsed = new Set<number>();
    const cleaned: TimetableCellRef[] = [];
    for (const cell of cells) {
      if (!isSlotApplicable(schedule, cell.day, cell.period)) continue;
      if (!matchesLunchPreference(schedule, cell.period, preference)) continue;
      if (daysUsed.has(cell.day)) continue;
      daysUsed.add(cell.day);
      cleaned.push(cell);
    }
    next[subjectId] = cleaned;
  }
  return next;
}

export function validatePreferenceCapacity(
  subjectPeriods: Record<string, number>,
  preferences: Record<string, PlacementPreference>,
  schedule: TimetableScheduleConfig,
): { ok: boolean; message?: string } {
  const beforeDemand = Object.entries(subjectPeriods).reduce((sum, [id, count]) => {
    return preferences[id] === "before_lunch" ? sum + Math.max(0, count) : sum;
  }, 0);
  const afterDemand = Object.entries(subjectPeriods).reduce((sum, [id, count]) => {
    return preferences[id] === "after_lunch" ? sum + Math.max(0, count) : sum;
  }, 0);
  const beforeCap = countSlotsMatchingPreference(schedule, "before_lunch");
  const afterCap = countSlotsMatchingPreference(schedule, "after_lunch");
  if (beforeDemand > beforeCap) {
    return {
      ok: false,
      message: `Before-lunch demand (${beforeDemand}) exceeds available slots (${beforeCap}).`,
    };
  }
  if (afterDemand > afterCap) {
    return {
      ok: false,
      message: `After-lunch demand (${afterDemand}) exceeds available slots (${afterCap}).`,
    };
  }
  return { ok: true };
}

export function validateCellPlacement(args: {
  grid: TimetableGrid;
  schedule: TimetableScheduleConfig;
  day: number;
  period: number;
  subjectId: string;
  subjectCode: string;
  teacherId: string;
  room: string;
  preference?: PlacementPreference;
  existingTimetables?: TimetableRecord[];
  excludeTimetableId?: string;
}): PlacementValidation {
  const {
    grid,
    schedule,
    day,
    period,
    subjectId,
    subjectCode,
    teacherId,
    room,
    preference = "any",
    existingTimetables = [],
    excludeTimetableId,
  } = args;

  if (!isSlotApplicable(schedule, day, period)) {
    return { ok: false, reason: "This period is not available on that day." };
  }
  if (!matchesLunchPreference(schedule, period, preference)) {
    return {
      ok: false,
      reason:
        preference === "before_lunch"
          ? "This subject must be before lunch."
          : preference === "after_lunch"
            ? "This subject must be after lunch."
            : "Timing preference not met.",
    };
  }

  const dayCol = grid[day] ?? [];
  for (let p = 0; p < dayCol.length; p++) {
    if (p === period) continue;
    const slot = dayCol[p];
    if (!slot) continue;
    if (slot.subjectId === subjectId || slot.subject === subjectCode) {
      return { ok: false, reason: "Max one period of this subject per day." };
    }
  }

  const row = schedule.periodRows[period];
  const dayName = getActiveDays(schedule)[day]?.name;
  if (!row || !dayName) return { ok: false, reason: "Invalid period." };

  for (const tt of existingTimetables) {
    if (excludeTimetableId && tt.id === excludeTimetableId) continue;
    const otherSchedule = getRecordSchedule(tt);
    const otherDays = getActiveDays(otherSchedule);
    for (let dayIdx = 0; dayIdx < tt.grid.length; dayIdx++) {
      if (otherDays[dayIdx]?.name !== dayName) continue;
      const col = tt.grid[dayIdx] ?? [];
      for (let periodIdx = 0; periodIdx < col.length; periodIdx++) {
        const slot = col[periodIdx];
        if (!slot) continue;
        const otherRow = otherSchedule.periodRows[periodIdx];
        if (!otherRow || otherRow.isBreak) continue;
        if (!timesOverlap(row.start, row.end, otherRow.start, otherRow.end)) continue;
        if (slot.teacherId === teacherId) {
          return {
            ok: false,
            reason: `Teacher is already booked in ${classKey(tt.grade, tt.section)}.`,
          };
        }
        if (room && slot.room && slot.room === room) {
          return {
            ok: false,
            reason: `Room ${room} is already used by ${classKey(tt.grade, tt.section)}.`,
          };
        }
      }
    }
  }

  for (let dayIdx = 0; dayIdx < grid.length; dayIdx++) {
    const thisDayName = getActiveDays(schedule)[dayIdx]?.name;
    if (thisDayName !== dayName) continue;
    const col = grid[dayIdx] ?? [];
    for (let periodIdx = 0; periodIdx < col.length; periodIdx++) {
      if (dayIdx === day && periodIdx === period) continue;
      const slot = col[periodIdx];
      if (!slot) continue;
      const otherRow = schedule.periodRows[periodIdx];
      if (!otherRow || otherRow.isBreak) continue;
      if (!timesOverlap(row.start, row.end, otherRow.start, otherRow.end)) continue;
      if (slot.teacherId === teacherId) {
        return { ok: false, reason: "Teacher is already booked in this class at that time." };
      }
    }
  }

  return { ok: true };
}

export function evaluatePublishReadiness(
  record: TimetableRecord,
  allTimetables: TimetableRecord[],
  precomputedConflicts?: TimetableConflict[],
): PublishReadiness {
  const schedule = getRecordSchedule(record);
  const teachingSlots = countTeachingSlotsPerWeek(schedule);
  const emptySlots = countEmptySlots(record.grid, schedule);
  const filledSlots = teachingSlots - emptySlots;
  const conflicts = precomputedConflicts ?? detectConflicts(allTimetables, record.id);
  const teacherConflicts = conflicts.filter((c) => c.kind === "teacher").length;
  const roomConflicts = conflicts.filter((c) => c.kind === "room").length;

  const subjects = subjectsForGrade(record.grade);
  const targets = record.subjectPeriodsPerWeek ?? {};
  const weekCap = maxPeriodsPerSubjectPerWeek(schedule);
  let quotaGaps = 0;
  let lunchViolations = 0;
  let sameDayViolations = 0;

  for (const subject of subjects) {
    const target = Math.min(resolvedPeriodsPerWeek(subject, targets), weekCap);
    let filled = 0;
    const dayHits = new Set<number>();
    record.grid.forEach((col, dayIdx) => {
      col.forEach((slot, periodIdx) => {
        if (!slot) return;
        if (slot.subjectId !== subject.id && slot.subject !== subject.code) return;
        filled += 1;
        if (dayHits.has(dayIdx)) sameDayViolations += 1;
        dayHits.add(dayIdx);
        const preference = record.subjectPlacementPreferences?.[subject.id] ?? "any";
        if (!matchesLunchPreference(schedule, periodIdx, preference)) lunchViolations += 1;
      });
    });
    if (filled < target) quotaGaps += target - filled;
  }

  const checklist: PublishChecklistItem[] = [
    {
      id: "filled",
      label: "All teaching slots filled",
      ok: emptySlots === 0,
      detail: emptySlots === 0 ? undefined : `${emptySlots} empty`,
    },
    {
      id: "quotas",
      label: "Subject weekly periods met",
      ok: quotaGaps === 0,
      detail: quotaGaps === 0 ? undefined : `${quotaGaps} periods short`,
    },
    {
      id: "teachers",
      label: "No teacher conflicts",
      ok: teacherConflicts === 0,
      detail: teacherConflicts === 0 ? undefined : `${teacherConflicts} conflict(s)`,
    },
    {
      id: "rooms",
      label: "No room conflicts",
      ok: roomConflicts === 0,
      detail: roomConflicts === 0 ? undefined : `${roomConflicts} conflict(s)`,
    },
    {
      id: "lunch",
      label: "Lunch timing rules valid",
      ok: lunchViolations === 0,
      detail: lunchViolations === 0 ? undefined : `${lunchViolations} violation(s)`,
    },
    {
      id: "one-per-day",
      label: "Max one subject period per day",
      ok: sameDayViolations === 0,
      detail: sameDayViolations === 0 ? undefined : `${sameDayViolations} duplicate(s)`,
    },
  ];

  const blockers = checklist.filter((item) => !item.ok).map((item) => item.detail || item.label);
  const canPublish = blockers.length === 0;

  let readiness: TimetableReadiness = "incomplete";
  if (record.status === "published") readiness = "published";
  else if (teacherConflicts + roomConflicts > 0) readiness = "conflicts";
  else if (canPublish) readiness = "ready";

  return {
    readiness,
    emptySlots,
    teachingSlots,
    filledSlots,
    conflicts,
    teacherConflicts,
    roomConflicts,
    checklist,
    canPublish,
    blockers,
  };
}

export function isLockedCell(
  lockedCells: TimetableCellRef[] | undefined,
  day: number,
  period: number,
): boolean {
  return (lockedCells ?? []).some((cell) => cell.day === day && cell.period === period);
}

export function toggleLockedCell(
  lockedCells: TimetableCellRef[] | undefined,
  day: number,
  period: number,
): TimetableCellRef[] {
  const current = lockedCells ?? [];
  const key = cellRefKey({ day, period });
  if (current.some((c) => cellRefKey(c) === key)) {
    return current.filter((c) => cellRefKey(c) !== key);
  }
  return [...current, { day, period }];
}

export function summarizeReadiness(
  timetables: TimetableRecord[],
  readinessById?: Record<string, TimetableReadiness>,
): Record<TimetableReadiness, number> {
  const totals: Record<TimetableReadiness, number> = {
    incomplete: 0,
    conflicts: 0,
    ready: 0,
    published: 0,
  };
  const map = readinessById ?? buildTimetableReadinessById(timetables);
  for (const timetable of timetables) {
    totals[map[timetable.id] ?? getTimetableReadiness(timetable, timetables)] += 1;
  }
  return totals;
}
