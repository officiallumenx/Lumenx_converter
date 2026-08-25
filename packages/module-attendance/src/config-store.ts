/**
 * Versioned attendance configuration (Admin writes · Connect/engine reads).
 * Past versions are never mutated or deleted.
 */

import type {
  AttendanceConfigScope,
  AttendanceConfigSnapshot,
  AttendanceConfigVersion,
  AttendanceMethod,
  AttendanceOwner,
} from "./types";
import {
  canonicalAttendanceClassId,
  normalizeAttendanceSectionKey,
  normalizeAttendanceSectionKeys,
} from "./identity";

export const ATTENDANCE_CONFIG_STORAGE_KEY = "lumenx.attendance-config.v1";

export const ATTENDANCE_METHOD_OPTIONS: {
  value: AttendanceMethod;
  label: string;
  description: string;
}[] = [
  {
    value: "daily",
    label: "Daily",
    description: "One attendance mark for the entire school day",
  },
  {
    value: "morning_first_period",
    label: "Morning First",
    description:
      "Single morning capture bound to the first timetable period (subject used for Current Period Teacher)",
  },
  {
    value: "morning_afternoon",
    label: "Morning + Afternoon",
    description: "Separate morning and afternoon session marks",
  },
  {
    value: "period_wise",
    label: "Period Wise",
    description: "Attendance marked for each timetable period",
  },
];

export const ATTENDANCE_OWNER_OPTIONS: {
  value: AttendanceOwner;
  label: string;
  description: string;
}[] = [
  {
    value: "class_teacher",
    label: "Class Teacher",
    description: "Homeroom / class teacher takes attendance",
  },
  {
    value: "current_period_teacher",
    label: "Current Period Teacher",
    description:
      "Subject teacher of each period (or first period for Morning First) takes attendance",
  },
  {
    value: "attendance_incharge",
    label: "Attendance Coordinator",
    description: "Designated attendance coordinator takes attendance",
  },
];

