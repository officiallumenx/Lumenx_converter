import type { DemoAcademicConfig, DemoAcademicLevel } from "@lumenx/types";

import { getAcademicConfig, isCollegeMode } from "@/lib/academic-data";
import { loadClassDirectory } from "@/lib/class-directory-store";
import {
  matchesClassSection,
  parseCollegeBatch,
} from "@/lib/class-section-filter";
import { loadStudentDirectory } from "@/lib/student-directory-store";

type ConnectAdmissionOpening = {
  id: string;
  instituteId: string;
  name: string;
  grades: string[];
  seatsAvailable: number;
  status: "draft" | "open" | "closed";
  description: string;
  updatedAt: string;
};

export const OPENINGS_STORAGE_KEY = "ues_admissions_openings";

/** @deprecated Prefer ClassSeatAvailabilityRow via buildClassSeatAvailability(). */
export type SeatByClassRow = {
  classLabel: string;
  seatsAvailable: number;
  openings: number;
  waitlistOnly: number;
};

export type ClassSeatAvailabilityRow = {
  classLabel: string;
  totalCapacity: number;
  occupied: number;
  available: number;
  /** Whether Connect admissions openings contributed to this row. */
  hasOpening: boolean;
  /** How total capacity was resolved when no opening overrides intake. */
  source: "class-directory" | "default";
};

const WAITLIST_ONLY_TAG = "Waitlist Only";
const DEFAULT_CLASS_CAPACITY = 50;

