/** Timetable domain — periods, teachers, grids, conflict detection, auto-generation. */

import {
  GRADES,
  getGrades,
  getInstituteTeachers,
  getSubjectsByGrade,
  teacherById,
  teachersForSubjectCode,
  type InstituteTeacher,
} from "@/lib/subjects-data";
import { getInstituteClasses, isCollegeMode } from "@/lib/academic-data";
import { isRegisteredAdminTenant } from "@/lib/admin-tenant";
import { loadClassDirectory, type ClassSection } from "@/lib/class-directory-store";
import {
  DEFAULT_SCHEDULE,
  emptyGridForSchedule,
  getActiveDays,
  isSlotApplicable,
  isTeachingRow,
  matchesLunchPreference,
  teachingSlotsForSchedule,
  countTeachingSlotsPerWeek as countSlotsForSchedule,
  countEmptySlotsForSchedule,
  timesOverlap,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";

export { GRADES, getGrades, getSubjectsByGrade, getInstituteTeachers };
export type { TimetableScheduleConfig } from "@/lib/timetable-schedule";
export type Teacher = InstituteTeacher;

export type Subject = { id: string; name: string; code: string; periodsPerWeek: number };

/** Soft placement preference used during auto-generation. */
export type PlacementPreference = "any" | "before_lunch" | "after_lunch";

/** @deprecated Use getRecordSchedule() — kept for imports that expect fixed days */
export const TIMETABLE_DAYS = getActiveDays(DEFAULT_SCHEDULE).map((d) => d.name);

/** @deprecated Use schedule.periodRows — kept for backward compatibility */
export const TIMETABLE_PERIODS = DEFAULT_SCHEDULE.periodRows.map((p) => ({
  id: p.id,
  label: p.label,
  start: p.start,
  isBreak: p.isBreak,
}));

export const SECTIONS = ["A", "B", "C", "D"] as const;

export type TeacherAssignMode = "manual" | "auto";
export type GenerateScope = "current" | "all";

export type InstituteClass = {
  id: string;
  grade: string;
  section: string;
  room?: string;
  subjectTeacherAssignments?: Record<string, string>;
};

function classSectionToInstituteClass(cls: ClassSection): InstituteClass {
  return {
    id: cls.id,
    grade: cls.timetableGrade,
    section: cls.section,
    room: cls.room,
    subjectTeacherAssignments: cls.subjectTeacherAssignments ?? {},
  };
}

/** All class sections in the institute — prefers persisted class directory. */
export function getInstituteClassesList(): InstituteClass[] {
  try {
    const directory = loadClassDirectory();
    if (directory.length > 0) return directory.map(classSectionToInstituteClass);
  } catch {
    // Fall back to academic profile classes.
  }
  return getInstituteClasses().map(({ id, grade, section }) => ({ id, grade, section }));
}

export function findInstituteClass(grade: string, section: string): InstituteClass | undefined {
  return getInstituteClassesList().find((cls) => cls.grade === grade && cls.section === section);
}

/** Class-level subject → teacher overrides from the class directory. */
export function getClassSubjectTeacherAssignments(
  grade: string,
  section: string,
): Record<string, string> {
  return findInstituteClass(grade, section)?.subjectTeacherAssignments ?? {};
}

/** @deprecated Use getInstituteClassesList() */
export const INSTITUTE_CLASSES: InstituteClass[] = getInstituteClassesList();

export type AutoGenerateConfig = {
  teacherMode: TeacherAssignMode;
  grade: string;
  section: string;
  schedule: TimetableScheduleConfig;
  /** Required when teacherMode is manual — subjectId → teacherId */
  subjectTeachers?: Record<string, string>;
  /** Override catalog periods per week — subjectId → count */
  subjectPeriodsPerWeek?: Record<string, number>;
  /** Explicit day/period cells per subject — used when generating the grid */
  subjectSlotSelections?: Record<string, TimetableCellRef[]>;
  /** Soft before/after lunch preferences per subject */
  subjectPlacementPreferences?: Record<string, PlacementPreference>;
  /** Preserve these cells when regenerating (manual locks) */
  lockedCells?: TimetableCellRef[];
  /** Existing grid to preserve locked/manual cells from */
  preserveGrid?: TimetableGrid;
  /** Other timetables used to avoid double-booking teachers */
  existingTimetables?: TimetableRecord[];
  excludeTimetableId?: string;
  /** When false, do not fill leftover empty cells beyond quotas */
  fillBeyondQuotas?: boolean;
};

export type TimetableCellRef = { day: number; period: number };

export function cellRefKey(ref: TimetableCellRef): string {
  return `${ref.day}-${ref.period}`;
}

export type TimetableSlot = {
  subjectId: string;
  subject: string;
  teacherId: string;
  teacher: string;
  room: string;
};

export type TimetableGrid = (TimetableSlot | null)[][];

export type TimetableRecord = {
  id: string;
  grade: string;
  section: string;
  term: string;
  status: "draft" | "published";
  grid: TimetableGrid;
  schedule: TimetableScheduleConfig;
  /** Per-subject weekly period targets used when generating / filling */
  subjectPeriodsPerWeek?: Record<string, number>;
  /** Explicit day/period picks per subject */
  subjectSlotSelections?: Record<string, TimetableCellRef[]>;
  /** Last-used subject → teacher map for regenerate / staff panel */
  subjectTeachers?: Record<string, string>;
  /** Soft placement preferences */
  subjectPlacementPreferences?: Record<string, PlacementPreference>;
  /** Notices when preferences were relaxed to complete quotas */
  relaxedPreferenceNotices?: string[];
  /** Manager-locked cells preserved across regeneration */
  lockedCells?: TimetableCellRef[];
  updatedAt: string;
};

export function getRecordSchedule(
  record: TimetableRecord | null | undefined,
): TimetableScheduleConfig {
  return record?.schedule ?? DEFAULT_SCHEDULE;
}

export function getRecordDays(record: TimetableRecord | null | undefined): string[] {
  return getActiveDays(getRecordSchedule(record)).map((d) => d.name);
}

export type TimetableConflict = {
  day: string;
  period: string;
  kind: "teacher" | "room";
  resource: string;
  classes: string[];
};

export function gradeSortKey(grade: string): number {
  const n = parseInt(grade.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function teachingSlots(schedule: TimetableScheduleConfig) {
  return teachingSlotsForSchedule(schedule);
}

type TeacherBooking = Set<string>;

function bookingKey(resourceId: string, dayName: string, start: string, end: string) {
  return `${resourceId}|${dayName}|${start}|${end}`;
}

function roomResourceId(room: string) {
  return `room:${room}`;
}

function seedBookingsFromTimetables(
  bookings: TeacherBooking,
  timetables: TimetableRecord[],
  skipIds?: Set<string>,
) {
  for (const tt of timetables) {
    if (skipIds?.has(tt.id)) continue;
    const schedule = getRecordSchedule(tt);
    const days = getActiveDays(schedule);
    tt.grid.forEach((dayCol, dayIdx) => {
      const dayName = days[dayIdx]?.name;
      if (!dayName) return;
      dayCol.forEach((slot, periodIdx) => {
        if (!slot) return;
        const row = schedule.periodRows[periodIdx];
        if (!row || row.isBreak) return;
        if (slot.teacherId) {
          bookings.add(bookingKey(slot.teacherId, dayName, row.start, row.end));
        }
        if (slot.room) {
          bookings.add(bookingKey(roomResourceId(slot.room), dayName, row.start, row.end));
        }
      });
    });
  }
}

function isResourceBookedAt(
  bookings: TeacherBooking,
  resourceId: string,
  dayName: string,
  start: string,
  end: string,
) {
  for (const key of bookings) {
    const [id, bookedDay, bookedStart, bookedEnd] = key.split("|");
    if (id !== resourceId || bookedDay !== dayName) continue;
    if (timesOverlap(start, end, bookedStart!, bookedEnd!)) return true;
  }
  return false;
}

function isTeacherBookedAt(
  bookings: TeacherBooking,
  teacherId: string,
  dayName: string,
  start: string,
  end: string,
) {
  return isResourceBookedAt(bookings, teacherId, dayName, start, end);
}

function isRoomBookedAt(
  bookings: TeacherBooking,
  room: string,
  dayName: string,
  start: string,
  end: string,
) {
  if (!room) return false;
  return isResourceBookedAt(bookings, roomResourceId(room), dayName, start, end);
}

function subjectsForGrade(grade: string) {
  const byGrade = getSubjectsByGrade();
  return byGrade[grade] ?? byGrade["Grade 10"] ?? [];
}

/** Default weekly period counts from the subject catalog. */
export function buildDefaultSubjectPeriods(subjects: Subject[]): Record<string, number> {
  return Object.fromEntries(subjects.map((s) => [s.id, s.periodsPerWeek]));
}

function periodsForSubject(subject: Subject, overrides?: Record<string, number>): number {
  const n = overrides?.[subject.id];
  if (n !== undefined) return Math.max(0, n);
  return subject.periodsPerWeek;
}

/** Read period counts from an existing grid; missing subjects use catalog defaults. */
export function inferSubjectPeriodsFromGrid(
  grid: TimetableGrid,
  subjects: Subject[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const dayCol of grid) {
    for (const slot of dayCol) {
      if (!slot) continue;
      const sub = subjects.find((s) => s.id === slot.subjectId || s.code === slot.subject);
      const id = sub?.id ?? slot.subjectId;
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    subjects.map((s) => [s.id, counts[s.id] !== undefined ? counts[s.id]! : s.periodsPerWeek]),
  );
}

export function periodsFromSlotSelections(
  selections: Record<string, TimetableCellRef[]>,
  subjects: Subject[],
): Record<string, number> {
  return Object.fromEntries(subjects.map((s) => [s.id, selections[s.id]?.length ?? 0]));
}

/** Hard rule: at most one teaching period of a subject on any single day. */
export function maxPeriodsPerSubjectPerWeek(schedule: TimetableScheduleConfig): number {
  return Math.max(1, getActiveDays(schedule).length);
}

export function capSubjectPeriodsToOnePerDay(
  periods: Record<string, number>,
  schedule: TimetableScheduleConfig,
): Record<string, number> {
  const cap = maxPeriodsPerSubjectPerWeek(schedule);
  return Object.fromEntries(
    Object.entries(periods).map(([id, count]) => [id, Math.min(Math.max(0, count), cap)]),
  );
}

function subjectOccupiesDay(
  grid: TimetableGrid,
  subjectId: string,
  subjectCode: string,
  day: number,
): boolean {
  const dayCol = grid[day];
  if (!dayCol) return false;
  return dayCol.some(
    (slot) => slot != null && (slot.subjectId === subjectId || slot.subject === subjectCode),
  );
}

/** Pick evenly spaced teaching slots — max one period of each subject per day. */
export function buildDefaultSubjectSlotSelections(
  subjects: Subject[],
  schedule: TimetableScheduleConfig,
  periods?: Record<string, number>,
  preferences?: Record<string, PlacementPreference>,
): Record<string, TimetableCellRef[]> {
  const selections: Record<string, TimetableCellRef[]> = {};
  const used = new Set<string>();
  const slots = teachingSlotsForSchedule(schedule);
  const dayCount = Math.max(1, getActiveDays(schedule).length);
  const weekCap = maxPeriodsPerSubjectPerWeek(schedule);

  // Heavier weekly subjects first so they claim spread-out days early.
  const orderedSubjects = [...subjects].sort((a, b) => {
    const aCount = Math.min(periods?.[a.id] ?? a.periodsPerWeek, weekCap);
    const bCount = Math.min(periods?.[b.id] ?? b.periodsPerWeek, weekCap);
    return bCount - aCount;
  });

  for (const subject of orderedSubjects) {
    const count = Math.min(periods?.[subject.id] ?? subject.periodsPerWeek, weekCap);
    const pref = preferences?.[subject.id] ?? "any";
    const preferred = slots.filter((slot) =>
      matchesLunchPreference(schedule, slot.period, pref),
    );
    // Strict preference: do not fall back to the other side of lunch.
    const ordered =
      pref === "any"
        ? slots
        : preferred.length > 0
          ? preferred
          : [];
    const cells: TimetableCellRef[] = [];
    const daysUsed = new Set<number>();
    const dayLoads = new Array(dayCount).fill(0);

    for (let n = 0; n < count; n++) {
      let best: (typeof ordered)[number] | null = null;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const slot of ordered) {
        const key = cellRefKey(slot);
        if (used.has(key)) continue;
        if (daysUsed.has(slot.day)) continue; // max one period of this subject per day
        const score = dayLoads[slot.day]! * 20 + slot.period;
        if (score < bestScore) {
          bestScore = score;
          best = slot;
        }
      }
      if (!best) break;
      used.add(cellRefKey(best));
      daysUsed.add(best.day);
      dayLoads[best.day]! += 1;
      cells.push(best);
    }
    selections[subject.id] = cells;
  }

  // Keep stable subject order in the returned map.
  return Object.fromEntries(subjects.map((s) => [s.id, selections[s.id] ?? []]));
}

export function autoPickSlotsForSubject(
  subjectId: string,
  count: number,
  selections: Record<string, TimetableCellRef[]>,
  schedule: TimetableScheduleConfig,
  preference: PlacementPreference = "any",
): Record<string, TimetableCellRef[]> {
  const used = new Set<string>();
  for (const [id, cells] of Object.entries(selections)) {
    if (id === subjectId) continue;
    for (const c of cells) used.add(cellRefKey(c));
  }
  const weekCap = maxPeriodsPerSubjectPerWeek(schedule);
  const target = Math.min(Math.max(0, count), weekCap);
  const picked: TimetableCellRef[] = [];
  const daysUsed = new Set<number>();
  const dayCount = Math.max(1, getActiveDays(schedule).length);
  const dayLoads = new Array(dayCount).fill(0);
  const preferredSlots = teachingSlotsForSchedule(schedule).filter((slot) =>
    matchesLunchPreference(schedule, slot.period, preference),
  );
  // Strict: only use matching lunch-side slots when preference is set.
  const candidateSlots = preference === "any" ? teachingSlotsForSchedule(schedule) : preferredSlots;

  for (let n = 0; n < target; n++) {
    let best: TimetableCellRef | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const slot of candidateSlots) {
      if (used.has(cellRefKey(slot))) continue;
      if (daysUsed.has(slot.day)) continue;
      const score = dayLoads[slot.day]! * 20 + slot.period;
      if (score < bestScore) {
        bestScore = score;
        best = slot;
      }
    }
    if (!best) break;
    used.add(cellRefKey(best));
    daysUsed.add(best.day);
    dayLoads[best.day]! += 1;
    picked.push(best);
  }
  return { ...selections, [subjectId]: picked };
}

export function inferSubjectSlotsFromGrid(
  grid: TimetableGrid,
  subjects: Subject[],
  schedule: TimetableScheduleConfig,
): Record<string, TimetableCellRef[]> {
  const selections: Record<string, TimetableCellRef[]> = Object.fromEntries(
    subjects.map((s) => [s.id, [] as TimetableCellRef[]]),
  );
  grid.forEach((dayCol, dayIdx) => {
    dayCol.forEach((slot, periodIdx) => {
      if (!slot || !isSlotApplicable(schedule, dayIdx, periodIdx)) return;
      const sub = subjects.find((s) => s.id === slot.subjectId || s.code === slot.subject);
      const id = sub?.id ?? slot.subjectId;
      if (!selections[id]) selections[id] = [];
      selections[id]!.push({ day: dayIdx, period: periodIdx });
    });
  });
  for (const sub of subjects) {
    if (!selections[sub.id]?.length) {
      selections[sub.id] = buildDefaultSubjectSlotSelections([sub], schedule, {
        [sub.id]: sub.periodsPerWeek,
      })[sub.id]!;
    }
  }
  return selections;
}

/** Ensure every subject has a teacher — class overrides → partial → experience. */
export function mergeSubjectTeachersForGrade(
  grade: string,
  section: string,
  partial: Record<string, string>,
): Record<string, string> {
  const classOverrides = getClassSubjectTeacherAssignments(grade, section);
  const fallback =
    assignSubjectTeachersByExperience([{ id: "_tmp", grade, section }])[
      classKey(grade, section)
    ] ?? {};
  const merged: Record<string, string> = {};
  for (const sub of subjectsForGrade(grade)) {
    const fromClass = classOverrides[sub.id];
    if (fromClass !== undefined && fromClass !== "") {
      merged[sub.id] = fromClass;
      continue;
    }
    merged[sub.id] =
      partial[sub.id] || fallback[sub.id] || rankTeachersByExperience(sub)[0]?.id || "";
  }
  return merged;
}

export function classKey(grade: string, section: string) {
  return `${grade}-${section}`;
}

/** Human-readable venue tied to class + section (not room numbers). */
export function classLocationLabel(grade: string, section: string) {
  return `${grade} · Sec ${section}`;
}

export function slotVenue(grade: string, section: string) {
  const room = findInstituteClass(grade, section)?.room?.trim();
  if (room) return room;
  return classLocationLabel(grade, section);
}

export function emptyGrid(schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE): TimetableGrid {
  return emptyGridForSchedule(schedule);
}

function slotTeacher(slot: TimetableSlot) {
  return slot.teacherId || slot.teacher;
}

/** Sample grids — populated via buildInitialTimetables() at module end. */
function buildGrade10A(): TimetableGrid {
  return emptyGrid();
}

function buildGrade12A(): TimetableGrid {
  return emptyGrid();
}

/** Placeholder — replaced by buildInitialTimetables() below. */
export let INITIAL_TIMETABLES: TimetableRecord[] = [];

export function teachersForSubject(subjectCode: string, subjectName?: string): Teacher[] {
  return teachersForSubjectCode(subjectCode, subjectName);
}

/** Rank by qualification match, then experience (highest first). */
export function rankTeachersByExperience(subject: Subject): Teacher[] {
  return [...teachersForSubject(subject.code, subject.name)].sort(
    (a, b) => b.experienceYears - a.experienceYears,
  );
}

/** Rank qualified teachers: highest experience first, then lowest institute workload. */
export function rankTeachersForSubject(
  subject: Subject,
  workload: Record<string, number> = {},
): Teacher[] {
  const qualified = rankTeachersByExperience(subject);
  return qualified.sort((a, b) => {
    const expDiff = b.experienceYears - a.experienceYears;
    if (expDiff !== 0) return expDiff;
    return (workload[a.id] ?? 0) - (workload[b.id] ?? 0);
  });
}

/**
 * Assign teachers per subject across all classes: senior grades get the most
 * experienced qualified teacher; junior grades get less experienced teachers.
 */
export function assignSubjectTeachersByExperience(
  classes: InstituteClass[],
): Record<string, Record<string, string>> {
  const sorted = [...classes].sort(
    (a, b) => gradeSortKey(b.grade) - gradeSortKey(a.grade) || a.section.localeCompare(b.section),
  );
  const result: Record<string, Record<string, string>> = {};
  for (const cls of sorted) {
    result[classKey(cls.grade, cls.section)] = {};
  }

  const subjectNames = new Set<string>();
  for (const cls of sorted) {
    for (const sub of subjectsForGrade(cls.grade)) {
      subjectNames.add(sub.name);
    }
  }

  for (const subjectName of subjectNames) {
    const classesWithSubject = sorted.filter((cls) =>
      subjectsForGrade(cls.grade).some((s) => s.name === subjectName),
    );
    if (classesWithSubject.length === 0) continue;

    const sample = subjectsForGrade(classesWithSubject[0]!.grade).find(
      (s) => s.name === subjectName,
    )!;
    const qualified = rankTeachersByExperience(sample);

    classesWithSubject.forEach((cls, i) => {
      const sub = subjectsForGrade(cls.grade).find((s) => s.name === subjectName)!;
      const tIdx = Math.min(i, Math.max(qualified.length - 1, 0));
      const teacher = qualified[tIdx] ?? qualified[qualified.length - 1];
      if (teacher) result[classKey(cls.grade, cls.section)]![sub.id] = teacher.id;
    });
  }

  return result;
}

export type InstituteGenerateResult = {
  timetables: TimetableRecord[];
  classCount: number;
  unplacedPeriods: number;
  teacherConflicts: number;
  assignments: Record<string, Record<string, string>>;
};

/** Read subject→teacher map from existing timetables (same class, then same grade). */
export function inferSubjectTeachersFromTimetables(
  grade: string,
  section: string,
  timetables: TimetableRecord[],
): Record<string, string> {
  const result: Record<string, string> = {};

  const exact = timetables.find((t) => t.grade === grade && t.section === section);
  if (exact) {
    for (const dayCol of exact.grid) {
      for (const slot of dayCol) {
        if (slot?.subjectId && slot.teacherId) result[slot.subjectId] = slot.teacherId;
      }
    }
    if (Object.keys(result).length > 0) {
      return mergeSubjectTeachersForGrade(grade, section, result);
    }
  }

  for (const tt of timetables.filter((t) => t.grade === grade)) {
    for (const dayCol of tt.grid) {
      for (const slot of dayCol) {
        if (slot?.subjectId && slot.teacherId && !result[slot.subjectId]) {
          result[slot.subjectId] = slot.teacherId;
        }
      }
    }
  }
  if (Object.keys(result).length > 0) {
    return mergeSubjectTeachersForGrade(grade, section, result);
  }

  const assignments = assignSubjectTeachersByExperience(getInstituteClassesList());
  return mergeSubjectTeachersForGrade(
    grade,
    section,
    assignments[classKey(grade, section)] ?? {},
  );
}

/** Suggest teachers — prefers existing timetable assignments, then experience rules. */
export function autoSuggestSubjectTeachers(
  grade: string,
  section: string,
  existingTimetables: TimetableRecord[] = [],
): Record<string, string> {
  return inferSubjectTeachersFromTimetables(grade, section, existingTimetables);
}

function resolveSubjectTeachers(grade: string, config: AutoGenerateConfig): Record<string, string> {
  const partial =
    config.subjectTeachers && Object.keys(config.subjectTeachers).length > 0
      ? config.subjectTeachers
      : autoSuggestSubjectTeachers(grade, config.section, config.existingTimetables ?? []);
  return mergeSubjectTeachersForGrade(grade, config.section, partial);
}

export function detectConflicts(
  timetables: TimetableRecord[],
  focusId?: string,
): TimetableConflict[] {
  const conflicts: TimetableConflict[] = [];

  type Occ = {
    classKey: string;
    dayName: string;
    periodLabel: string;
    start: string;
    end: string;
    resource: string;
    kind: "teacher" | "room";
  };

  const teacherOcc: Occ[] = [];
  const roomOcc: Occ[] = [];

  for (const tt of timetables) {
    const ck = classKey(tt.grade, tt.section);
    const schedule = getRecordSchedule(tt);
    const days = getActiveDays(schedule);
    tt.grid.forEach((dayCol, dayIdx) => {
      const dayName = days[dayIdx]?.name;
      if (!dayName) return;
      dayCol.forEach((slot, periodIdx) => {
        if (!slot || !isTeachingRow(schedule, periodIdx)) return;
        if (!isSlotApplicable(schedule, dayIdx, periodIdx)) return;
        const row = schedule.periodRows[periodIdx]!;
        teacherOcc.push({
          classKey: ck,
          dayName,
          periodLabel: row.label,
          start: row.start,
          end: row.end,
          resource: slotTeacher(slot),
          kind: "teacher",
        });
        roomOcc.push({
          classKey: ck,
          dayName,
          periodLabel: row.label,
          start: row.start,
          end: row.end,
          resource: slot.room,
          kind: "room",
        });
      });
    });
  }

  const collect = (occurrences: Occ[]) => {
    for (let i = 0; i < occurrences.length; i++) {
      for (let j = i + 1; j < occurrences.length; j++) {
        const a = occurrences[i]!;
        const b = occurrences[j]!;
        if (a.resource !== b.resource) continue;
        if (a.dayName !== b.dayName) continue;
        if (a.classKey === b.classKey) continue;
        if (!timesOverlap(a.start, a.end, b.start, b.end)) continue;
        const existing = conflicts.find(
          (c) =>
            c.kind === a.kind &&
            c.resource === a.resource &&
            c.day === a.dayName &&
            c.classes.includes(a.classKey) &&
            c.classes.includes(b.classKey),
        );
        if (existing) continue;
        conflicts.push({
          day: a.dayName,
          period: `${a.periodLabel} ↔ ${b.periodLabel}`,
          kind: a.kind,
          resource: a.resource,
          classes: [a.classKey, b.classKey],
        });
      }
    }
  };

  collect(teacherOcc);
  collect(roomOcc);

  if (focusId) {
    const focus = timetables.find((t) => t.id === focusId);
    if (!focus) return conflicts;
    const ck = classKey(focus.grade, focus.section);
    return conflicts.filter((c) => c.classes.includes(ck));
  }
  return conflicts;
}

function buildTeacherBookings(
  timetables: TimetableRecord[],
  skip?: { timetableId: string; day: number; period: number },
): TeacherBooking {
  const bookings: TeacherBooking = new Set();
  for (const tt of timetables) {
    const schedule = getRecordSchedule(tt);
    const days = getActiveDays(schedule);
    tt.grid.forEach((dayCol, dayIdx) => {
      const dayName = days[dayIdx]?.name;
      if (!dayName) return;
      dayCol.forEach((slot, periodIdx) => {
        if (
          skip &&
          skip.timetableId === tt.id &&
          skip.day === dayIdx &&
          skip.period === periodIdx
        ) {
          return;
        }
        if (!slot) return;
        const row = schedule.periodRows[periodIdx];
        if (!row || row.isBreak) return;
        if (slot.teacherId) {
          bookings.add(bookingKey(slot.teacherId, dayName, row.start, row.end));
        }
        if (slot.room) {
          bookings.add(bookingKey(roomResourceId(slot.room), dayName, row.start, row.end));
        }
      });
    });
  }
  return bookings;
}

/** Reassign conflicting teacher slots on one timetable using alternate qualified staff. */
export function resolveConflictsForTimetable(
  timetables: TimetableRecord[],
  focusId: string,
): { timetables: TimetableRecord[]; fixed: number } {
  let next = timetables.map((t) => ({ ...t, grid: t.grid.map((col) => [...col]) }));
  const focusIdx = next.findIndex((t) => t.id === focusId);
  if (focusIdx < 0) return { timetables, fixed: 0 };

  let fixed = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (let round = 0; round < 30; round++) {
    const conflicts = detectConflicts(next, focusId).filter((c) => c.kind === "teacher");
    if (conflicts.length === 0) break;

    const focus = next[focusIdx]!;
    const schedule = getRecordSchedule(focus);
    const dayNames = getRecordDays(focus);
    let changed = false;

    for (const c of conflicts) {
      const dayIdx = dayNames.indexOf(c.day);
      if (dayIdx < 0) continue;

      // Conflict period label may be "P1 · 08:00 ↔ P2 · 09:00" — match either side on this grid.
      const periodIdx = schedule.periodRows.findIndex(
        (p) => !p.isBreak && (c.period.includes(p.label) || c.period === p.label),
      );
      if (periodIdx < 0) continue;

      const slot = focus.grid[dayIdx]?.[periodIdx];
      if (!slot?.teacherId) continue;
      const row = schedule.periodRows[periodIdx]!;

      const subject =
        subjectsForGrade(focus.grade).find(
          (s) => s.id === slot.subjectId || s.code === slot.subject,
        ) ?? {
          id: slot.subjectId,
          name: slot.subject,
          code: slot.subject,
          periodsPerWeek: 1,
        };

      const bookings = buildTeacherBookings(next, {
        timetableId: focusId,
        day: dayIdx,
        period: periodIdx,
      });
      const alternatives = rankTeachersForSubject(subject);

      for (const teacher of alternatives) {
        if (teacher.id === slot.teacherId) continue;
        if (isTeacherBookedAt(bookings, teacher.id, c.day, row.start, row.end)) continue;

        focus.grid[dayIdx]![periodIdx] = {
          ...slot,
          teacherId: teacher.id,
          teacher: teacher.name,
        };
        fixed++;
        changed = true;
        break;
      }
    }

    if (!changed) break;
  }

  if (fixed > 0) {
    next = next.map((t) =>
      t.id === focusId ? { ...t, status: "draft" as const, updatedAt: today } : t,
    );
  }

  return { timetables: next, fixed };
}

export function conflictCountByTimetable(timetables: TimetableRecord[]): Record<string, number> {
  const all = detectConflicts(timetables);
  const counts: Record<string, number> = {};
  for (const tt of timetables) {
    const ck = classKey(tt.grade, tt.section);
    counts[tt.id] = all.filter((c) => c.classes.includes(ck)).length;
  }
  return counts;
}

export function autoGenerateTimetable(
  grade: string,
  section: string,
  config: AutoGenerateConfig,
  bookings?: TeacherBooking,
): TimetableGrid {
  const result = autoGenerateTimetableDetailed(grade, section, config, bookings);
  return result.grid;
}

export function autoGenerateTimetableDetailed(
  grade: string,
  section: string,
  config: AutoGenerateConfig,
  bookings?: TeacherBooking,
): { grid: TimetableGrid; unplaced: number; relaxedNotices: string[] } {
  const opts: AutoGenerateConfig = { ...config, grade, section };
  const venue = slotVenue(grade, section);
  const subjectTeachers = resolveSubjectTeachers(grade, opts);
  const localBookings = bookings ?? new Set<string>();

  if (!bookings && opts.existingTimetables) {
    seedBookingsFromTimetables(
      localBookings,
      opts.existingTimetables,
      new Set(opts.excludeTimetableId ? [opts.excludeTimetableId] : []),
    );
  }

  return fillGridFromSubjectTeachers(
    grade,
    section,
    subjectTeachers,
    localBookings,
    venue,
    opts.schedule,
    opts.subjectPeriodsPerWeek,
    opts.subjectSlotSelections,
    opts.subjectPlacementPreferences,
    opts.lockedCells,
    opts.preserveGrid,
  );
}

function fillGridFromSubjectTeachers(
  grade: string,
  section: string,
  subjectTeachers: Record<string, string>,
  bookings: TeacherBooking,
  venue: string,
  schedule: TimetableScheduleConfig,
  subjectPeriodsPerWeek?: Record<string, number>,
  subjectSlotSelections?: Record<string, TimetableCellRef[]>,
  subjectPlacementPreferences?: Record<string, PlacementPreference>,
  lockedCells?: TimetableCellRef[],
  preserveGrid?: TimetableGrid,
): { grid: TimetableGrid; unplaced: number; relaxedNotices: string[] } {
  const grid: TimetableGrid = emptyGridForSchedule(schedule);
  const subjects = subjectsForGrade(grade);
  const allSlots = teachingSlots(schedule);
  const days = getActiveDays(schedule);
  let unplaced = 0;
  const relaxedNotices: string[] = [];
  const locked = new Set((lockedCells ?? []).map(cellRefKey));

  // Preserve locked / manual cells first.
  if (preserveGrid) {
    preserveGrid.forEach((dayCol, dayIdx) => {
      dayCol.forEach((slot, periodIdx) => {
        if (!slot) return;
        if (locked.size > 0 && !locked.has(cellRefKey({ day: dayIdx, period: periodIdx }))) {
          return;
        }
        if (!isSlotApplicable(schedule, dayIdx, periodIdx)) return;
        const row = schedule.periodRows[periodIdx];
        const dayName = days[dayIdx]?.name;
        if (!row || !dayName) return;
        const room = slot.room || venue;
        grid[dayIdx]![periodIdx] = { ...slot, room };
        if (slot.teacherId) {
          bookings.add(bookingKey(slot.teacherId, dayName, row.start, row.end));
        }
        if (room) {
          bookings.add(bookingKey(roomResourceId(room), dayName, row.start, row.end));
        }
      });
    });
  }

  const teacherFor = (subject: Subject) => {
    const teacherId = subjectTeachers[subject.id];
    if (teacherId) {
      const resolved = teacherById(teacherId);
      if (resolved) return resolved;
    }
    return rankTeachersByExperience(subject)[0];
  };

  const placeSlot = (subject: Subject, teacher: Teacher, day: number, period: number) => {
    const row = schedule.periodRows[period]!;
    const dayName = days[day]!.name;
    grid[day]![period] = {
      subjectId: subject.id,
      subject: subject.code,
      teacherId: teacher.id,
      teacher: teacher.name,
      room: venue,
    };
    bookings.add(bookingKey(teacher.id, dayName, row.start, row.end));
    if (venue) {
      bookings.add(bookingKey(roomResourceId(venue), dayName, row.start, row.end));
    }
  };

  const canPlace = (
    teacher: Teacher,
    subject: Subject,
    day: number,
    period: number,
  ) => {
    if (grid[day]?.[period]) return false;
    if (locked.has(cellRefKey({ day, period }))) return false;
    if (!isSlotApplicable(schedule, day, period)) return false;
    if (subjectOccupiesDay(grid, subject.id, subject.code, day)) return false;
    const row = schedule.periodRows[period]!;
    const dayName = days[day]!.name;
    if (isTeacherBookedAt(bookings, teacher.id, dayName, row.start, row.end)) return false;
    if (isRoomBookedAt(bookings, venue, dayName, row.start, row.end)) return false;
    return true;
  };

  const weekCap = maxPeriodsPerSubjectPerWeek(schedule);

  // Pass 1 — explicit day/period selections (respect lunch preference + one subject/day)
  // Do not count failures here — Pass 2 will retry remaining quotas and count unplaced once.
  if (subjectSlotSelections && Object.keys(subjectSlotSelections).length > 0) {
    for (const subject of subjects) {
      const preference = subjectPlacementPreferences?.[subject.id] ?? "any";
      const cells = subjectSlotSelections[subject.id] ?? [];
      const teacher = teacherFor(subject);
      if (!teacher) continue;
      const daysUsed = new Set<number>();
      for (const { day, period } of cells) {
        if (!matchesLunchPreference(schedule, period, preference)) {
          // Ignore stale picks that violate the current before/after lunch rule.
          continue;
        }
        if (daysUsed.has(day) || subjectOccupiesDay(grid, subject.id, subject.code, day)) {
          continue;
        }
        if (!canPlace(teacher, subject, day, period)) {
          for (const alt of rankTeachersByExperience(subject)) {
            if (!canPlace(alt, subject, day, period)) continue;
            placeSlot(subject, alt, day, period);
            daysUsed.add(day);
            break;
          }
          continue;
        }
        placeSlot(subject, teacher, day, period);
        daysUsed.add(day);
      }
    }
  }

  // Pass 2 — remaining quotas, with hard before/after lunch constraints
  type QueueItem = {
    subject: Subject;
    teacher: Teacher;
    remaining: number;
    preference: PlacementPreference;
  };
  const queues: QueueItem[] = subjects
    .map((subject) => {
      const teacher = teacherFor(subject);
      if (!teacher) return null;
      const preference = subjectPlacementPreferences?.[subject.id] ?? "any";
      const rawTarget = periodsForSubject(subject, subjectPeriodsPerWeek);
      const target = Math.min(rawTarget, weekCap);
      if (rawTarget > weekCap) {
        relaxedNotices.push(
          `${subject.name}: capped at ${weekCap}/week (max one period per day).`,
        );
      }
      const placed = countSubjectInGrid(grid, subject.id, subject.code);
      const remaining = Math.max(0, target - placed);
      return remaining > 0
        ? {
            subject,
            teacher,
            remaining,
            preference,
          }
        : null;
    })
    .filter((q): q is QueueItem => q != null)
    .sort((a, b) => b.remaining - a.remaining);

  const scoreSlot = (
    slot: { day: number; period: number },
    subjectDayLoads: number[],
    dayFillLoads: number[],
  ) => subjectDayLoads[slot.day]! * 1000 + dayFillLoads[slot.day]! * 10 + slot.period;

  let safety = allSlots.length * Math.max(queues.length, 1) + 1;
  while (queues.some((q) => q.remaining > 0) && safety-- > 0) {
    let progress = false;
    for (const q of queues) {
      if (q.remaining <= 0) continue;

      const subjectDayLoads = new Array(days.length).fill(0);
      const dayFillLoads = new Array(days.length).fill(0);
      grid.forEach((col, dayIdx) => {
        subjectDayLoads[dayIdx] = col.filter((s) => s?.subjectId === q.subject.id).length;
        dayFillLoads[dayIdx] = col.filter((s) => s != null).length;
      });

      const candidates = allSlots
        .filter((slot) => matchesLunchPreference(schedule, slot.period, q.preference))
        .sort(
          (a, b) =>
            scoreSlot(a, subjectDayLoads, dayFillLoads) - scoreSlot(b, subjectDayLoads, dayFillLoads),
        );

      let placed = false;
      const tryTeachers = [
        q.teacher,
        ...rankTeachersByExperience(q.subject).filter((t) => t.id !== q.teacher.id),
      ];

      for (const teacher of tryTeachers) {
        for (const { day, period } of candidates) {
          if (!canPlace(teacher, q.subject, day, period)) continue;
          q.teacher = teacher;
          placeSlot(q.subject, teacher, day, period);
          q.remaining--;
          placed = true;
          progress = true;
          break;
        }
        if (placed) break;
      }

      if (!placed) {
        if (q.preference !== "any") {
          relaxedNotices.push(
            `${q.subject.name}: could not place ${q.remaining} period(s) ${q.preference.replace("_", " ")} — left empty rather than moving to the other side of lunch.`,
          );
        }
        unplaced += q.remaining;
        q.remaining = 0;
      }
    }
    if (!progress) break;
  }

  return { grid, unplaced, relaxedNotices };
}

/** Generate timetables for every institute class in one pass — no teacher double-booked at the same period. */
export function generateAllInstituteTimetables(
  existing: TimetableRecord[],
  term: string,
  schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE,
  classes: InstituteClass[] = getInstituteClassesList(),
): InstituteGenerateResult {
  const assignments = assignSubjectTeachersByExperience(classes);
  const bookings: TeacherBooking = new Set();
  const today = new Date().toISOString().slice(0, 10);
  const generated: TimetableRecord[] = [];

  const sorted = [...classes].sort(
    (a, b) => gradeSortKey(b.grade) - gradeSortKey(a.grade) || a.section.localeCompare(b.section),
  );

  let unplacedPeriods = 0;

  for (const cls of sorted) {
    const ck = classKey(cls.grade, cls.section);
    const subjectTeachers = mergeSubjectTeachersForGrade(
      cls.grade,
      cls.section,
      assignments[ck] ?? {},
    );
    const venue = slotVenue(cls.grade, cls.section);
    const { grid, unplaced } = fillGridFromSubjectTeachers(
      cls.grade,
      cls.section,
      subjectTeachers,
      bookings,
      venue,
      schedule,
    );
    unplacedPeriods += unplaced;

    const prev = existing.find((t) => t.grade === cls.grade && t.section === cls.section);
    generated.push({
      id: prev?.id ?? `TT-${cls.id.replace("-", "")}`,
      grade: cls.grade,
      section: cls.section,
      term: prev?.term ?? term,
      status: "draft",
      grid,
      schedule,
      subjectTeachers,
      updatedAt: today,
    });
  }

  const instituteKeys = new Set(classes.map((c) => classKey(c.grade, c.section)));
  const preserved = existing.filter((t) => !instituteKeys.has(classKey(t.grade, t.section)));
  const timetables = [...preserved, ...generated];
  const teacherConflicts = detectConflicts(timetables).filter((c) => c.kind === "teacher").length;

  return {
    timetables,
    classCount: generated.length,
    unplacedPeriods,
    teacherConflicts,
    assignments,
  };
}

export function sectionsForGrade(grade: string, timetables: TimetableRecord[]) {
  const fromTt = timetables.filter((t) => t.grade === grade).map((t) => t.section);
  const merged = new Set([...SECTIONS, ...fromTt]);
  return [...merged];
}

export function hasTimetable(grade: string, section: string, timetables: TimetableRecord[]) {
  return timetables.some((t) => t.grade === grade && t.section === section);
}

export function countTeachingSlotsPerWeek(schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE) {
  return countSlotsForSchedule(schedule);
}

export function validateSubjectPeriodBudget(
  subjectPeriods: Record<string, number>,
  schedule: TimetableScheduleConfig,
): { ok: boolean; total: number; capacity: number } {
  const total = Object.values(subjectPeriods).reduce((sum, n) => sum + Math.max(0, n), 0);
  const capacity = countSlotsForSchedule(schedule);
  return { ok: total <= capacity, total, capacity };
}

export function countEmptySlots(
  grid: TimetableGrid,
  schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE,
): number {
  return countEmptySlotsForSchedule(grid, schedule);
}

function countSubjectInGrid(grid: TimetableGrid, subjectId: string, code: string): number {
  let n = 0;
  for (const dayCol of grid) {
    for (const slot of dayCol) {
      if (slot && (slot.subjectId === subjectId || slot.subject === code)) n++;
    }
  }
  return n;
}

/** Fill only empty cells up to configured weekly quotas — keeps existing assignments. */
export function fillEmptySlots(
  grade: string,
  section: string,
  existingGrid: TimetableGrid,
  config: AutoGenerateConfig,
): { grid: TimetableGrid; filled: number } {
  const schedule = config.schedule;
  const next = existingGrid.map((col) => [...col]);
  const bookings: TeacherBooking = new Set();
  const days = getActiveDays(schedule);

  next.forEach((dayCol, dayIdx) => {
    const dayName = days[dayIdx]?.name;
    if (!dayName) return;
    dayCol.forEach((slot, periodIdx) => {
      if (!slot) return;
      const row = schedule.periodRows[periodIdx];
      if (!row || row.isBreak) return;
      if (slot.teacherId) {
        bookings.add(bookingKey(slot.teacherId, dayName, row.start, row.end));
      }
      if (slot.room) {
        bookings.add(bookingKey(roomResourceId(slot.room), dayName, row.start, row.end));
      }
    });
  });

  if (config.existingTimetables) {
    seedBookingsFromTimetables(
      bookings,
      config.existingTimetables,
      new Set(config.excludeTimetableId ? [config.excludeTimetableId] : []),
    );
  }

  const opts: AutoGenerateConfig = { ...config, grade, section };
  const subjectTeachers = resolveSubjectTeachers(grade, opts);
  const subjects = subjectsForGrade(grade);
  const venue = slotVenue(grade, section);
  let filled = 0;

  for (const subject of subjects) {
    const existing = countSubjectInGrid(next, subject.id, subject.code);
    const weekCap = maxPeriodsPerSubjectPerWeek(schedule);
    const needed = Math.max(
      0,
      Math.min(periodsForSubject(subject, config.subjectPeriodsPerWeek), weekCap) - existing,
    );
    if (needed === 0) continue;

    const preferredId = subjectTeachers[subject.id];
    const preferred =
      (preferredId ? teacherById(preferredId) : null) ?? rankTeachersByExperience(subject)[0];
    if (!preferred) continue;
    const preference = config.subjectPlacementPreferences?.[subject.id] ?? "any";
    const tryTeachers = [
      preferred,
      ...rankTeachersByExperience(subject).filter((t) => t.id !== preferred.id),
    ];

    for (let n = 0; n < needed; n++) {
      let placed = false;
      const dayFillLoads = days.map((_, dayIdx) =>
        (next[dayIdx] ?? []).filter((s) => s != null).length,
      );
      const candidates = teachingSlots(schedule)
        .filter((slot) => matchesLunchPreference(schedule, slot.period, preference))
        .sort((a, b) => dayFillLoads[a.day]! - dayFillLoads[b.day]! || a.period - b.period);

      for (const teacher of tryTeachers) {
        for (const { day, period } of candidates) {
          if (next[day]?.[period]) continue;
          if (subjectOccupiesDay(next, subject.id, subject.code, day)) continue;
          const row = schedule.periodRows[period]!;
          const dayName = days[day]!.name;
          if (isTeacherBookedAt(bookings, teacher.id, dayName, row.start, row.end)) continue;
          if (isRoomBookedAt(bookings, venue, dayName, row.start, row.end)) continue;

          next[day]![period] = {
            subjectId: subject.id,
            subject: subject.code,
            teacherId: teacher.id,
            teacher: teacher.name,
            room: venue,
          };
          bookings.add(bookingKey(teacher.id, dayName, row.start, row.end));
          if (venue) {
            bookings.add(bookingKey(roomResourceId(venue), dayName, row.start, row.end));
          }
          filled++;
          placed = true;
          break;
        }
        if (placed) break;
      }
      if (!placed) break;
    }
  }

  // Optional: fill leftover empty cells only when explicitly requested.
  if (config.fillBeyondQuotas) {
    for (const { day, period } of teachingSlots(schedule)) {
      if (next[day]?.[period]) continue;
      for (const subject of subjects) {
        if (subjectOccupiesDay(next, subject.id, subject.code, day)) continue;
        const teacherId = subjectTeachers[subject.id];
        const teacher =
          (teacherId ? teacherById(teacherId) : null) ?? rankTeachersByExperience(subject)[0];
        if (!teacher) continue;
        const row = schedule.periodRows[period]!;
        const dayName = days[day]!.name;
        if (isTeacherBookedAt(bookings, teacher.id, dayName, row.start, row.end)) continue;
        next[day]![period] = {
          subjectId: subject.id,
          subject: subject.code,
          teacherId: teacher.id,
          teacher: teacher.name,
          room: venue,
        };
        bookings.add(bookingKey(teacher.id, dayName, row.start, row.end));
        filled++;
        break;
      }
    }
  }

  return { grid: next, filled };
}

function buildInitialTimetables(): TimetableRecord[] {
  const term = "2025–26 · Term 2";
  const schedule = DEFAULT_SCHEDULE;
  const today = new Date().toISOString().slice(0, 10);
  const specs = isCollegeMode()
    ? [
        { id: "TT-MPC-FYA", grade: "MPC · 1st Year", section: "A", status: "published" as const },
        { id: "TT-BIPC-FYA", grade: "BIPC · 1st Year", section: "A", status: "published" as const },
        { id: "TT-MPC-SYB", grade: "MPC · 2nd Year", section: "B", status: "draft" as const },
        { id: "TT-CEC-SYA", grade: "CEC · 2nd Year", section: "A", status: "published" as const },
      ]
    : [
        { id: "TT-10A", grade: "Grade 10", section: "A", status: "published" as const },
        { id: "TT-10B", grade: "Grade 10", section: "B", status: "published" as const },
        { id: "TT-12A", grade: "Grade 12", section: "A", status: "draft" as const },
        { id: "TT-11A", grade: "Grade 11", section: "A", status: "published" as const },
        { id: "TT-12B", grade: "Grade 12", section: "B", status: "published" as const },
        { id: "TT-9A", grade: "Grade 9", section: "A", status: "published" as const },
      ];

  const assignments = assignSubjectTeachersByExperience(getInstituteClassesList());
  const bookings: TeacherBooking = new Set();
  const records: TimetableRecord[] = [];

  for (const spec of specs) {
    const ck = classKey(spec.grade, spec.section);
    const subs = subjectsForGrade(spec.grade);
    const subjectPeriodsPerWeek = buildDefaultSubjectPeriods(subs);
    const subjectPlacementPreferences = Object.fromEntries(
      subs.map((s) => [s.id, "any" as PlacementPreference]),
    );
    const subjectSlotSelections = buildDefaultSubjectSlotSelections(
      subs,
      schedule,
      subjectPeriodsPerWeek,
      subjectPlacementPreferences,
    );
    const subjectTeachers = mergeSubjectTeachersForGrade(
      spec.grade,
      spec.section,
      assignments[ck] ?? {},
    );
    const { grid, relaxedNotices } = fillGridFromSubjectTeachers(
      spec.grade,
      spec.section,
      subjectTeachers,
      bookings,
      slotVenue(spec.grade, spec.section),
      schedule,
      subjectPeriodsPerWeek,
      subjectSlotSelections,
      subjectPlacementPreferences,
    );
    records.push({
      id: spec.id,
      grade: spec.grade,
      section: spec.section,
      term,
      status: spec.status,
      grid,
      schedule,
      subjectPeriodsPerWeek,
      subjectSlotSelections,
      subjectTeachers,
      subjectPlacementPreferences,
      relaxedPreferenceNotices: relaxedNotices,
      updatedAt: today,
    });
  }

  return records;
}

export function getInitialTimetables(): TimetableRecord[] {
  if (isRegisteredAdminTenant()) return [];
  return buildInitialTimetables();
}

INITIAL_TIMETABLES = buildInitialTimetables();
