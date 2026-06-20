/** Timetable domain — periods, teachers, grids, conflict detection, auto-generation. */

import {
  GRADES,
  getInstituteTeachers,
  getSubjectsByGrade,
  teachersForSubjectCode,
  type InstituteTeacher,
} from "@/lib/subjects-data";
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

export { GRADES, getSubjectsByGrade, getInstituteTeachers };
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

export const SECTIONS = ["A", "B", "C"] as const;

export type TeacherAssignMode = "manual" | "auto";
export type GenerateScope = "current" | "all";

export type InstituteClass = { id: string; grade: string; section: string };

/** All class sections in the institute — used for bulk timetable generation. */
export const INSTITUTE_CLASSES: InstituteClass[] = [
  { id: "12-A", grade: "Grade 12", section: "A" },
  { id: "12-B", grade: "Grade 12", section: "B" },
  { id: "11-A", grade: "Grade 11", section: "A" },
  { id: "11-C", grade: "Grade 11", section: "C" },
  { id: "10-A", grade: "Grade 10", section: "A" },
  { id: "9-B", grade: "Grade 9", section: "B" },
];

export type AutoGenerateConfig = {
  teacherMode: TeacherAssignMode;
  grade: string;
  section: string;
  schedule: TimetableScheduleConfig;
  /** Required when teacherMode is manual — subjectId → teacherId */
  subjectTeachers?: Record<string, string>;
  /** Other timetables used to avoid double-booking teachers */
  existingTimetables?: TimetableRecord[];
  excludeTimetableId?: string;
};

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
  updatedAt: string;
};

export function getRecordSchedule(record: TimetableRecord | null | undefined): TimetableScheduleConfig {
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

function seedBookingsFromTimetables(bookings: TeacherBooking, timetables: TimetableRecord[], skipIds?: Set<string>) {
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

/** Sample grids — Grade 10-A has full schedule; 12-A shares Sarah Jenkins P1 Mon with 10-A (demo conflict). */
function buildGrade10A(): TimetableGrid {
  return emptyGrid();
}

function buildGrade12A(): TimetableGrid {
  return emptyGrid();
}

export const INITIAL_TIMETABLES: TimetableRecord[] = [
  { id: "TT-10A", grade: "Grade 10", section: "A", term: "2025–26 · Term 2", status: "published", grid: buildGrade10A(), schedule: DEFAULT_SCHEDULE, updatedAt: "2026-06-01" },
  { id: "TT-12A", grade: "Grade 12", section: "A", term: "2025–26 · Term 2", status: "draft", grid: buildGrade12A(), schedule: DEFAULT_SCHEDULE, updatedAt: "2026-06-02" },
  { id: "TT-11A", grade: "Grade 11", section: "A", term: "2025–26 · Term 2", status: "published", grid: buildGrade10A(), schedule: DEFAULT_SCHEDULE, updatedAt: "2026-05-28" },
  { id: "TT-12B", grade: "Grade 12", section: "B", term: "2025–26 · Term 2", status: "published", grid: emptyGrid(), schedule: DEFAULT_SCHEDULE, updatedAt: "2026-05-20" },
];

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

    const sample = subjectsForGrade(classesWithSubject[0]!.grade).find((s) => s.name === subjectName)!;
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

/** Suggest teachers for one class using institute-wide experience rules. */
export function autoSuggestSubjectTeachers(
  grade: string,
  section: string,
  _existingTimetables: TimetableRecord[] = [],
): Record<string, string> {
  const assignments = assignSubjectTeachersByExperience(INSTITUTE_CLASSES);
  return assignments[classKey(grade, section)] ?? {};
}

function resolveSubjectTeachers(
  grade: string,
  config: AutoGenerateConfig,
): Record<string, string> {
  if (config.subjectTeachers && Object.keys(config.subjectTeachers).length > 0) {
    return config.subjectTeachers;
  }
  return autoSuggestSubjectTeachers(grade, config.section, config.existingTimetables ?? []);
}

export function detectConflicts(timetables: TimetableRecord[], focusId?: string): TimetableConflict[] {
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
    seedBookingsFromTimetables(localBookings, opts.existingTimetables, new Set(opts.excludeTimetableId ? [opts.excludeTimetableId] : []));
  }

  const { grid } = fillGridFromSubjectTeachers(grade, section, subjectTeachers, localBookings, venue, opts.schedule);
  return grid;
}

function fillGridFromSubjectTeachers(
  grade: string,
  section: string,
  subjectTeachers: Record<string, string>,
  bookings: TeacherBooking,
  venue: string,
  schedule: TimetableScheduleConfig,
): { grid: TimetableGrid; unplaced: number } {
  const grid: TimetableGrid = emptyGridForSchedule(schedule);
  const subjects = subjectsForGrade(grade);
  const slots = teachingSlots(schedule);
  const teachers = getInstituteTeachers();
  let unplaced = 0;
  let slotIdx = 0;

  for (const subject of subjects) {
    const teacherId = subjectTeachers[subject.id];
    const teacher = teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
    if (!teacher) continue;

    for (let n = 0; n < subject.periodsPerWeek && slotIdx < slots.length; n++) {
      let placed = false;
      for (let attempt = 0; attempt < slots.length && !placed; attempt++) {
        const idx = (slotIdx + attempt) % slots.length;
        const { day, period } = slots[idx]!;
        if (grid[day]![period]) continue;
        if (isTeacherBooked(bookings, teacher.id, day, period)) continue;

        grid[day]![period] = {
          subjectId: subject.id,
          subject: subject.code,
          teacherId: teacher.id,
          teacher: teacher.name,
          room: venue,
        };
        bookings.add(bookingKey(teacher.id, day, period));
        slotIdx = idx + 1;
        placed = true;
      }
      if (!placed) {
        unplaced++;
        slotIdx++;
      }
    }
  }

  return { grid, unplaced };
}

/** Generate timetables for every institute class in one pass — no teacher double-booked at the same period. */
export function generateAllInstituteTimetables(
  existing: TimetableRecord[],
  term: string,
  schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE,
  classes: InstituteClass[] = INSTITUTE_CLASSES,
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
    const { grid, unplaced } = fillGridFromSubjectTeachers(cls.grade, cls.section, subjectTeachers, bookings, venue, schedule);
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

export function countEmptySlots(grid: TimetableGrid, schedule: TimetableScheduleConfig = DEFAULT_SCHEDULE): number {
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
    let needed = Math.max(0, subject.periodsPerWeek - existing);
    if (needed === 0) continue;

    const teacherId = subjectTeachers[subject.id];
    const teacher = teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
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
      const teacher = teachers.find((t) => t.id === teacherId) ?? rankTeachersByExperience(subject)[0];
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