function readOpeningsStore(): ConnectAdmissionOpening[] {
  try {
    const raw = localStorage.getItem(OPENINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConnectAdmissionOpening[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOpeningsStore(items: ConnectAdmissionOpening[]) {
  try {
    localStorage.setItem(OPENINGS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage failures in demo mode.
  }
}

function normalizeClassLabel(value: string): string {
  const text = value.trim().toLowerCase();
  if (!text) return "";
  const gradeMatch = text.match(/^grade\s+(\d+)$/);
  if (gradeMatch) return `class ${gradeMatch[1]}`;
  const classMatch = text.match(/^class\s+(\d+)$/);
  if (classMatch) return `class ${classMatch[1]}`;
  return text.replace(/\s+/g, " ");
}

function matchesOpeningClass(opening: ConnectAdmissionOpening, className: string): boolean {
  const target = normalizeClassLabel(className);
  if (!target) return false;
  const name = normalizeClassLabel(opening.name);
  if (name === target) return true;
  return opening.grades.some((grade) => normalizeClassLabel(grade) === target);
}

function withWaitlistOnlyTag(description: string, enabled: boolean): string {
  const clean = description
    .replace(new RegExp(`\\s*\\[${WAITLIST_ONLY_TAG}\\]\\s*`, "gi"), " ")
    .trim();
  if (!enabled) return clean;
  return clean ? `${clean} [${WAITLIST_ONLY_TAG}]` : `[${WAITLIST_ONLY_TAG}]`;
}

function nonNegativeAvailable(totalCapacity: number, occupied: number): number {
  return Math.max(0, Math.floor(totalCapacity) - Math.max(0, Math.floor(occupied)));
}

function countStudentsForLevel(
  level: DemoAcademicLevel,
  students: ReturnType<typeof loadStudentDirectory>,
): number {
  if (isCollegeMode()) {
    return students.filter((student) => {
      const batch = parseCollegeBatch(student.grade);
      return batch?.yearShort === level.shortLabel;
    }).length;
  }
  return students.filter((student) =>
    matchesClassSection(student.grade, level.shortLabel, "all", "all"),
  ).length;
}

function sumCapacityForLevel(
  levelId: string,
  classes: ReturnType<typeof loadClassDirectory>,
): number {
  return classes
    .filter((section) => section.levelId === levelId)
    .reduce((sum, section) => sum + Math.max(0, Math.floor(section.capacity)), 0);
}

function resolveCapacityForLevel(
  level: DemoAcademicLevel,
  classes: ReturnType<typeof loadClassDirectory>,
): { totalCapacity: number; source: ClassSeatAvailabilityRow["source"] } {
  const summed = sumCapacityForLevel(level.id, classes);
  if (summed > 0) return { totalCapacity: summed, source: "class-directory" };
  return { totalCapacity: DEFAULT_CLASS_CAPACITY, source: "default" };
}

function findLevelForClassLabel(
  classLabel: string,
  academic: DemoAcademicConfig,
): DemoAcademicLevel | undefined {
  const target = normalizeClassLabel(classLabel);
  if (!target) return undefined;

  const direct = academic.levels.find(
    (level) => normalizeClassLabel(level.label) === target,
  );
  if (direct) return direct;

  const classMatch = target.match(/^class\s+(\d+)$/);
  if (classMatch) {
    return academic.levels.find((level) => level.shortLabel === classMatch[1]);
  }

  return undefined;
}

function countStudentsForClassLabel(
  classLabel: string,
  academic: DemoAcademicConfig,
  students: ReturnType<typeof loadStudentDirectory>,
): number {
  const level = findLevelForClassLabel(classLabel, academic);
  if (level) return countStudentsForLevel(level, students);

  const classMatch = normalizeClassLabel(classLabel).match(/^class\s+(\d+)$/);
  if (classMatch) {
    return students.filter((student) =>
      matchesClassSection(student.grade, classMatch[1]!, "all", "all"),
    ).length;
  }

  return 0;
}

function resolveCapacityForClassLabel(
  classLabel: string,
  academic: DemoAcademicConfig,
  classes: ReturnType<typeof loadClassDirectory>,
): { totalCapacity: number; source: ClassSeatAvailabilityRow["source"] } {
  const level = findLevelForClassLabel(classLabel, academic);
  if (level) return resolveCapacityForLevel(level, classes);
  return { totalCapacity: DEFAULT_CLASS_CAPACITY, source: "default" };
}

function aggregateOpeningSeats(
  instituteId: string | undefined,
): Map<string, { seatsAvailable: number; openings: number; waitlistOnly: number }> {
  const bucket = new Map<
    string,
    { seatsAvailable: number; openings: number; waitlistOnly: number }
  >();

  for (const opening of readOpeningsStore()) {
    if (instituteId && opening.instituteId && opening.instituteId !== instituteId) continue;
    const labels =
      Array.isArray(opening.grades) && opening.grades.length > 0
        ? opening.grades
        : [opening.name];
    for (const classLabel of labels) {
      const key = classLabel.trim() || "Unknown";
      const prev = bucket.get(key) ?? { seatsAvailable: 0, openings: 0, waitlistOnly: 0 };
      bucket.set(key, {
        seatsAvailable:
          prev.seatsAvailable + Math.max(0, Math.floor(opening.seatsAvailable ?? 0)),
        openings: prev.openings + 1,
        waitlistOnly: prev.waitlistOnly + (opening.seatsAvailable <= 0 ? 1 : 0),
      });
    }
  }

  return bucket;
}

function mergeRow(input: {
  classLabel: string;
  totalCapacity: number;
  occupied: number;
  source: ClassSeatAvailabilityRow["source"];
  openingSeats: number | null;
}): ClassSeatAvailabilityRow {
  const hasOpening = input.openingSeats !== null;
  const derivedAvailable = nonNegativeAvailable(input.totalCapacity, input.occupied);
  const available = hasOpening
    ? Math.min(Math.max(0, Math.floor(input.openingSeats!)), derivedAvailable)
    : derivedAvailable;

  return {
    classLabel: input.classLabel,
    totalCapacity: Math.max(0, Math.floor(input.totalCapacity)),
    occupied: Math.max(0, Math.floor(input.occupied)),
    available,
    hasOpening,
    source: input.source,
  };
}

/**
 * Build seat availability for each configured academic level, using:
 * - class directory capacity (fallback default 50)
 * - live student directory occupancy
 * - Connect opening remaining seats when present
 */
export function buildClassSeatAvailability(
  instituteId?: string,
  academic: DemoAcademicConfig = getAcademicConfig(),
): ClassSeatAvailabilityRow[] {
  const classes = loadClassDirectory();
  const students = loadStudentDirectory();
  const openingByLabel = aggregateOpeningSeats(instituteId);
  const rows = new Map<string, ClassSeatAvailabilityRow>();

  for (const level of academic.levels) {
    const { totalCapacity, source } = resolveCapacityForLevel(level, classes);
    const occupied = countStudentsForLevel(level, students);
    const opening = [...openingByLabel.entries()].find(([label]) =>
      findLevelForClassLabel(label, academic)?.id === level.id,
    );

    rows.set(level.label, mergeRow({
      classLabel: level.label,
      totalCapacity,
      occupied,
      source,
      openingSeats: opening?.[1].seatsAvailable ?? null,
    }));
  }

  for (const [classLabel, opening] of openingByLabel.entries()) {
    if (findLevelForClassLabel(classLabel, academic)) continue;

    const { totalCapacity, source } = resolveCapacityForClassLabel(
      classLabel,
      academic,
      classes,
    );
    const occupied = countStudentsForClassLabel(classLabel, academic, students);

    rows.set(classLabel, mergeRow({
      classLabel,
      totalCapacity,
      occupied,
      source,
      openingSeats: opening.seatsAvailable,
    }));
  }

  return [...rows.values()].sort((a, b) => a.classLabel.localeCompare(b.classLabel));
}

export function getCurrentOpeningSeats(
  instituteId: string | undefined,
  className: string,
): { seatsAvailable: number | null; openingName?: string } {
  if (!instituteId || !className.trim()) return { seatsAvailable: null };
  const opening = readOpeningsStore().find(
    (item) =>
      item.instituteId === instituteId &&
      matchesOpeningClass(item, className),
  );
  if (!opening) return { seatsAvailable: null };
  return { seatsAvailable: opening.seatsAvailable, openingName: opening.name };
}

export function applyOpeningSeatUpdateAfterConversion(input: {
  instituteId?: string;
  className: string;
  seatsRemaining: number;
}): { updated: boolean; waitlistOnly: boolean; openingName?: string } {
  if (!input.instituteId || !input.className.trim()) {
    return { updated: false, waitlistOnly: input.seatsRemaining === 0 };
  }
  const all = readOpeningsStore();
  const idx = all.findIndex(
    (item) =>
      item.instituteId === input.instituteId &&
      matchesOpeningClass(item, input.className),
  );
  if (idx < 0) {
    return { updated: false, waitlistOnly: input.seatsRemaining === 0 };
  }

  const opening = all[idx]!;
  const nextSeats = Math.max(0, Math.floor(input.seatsRemaining));
  const waitlistOnly = nextSeats === 0;
  all[idx] = {
    ...opening,
    seatsAvailable: nextSeats,
    // Keep class visible for waitlist flow.
    status: opening.status === "closed" ? "closed" : "open",
    description: withWaitlistOnlyTag(opening.description ?? "", waitlistOnly),
    updatedAt: new Date().toISOString(),
  };
  writeOpeningsStore(all);
  return { updated: true, waitlistOnly, openingName: opening.name };
}

export function remainingSeatsAfterConversion(seatsAvailable: number): number {
  return Math.max(0, Math.floor(seatsAvailable) - 1);
}

/** @deprecated Prefer buildClassSeatAvailability(). Kept for legacy callers. */
export function readOpeningsByClass(instituteId?: string): SeatByClassRow[] {
  return buildClassSeatAvailability(instituteId).map((row) => ({
    classLabel: row.classLabel,
    seatsAvailable: row.available,
    openings: row.hasOpening ? 1 : 0,
    waitlistOnly: row.hasOpening && row.available <= 0 ? 1 : 0,
  }));
}

export function subscribeAdmissionOpenings(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === OPENINGS_STORAGE_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
  };
}
