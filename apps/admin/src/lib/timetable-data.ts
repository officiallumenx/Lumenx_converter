/** Timetable domain — periods, teachers, grids, conflict detection, auto-generation. */

import {
  GRADES,
  getGrades,
  getInstituteTeachers,
  getSubjectsByGrade,
  teachersForSubjectCode,
  type InstituteTeacher,
} from "@/lib/subjects-data";
import { getInstituteClasses, isCollegeMode } from "@/lib/academic-data";
import {
  DEFAULT_SCHEDULE,
  emptyGridForSchedule,
  getActiveDays,
  isSlotApplicable,
  isTeachingRow,
  teachingSlotsForSchedule,
  countTeachingSlotsPerWeek as countSlotsForSchedule,
  countEmptySlotsForSchedule,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";

export { GRADES, getGrades, getSubjectsByGrade, getInstituteTeachers };
export type { TimetableScheduleConfig } from "@/lib/timetable-schedule";
export type Teacher = InstituteTeacher;

export type Subject = { id: string; name: string; code: string; periodsPerWeek: number };

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

export type InstituteClass = { id: string; grade: string; section: string };

/** All class sections in the institute — used for bulk timetable generation. */
export function getInstituteClassesList(): InstituteClass[] {
  return getInstituteClasses().map(({ id, grade, section }) => ({ id, grade, section }));
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
  /** Other timetables used to avoid double-booking teachers */
  existingTimetables?: TimetableRecord[];
  excludeTimetableId?: string;
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

function bookingKey(teacherId: string, day: number, period: number) {
  return `${teacherId}-${day}-${period}`;
}

function seedBookingsFromTimetables(
  bookings: TeacherBooking,
  timetables: TimetableRecord[],
  skipIds?: Set<string>,
) {
  for (const tt of timetables) {
    if (skipIds?.has(tt.id)) continue;
    tt.grid.forEach((dayCol, dayIdx) => {
      dayCol.forEach((slot, periodIdx) => {
        if (slot?.teacherId) bookings.add(bookingKey(slot.teacherId, dayIdx, periodIdx));
      });
    });
  }
}

function isTeacherBooked(bookings: TeacherBooking, teacherId: string, day: number, period: number) {
  return bookings.has(bookingKey(teacherId, day, period));
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

/** Pick evenly spaced teaching slots for each subject (default weekly layout). */
export function buildDefaultSubjectSlotSelections(
  subjects: Subject[],
  schedule: TimetableScheduleConfig,
  periods?: Record<string, number>,
): Record<string, TimetableCellRef[]> {
  const selections: Record<string, TimetableCellRef[]> = {};
  const used = new Set<string>();
  const slots = teachingSlotsForSchedule(schedule);

  for (const subject of subjects) {
    const count = periods?.[subject.id] ?? subject.periodsPerWeek;
    const cells: TimetableCellRef[] = [];
    for (let n = 0; n < count; n++) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]!;
        const key = cellRefKey(slot);
        if (used.has(key)) continue;
        used.add(key);
        cells.push(slot);
        break;
      }
    }
    selections[subject.id] = cells;
  }
  return selections;
}

