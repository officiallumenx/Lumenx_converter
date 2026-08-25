import { readAdminDataScopeKey } from "@/lib/admin-tenant";

import { loadClassDirectory, saveClassDirectory } from "@/lib/class-directory-store";
import {
  getInitialTimetables,
  type TimetableRecord,
} from "@/lib/timetable-data";
import {
  buildScheduleConfig,
  defaultScheduleInput,
  scheduleInputFromConfig,
  type ScheduleInput,
  type TimetableScheduleConfig,
} from "@/lib/timetable-schedule";

const KEY_PREFIX = "lumenx.admin.timetables.v2";
const SCHEDULE_KEY_PREFIX = "lumenx.admin.timetable-schedule.v1";

function storageKey(): string {
  return `${KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function scheduleStorageKey(): string {
  return `${SCHEDULE_KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function normalizeRecord(record: TimetableRecord): TimetableRecord {
  const schedule = record.schedule
    ? buildScheduleConfig(scheduleInputFromConfig(record.schedule))
    : record.schedule;
  return {
    ...record,
    schedule,
    subjectPeriodsPerWeek: record.subjectPeriodsPerWeek ?? {},
    subjectSlotSelections: record.subjectSlotSelections ?? {},
    subjectTeachers: record.subjectTeachers ?? {},
    subjectPlacementPreferences: record.subjectPlacementPreferences ?? {},
    relaxedPreferenceNotices: record.relaxedPreferenceNotices ?? [],
    lockedCells: record.lockedCells ?? [],
  };
}

function syncClassHasTimetable(records: TimetableRecord[]): void {
  try {
    const classes = loadClassDirectory();
    const keys = new Set(records.map((r) => `${r.grade}::${r.section}`));
    let changed = false;
    const next = classes.map((cls) => {
      const hasTimetable = keys.has(`${cls.timetableGrade}::${cls.section}`);
      if (cls.hasTimetable === hasTimetable) return cls;
      changed = true;
      return { ...cls, hasTimetable };
    });
    if (changed) saveClassDirectory(next);
  } catch {
    // Class directory sync is best-effort in the prototype.
  }
}

export function loadInstituteScheduleDefault(): ScheduleInput {
  try {
    const raw = localStorage.getItem(scheduleStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as ScheduleInput;
      if (parsed && Array.isArray(parsed.days)) {
        return parsed;
      }
    }
  } catch {
    // Fall through.
  }
  return defaultScheduleInput();
}

export function saveInstituteScheduleDefault(input: ScheduleInput): void {
  try {
    localStorage.setItem(scheduleStorageKey(), JSON.stringify(input));
  } catch {
    // Keep the page usable when storage is unavailable.
  }
}

export function loadInstituteScheduleConfig(): TimetableScheduleConfig {
  return buildScheduleConfig(loadInstituteScheduleDefault());
}

export function loadTimetableDirectory(): TimetableRecord[] {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      const parsed = JSON.parse(raw) as TimetableRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeRecord);
      }
    }
  } catch {
    // Fall through to seed.
  }
  const seed = getInitialTimetables().map(normalizeRecord);
  saveTimetableDirectory(seed);
  return seed;
}

export function saveTimetableDirectory(records: TimetableRecord[]): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(records));
  } catch {
    // Keep the page usable when storage is unavailable.
  }
  syncClassHasTimetable(records);
}

export function findTimetableById(id: string): TimetableRecord | null {
  return loadTimetableDirectory().find((record) => record.id === id) ?? null;
}

export function findTimetableForClass(
  timetableGrade: string,
  section: string,
): TimetableRecord | null {
  return (
    loadTimetableDirectory().find(
      (record) => record.grade === timetableGrade && record.section === section,
    ) ?? null
  );
}

export function upsertTimetableRecord(
  records: TimetableRecord[],
  next: TimetableRecord,
): TimetableRecord[] {
  const exists = records.some((record) => record.id === next.id);
  const updated = exists
    ? records.map((record) => (record.id === next.id ? next : record))
    : [...records, next];
  saveTimetableDirectory(updated);
  return updated;
}

export function replaceTimetableDirectory(records: TimetableRecord[]): TimetableRecord[] {
  saveTimetableDirectory(records);
  return records;
}