export const ATTENDANCE_SCOPE_OPTIONS: {
  value: AttendanceConfigScope;
  label: string;
  description: string;
}[] = [
  {
    value: "institute",
    label: "Entire Institute",
    description: "Same rules for the whole school",
  },
  {
    value: "class",
    label: "Class",
    description: "Apply to selected class(es) only",
  },
  {
    value: "section",
    label: "Section",
    description: "Apply to selected class · section(s) only",
  },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function seedSnapshot(): AttendanceConfigSnapshot {
  /**
   * Example academic-year policy chain:
   * Apr–May Daily → Jun–Aug Morning+Afternoon → Sep onwards Period Wise
   * Each row has Effective From; prior history is never rewritten.
   */
  return {
    versions: [
      {
        id: "att-cfg-seed-daily",
        effectiveFrom: "2026-04-01",
        method: "daily",
        owner: "class_teacher",
        scope: "institute",
        classTargets: [],
        sectionTargets: [],
        createdAt: "2026-03-15T10:00:00.000Z",
        createdBy: "System",
      },
      {
        id: "att-cfg-seed-ma",
        effectiveFrom: "2026-06-01",
        method: "morning_afternoon",
        owner: "class_teacher",
        scope: "institute",
        classTargets: [],
        sectionTargets: [],
        createdAt: "2026-05-20T10:00:00.000Z",
        createdBy: "System",
      },
      {
        id: "att-cfg-seed-period",
        effectiveFrom: "2026-09-01",
        method: "period_wise",
        owner: "current_period_teacher",
        scope: "institute",
        classTargets: [],
        sectionTargets: [],
        createdAt: "2026-08-25T10:00:00.000Z",
        createdBy: "System",
      },
    ],
  };
}

function normalizeVersion(row: AttendanceConfigVersion): AttendanceConfigVersion {
  return {
    id: String(row.id),
    effectiveFrom: String(row.effectiveFrom).slice(0, 10),
    method: row.method,
    owner: row.owner,
    scope: row.scope,
    classTargets: Array.isArray(row.classTargets)
      ? row.classTargets.map(canonicalAttendanceClassId).filter(Boolean)
      : [],
    sectionTargets: Array.isArray(row.sectionTargets)
      ? normalizeAttendanceSectionKeys(row.sectionTargets)
      : [],
    createdAt: String(row.createdAt),
    createdBy: String(row.createdBy || "Admin"),
  };
}

/** In-memory fallback when localStorage is unavailable (Node / tests). */
let memorySnapshot: AttendanceConfigSnapshot | null = null;

function readRaw(): AttendanceConfigSnapshot | null {
  if (typeof localStorage === "undefined") {
    return memorySnapshot
      ? { versions: memorySnapshot.versions.map(normalizeVersion) }
      : null;
  }
  try {
    const raw = localStorage.getItem(ATTENDANCE_CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AttendanceConfigSnapshot;
    if (!parsed || !Array.isArray(parsed.versions)) return null;
    return { versions: parsed.versions.map(normalizeVersion) };
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: AttendanceConfigSnapshot): void {
  memorySnapshot = {
    versions: snapshot.versions.map(normalizeVersion),
  };
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(ATTENDANCE_CONFIG_STORAGE_KEY, JSON.stringify(memorySnapshot));
  } catch {
    /* ignore */
  }
}

export function loadAttendanceConfigVersions(): AttendanceConfigVersion[] {
  const snap = readRaw() ?? seedSnapshot();
  if (!readRaw()) writeSnapshot(snap);
  return [...snap.versions].sort((a, b) => {
    const d = a.effectiveFrom.localeCompare(b.effectiveFrom);
    if (d !== 0) return d;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function attendanceMethodLabel(method: AttendanceMethod): string {
  return ATTENDANCE_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

export function attendanceOwnerLabel(owner: AttendanceOwner): string {
  return ATTENDANCE_OWNER_OPTIONS.find((o) => o.value === owner)?.label ?? owner;
}

export function attendanceScopeLabel(scope: AttendanceConfigScope): string {
  return ATTENDANCE_SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
}

export type NewAttendanceConfigInput = {
  effectiveFrom: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  classTargets?: string[];
  sectionTargets?: string[];
  createdBy?: string;
};

export type AttendanceConfigValidationError =
  | "effective_from_required"
  | "effective_from_invalid"
  | "class_targets_required"
  | "section_targets_required";

export function validateNewAttendanceConfig(
  input: NewAttendanceConfigInput,
): AttendanceConfigValidationError | null {
  const date = input.effectiveFrom?.trim();
  if (!date) return "effective_from_required";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "effective_from_invalid";
  if (input.scope === "class" && !(input.classTargets?.length)) {
    return "class_targets_required";
  }
  if (input.scope === "section" && !(input.sectionTargets?.length)) {
    return "section_targets_required";
  }
  return null;
}

export function appendAttendanceConfig(
  input: NewAttendanceConfigInput,
): AttendanceConfigVersion {
  const error = validateNewAttendanceConfig(input);
  if (error) throw new Error(error);

  const versions = loadAttendanceConfigVersions();
  const next: AttendanceConfigVersion = {
    id: `att-cfg-${Date.now()}`,
    effectiveFrom: input.effectiveFrom.trim().slice(0, 10),
    method: input.method,
    owner: input.owner,
    scope: input.scope,
    classTargets:
      input.scope === "class"
        ? (input.classTargets ?? []).map(canonicalAttendanceClassId).filter(Boolean)
        : [],
    sectionTargets:
      input.scope === "section"
        ? normalizeAttendanceSectionKeys(input.sectionTargets ?? [])
        : [],
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy?.trim() || "Admin",
  };

  writeSnapshot({ versions: [...versions, next] });
  return next;
}

export function resolveAttendanceConfigForDate(
  date: string,
  opts?: { classLabel?: string; sectionKey?: string },
): AttendanceConfigVersion | null {
  const onOrBefore = loadAttendanceConfigVersions().filter(
    (v) => v.effectiveFrom <= date,
  );
  if (onOrBefore.length === 0) return null;

  const sectionKey = opts?.sectionKey
    ? normalizeAttendanceSectionKey(opts.sectionKey)
    : undefined;
  const classLabel = opts?.classLabel
    ? canonicalAttendanceClassId(opts.classLabel)
    : undefined;

  const sectionMatch = sectionKey
    ? [...onOrBefore]
        .reverse()
        .find(
          (v) =>
            v.scope === "section" &&
            v.sectionTargets.some(
              (t) => normalizeAttendanceSectionKey(t) === sectionKey,
            ),
        )
    : undefined;
  if (sectionMatch) return sectionMatch;

  const classMatch = classLabel
    ? [...onOrBefore]
        .reverse()
        .find(
          (v) =>
            v.scope === "class" &&
            v.classTargets.some(
              (t) => canonicalAttendanceClassId(t) === classLabel,
            ),
        )
    : undefined;
  if (classMatch) return classMatch;

  const institute = [...onOrBefore]
    .reverse()
    .find((v) => v.scope === "institute");
  return institute ?? onOrBefore[onOrBefore.length - 1] ?? null;
}

export function getActiveAttendanceConfig(
  date = todayIso(),
): AttendanceConfigVersion | null {
  /** Institute default for the date (unscoped). Use resolveAttendanceConfigForDate with class/section for scoped Active. */
  return resolveAttendanceConfigForDate(date);
}

/** Test helper — replace entire snapshot (does not mutate individual historical rows in place). */
export function replaceAttendanceConfigSnapshotForTests(
  snapshot: AttendanceConfigSnapshot,
): void {
  writeSnapshot({ versions: snapshot.versions.map(normalizeVersion) });
}