export function autoPickSlotsForSubject(
  subjectId: string,
  count: number,
  selections: Record<string, TimetableCellRef[]>,
  schedule: TimetableScheduleConfig,
): Record<string, TimetableCellRef[]> {
  const used = new Set<string>();
  for (const [id, cells] of Object.entries(selections)) {
    if (id === subjectId) continue;
    for (const c of cells) used.add(cellRefKey(c));
  }
  const picked: TimetableCellRef[] = [];
  for (const slot of teachingSlotsForSchedule(schedule)) {
    if (picked.length >= count) break;
    if (used.has(cellRefKey(slot))) continue;
    picked.push(slot);
    used.add(cellRefKey(slot));
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

/** Ensure every subject has a teacher — fills gaps for Sports, Computer Lab, etc. */
export function mergeSubjectTeachersForGrade(
  grade: string,
  section: string,
  partial: Record<string, string>,
): Record<string, string> {
  const fallback =
    assignSubjectTeachersByExperience([{ id: "_tmp", grade, section }])[
      classKey(grade, section)
    ] ?? {};
  const merged: Record<string, string> = {};
  for (const sub of subjectsForGrade(grade)) {
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
  const teacherMap = new Map<string, { classKey: string; day: number; period: number }[]>();
  const roomMap = new Map<string, { classKey: string; day: number; period: number }[]>();

  for (const tt of timetables) {
    const ck = classKey(tt.grade, tt.section);
    const schedule = getRecordSchedule(tt);
    const days = getActiveDays(schedule);
    tt.grid.forEach((dayCol, dayIdx) => {
      dayCol.forEach((slot, periodIdx) => {
        if (!slot || !isTeachingRow(schedule, periodIdx)) return;
        if (!isSlotApplicable(schedule, dayIdx, periodIdx)) return;
        const tKey = `${dayIdx}-${periodIdx}-${slotTeacher(slot)}`;
        const rKey = `${dayIdx}-${periodIdx}-${slot.room}`;
        if (!teacherMap.has(tKey)) teacherMap.set(tKey, []);
        teacherMap.get(tKey)!.push({ classKey: ck, day: dayIdx, period: periodIdx });
        if (!roomMap.has(rKey)) roomMap.set(rKey, []);
        roomMap.get(rKey)!.push({ classKey: ck, day: dayIdx, period: periodIdx });
      });
    });
  }

  const pushConflict = (
    kind: "teacher" | "room",
    key: string,
    entries: { classKey: string; day: number; period: number }[],
    resource: string,
    schedule: TimetableScheduleConfig,
  ) => {
    if (entries.length < 2) return;
    const day = getActiveDays(schedule)[entries[0]!.day]?.name ?? "";
    const period = schedule.periodRows[entries[0]!.period]?.label ?? "";
    conflicts.push({ day, period, kind, resource, classes: entries.map((e) => e.classKey) });
  };

  teacherMap.forEach((entries, key) => {
    const resource = key.split("-").slice(2).join("-");
    const tt = timetables.find((t) => classKey(t.grade, t.section) === entries[0]?.classKey);
    pushConflict("teacher", key, entries, resource, getRecordSchedule(tt));
  });
  roomMap.forEach((entries, key) => {
    const resource = key.split("-").slice(2).join("-");
    const tt = timetables.find((t) => classKey(t.grade, t.section) === entries[0]?.classKey);
    pushConflict("room", key, entries, resource, getRecordSchedule(tt));
  });

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
    tt.grid.forEach((dayCol, dayIdx) => {
      dayCol.forEach((slot, periodIdx) => {
        if (
          skip &&
          skip.timetableId === tt.id &&
          skip.day === dayIdx &&
          skip.period === periodIdx
        ) {
          return;
        }
        if (slot?.teacherId) bookings.add(bookingKey(slot.teacherId, dayIdx, periodIdx));
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
      const periodIdx = schedule.periodRows.findIndex((p) => p.label === c.period && !p.isBreak);
      if (dayIdx < 0 || periodIdx < 0) continue;

      const slot = focus.grid[dayIdx]?.[periodIdx];
      if (!slot?.teacherId) continue;

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
        if (isTeacherBooked(bookings, teacher.id, dayIdx, periodIdx)) continue;

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
  const all = detectConflicts(timetables).filter((c) => c.kind === "teacher");
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

  const { grid } = fillGridFromSubjectTeachers(
    grade,
    section,
    subjectTeachers,
    localBookings,
    venue,
    opts.schedule,
    opts.subjectPeriodsPerWeek,
    opts.subjectSlotSelections,
  );
  return grid;
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
): { grid: TimetableGrid; unplaced: number } {
  const grid: TimetableGrid = emptyGridForSchedule(schedule);
  const subjects = subjectsForGrade(grade);
  const allSlots = teachingSlots(schedule);
  const teachers = getInstituteTeachers();
  let unplaced = 0;

  const teacherFor = (subject: Subject) => {
    const teacherId = subjectTeachers[subject.id];
    return teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
  };

  const placeSlot = (subject: Subject, teacher: Teacher, day: number, period: number) => {
    grid[day]![period] = {
      subjectId: subject.id,
      subject: subject.code,
      teacherId: teacher.id,
      teacher: teacher.name,
      room: venue,
    };
    bookings.add(bookingKey(teacher.id, day, period));
  };

  // Pass 1 — explicit day/period selections
  if (subjectSlotSelections && Object.keys(subjectSlotSelections).length > 0) {
    for (const subject of subjects) {
      const cells = subjectSlotSelections[subject.id] ?? [];
      const teacher = teacherFor(subject);
      if (!teacher) continue;
      for (const { day, period } of cells) {
        if (!isSlotApplicable(schedule, day, period)) continue;
        if (grid[day]?.[period]) continue;
        if (isTeacherBooked(bookings, teacher.id, day, period)) {
          unplaced++;
          continue;
        }
        placeSlot(subject, teacher, day, period);
      }
    }
  }

  // Pass 2 — round-robin auto fill for remaining weekly quotas
  type QueueItem = { subject: Subject; teacher: Teacher; remaining: number };
  const queues: QueueItem[] = subjects
    .map((subject) => {
      const teacher = teacherFor(subject);
      if (!teacher) return null;
      const target = periodsForSubject(subject, subjectPeriodsPerWeek);
      const placed = countSubjectInGrid(grid, subject.id, subject.code);
      const remaining = Math.max(0, target - placed);
      return remaining > 0 ? { subject, teacher, remaining } : null;
    })
    .filter((q): q is QueueItem => q != null);

  let safety = allSlots.length * Math.max(queues.length, 1) + 1;
  while (queues.some((q) => q.remaining > 0) && safety-- > 0) {
    let progress = false;
    for (const q of queues) {
      if (q.remaining <= 0) continue;

      let placed = false;
      for (const { day, period } of allSlots) {
        if (grid[day]?.[period]) continue;
        if (isTeacherBooked(bookings, q.teacher.id, day, period)) continue;
        placeSlot(q.subject, q.teacher, day, period);
        q.remaining--;
        placed = true;
        progress = true;
        break;
      }

      if (!placed) {
        for (const alt of rankTeachersByExperience(q.subject)) {
          if (alt.id === q.teacher.id) continue;
          for (const { day, period } of allSlots) {
            if (grid[day]?.[period]) continue;
            if (isTeacherBooked(bookings, alt.id, day, period)) continue;
            q.teacher = alt;
            placeSlot(q.subject, alt, day, period);
            q.remaining--;
            placed = true;
            progress = true;
            break;
          }
          if (placed) break;
        }
      }

      if (!placed) {
        unplaced += q.remaining;
        q.remaining = 0;
      }
    }
    if (!progress) break;
  }

  return { grid, unplaced };
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
    const subjectTeachers = assignments[ck] ?? {};
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

/** Fill only empty cells — keeps existing assignments. */
export function fillEmptySlots(
  grade: string,
  section: string,
  existingGrid: TimetableGrid,
  config: AutoGenerateConfig,
): { grid: TimetableGrid; filled: number } {
  const schedule = config.schedule;
  const next = existingGrid.map((col) => [...col]);
  const bookings: TeacherBooking = new Set();

  next.forEach((dayCol, dayIdx) => {
    dayCol.forEach((slot, periodIdx) => {
      if (slot?.teacherId) bookings.add(bookingKey(slot.teacherId, dayIdx, periodIdx));
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
  const teachers = getInstituteTeachers();
  const venue = slotVenue(grade, section);
  let filled = 0;

  for (const subject of subjects) {
    const existing = countSubjectInGrid(next, subject.id, subject.code);
    const needed = Math.max(0, periodsForSubject(subject, config.subjectPeriodsPerWeek) - existing);
    if (needed === 0) continue;

    const teacherId = subjectTeachers[subject.id];
    const teacher =
      teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
    if (!teacher) continue;

    for (let n = 0; n < needed; n++) {
      let placed = false;
      for (const { day, period } of teachingSlots(schedule)) {
        if (next[day]?.[period]) continue;
        if (isTeacherBooked(bookings, teacher.id, day, period)) continue;

        next[day]![period] = {
          subjectId: subject.id,
          subject: subject.code,
          teacherId: teacher.id,
          teacher: teacher.name,
          room: venue,
        };
        bookings.add(bookingKey(teacher.id, day, period));
        filled++;
        placed = true;
        break;
      }
      if (!placed) break;
    }
  }

  for (const { day, period } of teachingSlots(schedule)) {
    if (next[day]?.[period]) continue;
    for (const subject of subjects) {
      const teacherId = subjectTeachers[subject.id];
      const teacher =
        teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
      if (!teacher || isTeacherBooked(bookings, teacher.id, day, period)) continue;
      next[day]![period] = {
        subjectId: subject.id,
        subject: subject.code,
        teacherId: teacher.id,
        teacher: teacher.name,
        room: venue,
      };
      bookings.add(bookingKey(teacher.id, day, period));
      filled++;
      break;
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
        { id: "TT-12A", grade: "Grade 12", section: "A", status: "draft" as const },
        { id: "TT-11A", grade: "Grade 11", section: "A", status: "published" as const },
        { id: "TT-12B", grade: "Grade 12", section: "B", status: "published" as const },
      ];

  const assignments = assignSubjectTeachersByExperience(getInstituteClassesList());
  const bookings: TeacherBooking = new Set();
  const records: TimetableRecord[] = [];

  for (const spec of specs) {
    const ck = classKey(spec.grade, spec.section);
    const subs = subjectsForGrade(spec.grade);
    const subjectPeriodsPerWeek = buildDefaultSubjectPeriods(subs);
    const subjectSlotSelections = buildDefaultSubjectSlotSelections(
      subs,
      schedule,
      subjectPeriodsPerWeek,
    );
    const subjectTeachers = mergeSubjectTeachersForGrade(
      spec.grade,
      spec.section,
      assignments[ck] ?? {},
    );
    const { grid } = fillGridFromSubjectTeachers(
      spec.grade,
      spec.section,
      subjectTeachers,
      bookings,
      slotVenue(spec.grade, spec.section),
      schedule,
      subjectPeriodsPerWeek,
      subjectSlotSelections,
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
      updatedAt: today,
    });
  }

  return records;
}

export function getInitialTimetables(): TimetableRecord[] {
  return buildInitialTimetables();
}

INITIAL_TIMETABLES = buildInitialTimetables();
