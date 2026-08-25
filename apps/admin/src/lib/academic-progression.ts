/** Persist promotion / graduation against the student directory + academic timeline. */

import {
  formatClassSection,
  parseClassSection,
} from "@/lib/class-section-filter";
import {
  loadStudentDirectory,
  saveStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import { createLocalStorageStore } from "@/lib/client-data-store";
import { readAdminDataScopeKey } from "@/lib/admin-tenant";
import {
  recordDropoutOnTimeline,
  recordTransferOnTimeline,
} from "@/lib/student-timeline-meta";
import {
  GRADUATION_FINAL_CLASS_STUDENTS,
  GRADUATION_YEAR_OPTIONS,
  HIGHEST_CONFIGURED_CLASS,
  PRESENT_GRADUATION_YEAR_ID,
  PROMOTION_CLASS_OPTIONS,
  PROMOTION_NON_FINAL_CLASSES,
  type GraduationFinalStudent,
  type GraduationResult,
  type PromotionReviewAction,
  type PromotionRosterStudent,
  type PromotionScopeMode,
} from "@/lib/academic-management-data";

export function toOrdinalClass(classNum: string): string {
  const n = Number.parseInt(classNum, 10);
  if (!Number.isFinite(n)) return classNum;
  const mod100 = n % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : n % 10 === 1
        ? "st"
        : n % 10 === 2
          ? "nd"
          : n % 10 === 3
            ? "rd"
            : "th";
  return `${n}${suffix}`;
}

export function ordinalToClassNum(label: string): string {
  return label.replace(/(st|nd|rd|th)$/i, "");
}

function nextOrdinalClass(current: string): string {
  const n = Number.parseInt(ordinalToClassNum(current), 10);
  if (!Number.isFinite(n)) return current;
  return toOrdinalClass(String(n + 1));
}

function directoryToRosterRow(
  student: StudentDirectoryRecord,
  yearId: string,
): PromotionRosterStudent | null {
  if (student.status === "inactive" || student.status === "graduated") return null;
  const parsed = parseClassSection(student.grade);
  if (!parsed) return null;
  const currentClass = toOrdinalClass(parsed.classNum);
  const isFinalClass = currentClass === HIGHEST_CONFIGURED_CLASS;
  return {
    id: student.id,
    rollNo: student.rollNo?.trim() || "—",
    name: student.name,
    academicYearId: yearId,
    currentClass,
    section: parsed.section,
    promoteTo: isFinalClass ? "Graduate" : nextOrdinalClass(currentClass),
    isFinalClass,
    flags: {
      failed: student.gpa > 0 && student.gpa < 2.5,
      pendingFees: false,
      pendingLibrary: false,
      attendanceShortage: student.attendance < 75,
      pendingDocuments: false,
      manualHold: false,
    },
  };
}

export function matchPromotionRosterFromDirectory(params: {
  yearId: string;
  scope: PromotionScopeMode;
  currentClass: string;
  section: string;
  multiClasses: string[];
}): PromotionRosterStudent[] {
  const { yearId, scope, currentClass, section, multiClasses } = params;
  const allowed = new Set<string>(PROMOTION_CLASS_OPTIONS);

  return loadStudentDirectory()
    .map((student) => directoryToRosterRow(student, yearId))
    .filter((row): row is PromotionRosterStudent => {
      if (!row) return false;
      if (!allowed.has(row.currentClass)) return false;
      if (scope === "single") {
        return row.currentClass === currentClass && row.section === section;
      }
      if (scope === "multi") {
        if (multiClasses.length === 0) return false;
        return multiClasses.includes(row.currentClass);
      }
      return !row.isFinalClass && PROMOTION_NON_FINAL_CLASSES.includes(row.currentClass as (typeof PROMOTION_NON_FINAL_CLASSES)[number]);
    });
}

function bumpDirectoryGrade(student: StudentDirectoryRecord): StudentDirectoryRecord {
  const parsed = parseClassSection(student.grade);
  if (!parsed) return student;
  const n = Number.parseInt(parsed.classNum, 10);
  if (!Number.isFinite(n) || toOrdinalClass(parsed.classNum) === HIGHEST_CONFIGURED_CLASS) {
    return student;
  }
  return { ...student, grade: formatClassSection(String(n + 1), parsed.section) };
}

export type PromotionPersistOptions = {
  sourceYearId?: string;
  sourceYearLabel?: string;
  targetYearId?: string;
  targetYearLabel?: string;
  targetClass?: string;
  targetSection?: string;
};

export type PromotionHistoryRecord = {
  studentId: string;
  sourceYearId: string;
  sourceYearLabel: string;
  targetYearId: string;
  targetYearLabel: string;
  fromGrade: string;
  toGrade: string;
  promotedAt: string;
};

const PROMOTION_HISTORY_KEY_PREFIX = "lumenx.admin.promotion-history.v1";

const promotionHistoryStore = createLocalStorageStore<Record<string, PromotionHistoryRecord[]>>({
  storageKey: () => `${PROMOTION_HISTORY_KEY_PREFIX}.${readAdminDataScopeKey()}`,
  eventName: "lumenx-promotion-history-changed",
  seed: () => ({}),
});

export const PROMOTION_HISTORY_CHANGED_EVENT = "lumenx-promotion-history-changed";

export function loadPromotionHistoryForStudent(studentId: string): PromotionHistoryRecord[] {
  return [...(promotionHistoryStore.load()[studentId] ?? [])];
}

function isSamePromotionHistoryRecord(
  left: PromotionHistoryRecord,
  right: PromotionHistoryRecord,
): boolean {
  return (
    left.sourceYearId === right.sourceYearId &&
    left.targetYearId === right.targetYearId &&
    left.fromGrade === right.fromGrade &&
    left.toGrade === right.toGrade
  );
}

function classToGradeKey(
  targetClass: string | undefined,
  targetSection: string | undefined,
  fallback: StudentDirectoryRecord,
): string | null {
  if (!targetClass || !targetSection) return null;
  const classNum = ordinalToClassNum(targetClass);
  const n = Number.parseInt(classNum, 10);
  if (!Number.isFinite(n)) return null;
  const parsed = parseClassSection(fallback.grade);
  if (!parsed) return null;
  return formatClassSection(String(n), targetSection || parsed.section);
}

function deriveTargetGrade(
  student: StudentDirectoryRecord,
  options?: PromotionPersistOptions,
): string {
  const explicit = classToGradeKey(options?.targetClass, options?.targetSection, student);
  if (explicit) return explicit;
  return bumpDirectoryGrade(student).grade;
}

export function persistPromoteStudents(
  ids: string[],
  yearLabel: string,
  options?: PromotionPersistOptions,
): number {
  if (ids.length === 0) return 0;
  const idSet = new Set(ids);
  const directory = loadStudentDirectory();
  const sourceYearId = options?.sourceYearId?.trim() || "unknown-source-year";
  const sourceYearLabel = options?.sourceYearLabel?.trim() || sourceYearId;
  const targetYearId = options?.targetYearId?.trim() || sourceYearId;
  const targetYearLabel = options?.targetYearLabel?.trim() || yearLabel;
  const historyRows: PromotionHistoryRecord[] = [];

  const next = directory.map((student) => {
    if (!idSet.has(student.id)) return student;
    const toGrade = deriveTargetGrade(student, options);
    if (toGrade === student.grade) return student;
    historyRows.push({
      studentId: student.id,
      sourceYearId,
      sourceYearLabel,
      targetYearId,
      targetYearLabel,
      fromGrade: student.grade,
      toGrade,
      promotedAt: new Date().toISOString(),
    });
    return { ...student, grade: toGrade };
  });
  saveStudentDirectory(next);
  if (historyRows.length > 0) {
    promotionHistoryStore.mutate((state) => {
      const nextState = { ...state };
      for (const row of historyRows) {
        const existing = nextState[row.studentId] ?? [];
        if (existing.some((item) => isSamePromotionHistoryRecord(item, row))) {
          nextState[row.studentId] = existing;
          continue;
        }
        nextState[row.studentId] = [...existing, row];
      }
      return nextState;
    });
  }
  return ids.length;
}

export function persistPromotionReviewAction(
  studentId: string,
  action: PromotionReviewAction,
  yearLabel: string,
): void {
  if (action === "promote_anyway") {
    persistPromoteStudents([studentId], yearLabel);
    return;
  }
  if (action === "repeat" || action === "hold") return;
  if (action === "graduate") {
    persistGraduateStudents([studentId], PRESENT_GRADUATION_YEAR_ID);
    return;
  }

  const directory = loadStudentDirectory();
  const next = directory.map((student) => {
    if (student.id !== studentId) return student;
    return { ...student, status: "inactive" as const };
  });
  saveStudentDirectory(next);

  if (action === "transfer") recordTransferOnTimeline(studentId);
  else if (action === "dropout") recordDropoutOnTimeline(studentId);
}

type GraduationHistoryState = {
  results: Record<string, Record<string, GraduationResult>>;
  snapshots: GraduationFinalStudent[];
};

const GRADUATION_HISTORY_KEY_PREFIX = "lumenx.admin.graduation-history.v1";

const graduationHistoryStore = createLocalStorageStore<GraduationHistoryState>({
  storageKey: () => `${GRADUATION_HISTORY_KEY_PREFIX}.${readAdminDataScopeKey()}`,
  eventName: "lumenx-graduation-history-changed",
  seed: () => ({
    results: {},
    snapshots: GRADUATION_FINAL_CLASS_STUDENTS.filter(
      (row) => row.academicYearId !== PRESENT_GRADUATION_YEAR_ID,
    ).map((row) => ({ ...row })),
  }),
});

export function loadGraduationSnapshotsForStudent(studentId: string): GraduationFinalStudent[] {
  return graduationHistoryStore
    .load()
    .snapshots.filter((row) => row.id === studentId)
    .map((row) => ({ ...row }));
}

function directoryToGraduationRow(student: StudentDirectoryRecord): GraduationFinalStudent | null {
  if (student.status === "inactive" || student.status === "graduated") return null;
  const parsed = parseClassSection(student.grade);
  if (!parsed) return null;
  if (toOrdinalClass(parsed.classNum) !== HIGHEST_CONFIGURED_CLASS) return null;
  return {
    id: student.id,
    name: student.name,
    rollNo: student.rollNo?.trim() || "—",
    class: HIGHEST_CONFIGURED_CLASS,
    section: parsed.section,
    academicYearId: PRESENT_GRADUATION_YEAR_ID,
    result: "passed",
  };
}

export function loadGraduationRows(): GraduationFinalStudent[] {
  const history = graduationHistoryStore.load();
  const present = loadStudentDirectory()
    .map(directoryToGraduationRow)
    .filter((row): row is GraduationFinalStudent => Boolean(row))
    .map((row) => ({
      ...row,
      result: history.results[PRESENT_GRADUATION_YEAR_ID]?.[row.id] ?? row.result,
    }));
  const archived = history.snapshots
    .filter((row) => row.academicYearId !== PRESENT_GRADUATION_YEAR_ID)
    .map((row) => ({ ...row }));
  return [...present, ...archived];
}

export function saveGraduationStatuses(
  updates: Array<{ id: string; result: GraduationResult }>,
  yearId = PRESENT_GRADUATION_YEAR_ID,
): void {
  if (updates.length === 0) return;
  graduationHistoryStore.mutate((state) => {
    const yearResults = { ...(state.results[yearId] ?? {}) };
    for (const update of updates) yearResults[update.id] = update.result;
    return { ...state, results: { ...state.results, [yearId]: yearResults } };
  });
}

export const GRADUATION_HISTORY_CHANGED_EVENT = "lumenx-graduation-history-changed";

export type GraduationPersistOptions = {
  yearLabel?: string;
  results?: Record<string, GraduationResult>;
};

function graduationSnapshotKey(yearId: string, studentId: string): string {
  return `${yearId}:${studentId}`;
}

export function validateGraduationSelection(
  ids: string[],
  yearId: string,
  pendingRows: GraduationFinalStudent[],
): string[] {
  const errors: string[] = [];

  if (!yearId?.trim()) {
    errors.push("Select an academic year before confirming graduation.");
    return errors;
  }

  const yearOption = GRADUATION_YEAR_OPTIONS.find((year) => year.id === yearId);
  if (!yearOption) {
    errors.push("Select a valid academic year before confirming graduation.");
    return errors;
  }

  if (ids.length === 0) {
    errors.push("Select at least one student before confirming graduation.");
    return errors;
  }

  if (yearId !== PRESENT_GRADUATION_YEAR_ID) {
    errors.push("Graduation can only be confirmed for the present academic year pending roster.");
  }

  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push("Remove duplicate student selections before confirming graduation.");
  }

  const history = graduationHistoryStore.load();
  const snapshotKeys = new Set(
    history.snapshots.map((row) => graduationSnapshotKey(row.academicYearId, row.id)),
  );
  const directoryById = new Map(loadStudentDirectory().map((student) => [student.id, student]));
  const pendingById = new Map(
    pendingRows
      .filter((row) => row.academicYearId === PRESENT_GRADUATION_YEAR_ID)
      .map((row) => [row.id, row]),
  );

  for (const id of ids) {
    const student = directoryById.get(id);
    if (!student) {
      errors.push(`${id} was not found in the student directory.`);
      continue;
    }

    if (student.status === "graduated") {
      errors.push(`${student.name} is already graduated.`);
    } else if (student.status === "inactive") {
      errors.push(`${student.name} is inactive and not eligible for graduation.`);
    }

    const parsed = parseClassSection(student.grade);
    const finalClass =
      parsed && toOrdinalClass(parsed.classNum) === HIGHEST_CONFIGURED_CLASS;
    if (!finalClass) {
      errors.push(
        `${student.name} is not in ${HIGHEST_CONFIGURED_CLASS} and is not eligible for graduation.`,
      );
    }

    if (!pendingById.has(id)) {
      errors.push(`${student.name} is not in the pending graduation roster.`);
    }

    if (snapshotKeys.has(graduationSnapshotKey(yearId, id))) {
      errors.push(`${student.name} already has a graduation record for ${yearOption.label}.`);
    }
  }

  return [...new Set(errors)];
}

export function persistGraduateStudents(
  ids: string[],
  yearId: string,
  options?: GraduationPersistOptions,
): number {
  if (ids.length === 0) return 0;
  const idSet = new Set(ids);
  const directory = loadStudentDirectory();
  const snapshots: GraduationFinalStudent[] = [];
  const history = graduationHistoryStore.load();
  const existingSnapshots = new Set(
    history.snapshots.map((row) => graduationSnapshotKey(row.academicYearId, row.id)),
  );
  const graduatedAt = new Date().toISOString();

  const next = directory.map((student) => {
    if (!idSet.has(student.id)) return student;
    if (student.status === "graduated") return student;
    if (existingSnapshots.has(graduationSnapshotKey(yearId, student.id))) return student;

    const parsed = parseClassSection(student.grade);
    const result =
      options?.results?.[student.id] ??
      history.results[yearId]?.[student.id] ??
      "passed";
    snapshots.push({
      id: student.id,
      name: student.name,
      rollNo: student.rollNo?.trim() || "—",
      class: HIGHEST_CONFIGURED_CLASS,
      section: parsed?.section ?? "A",
      academicYearId: yearId,
      result,
      graduatedAt,
    });
    return { ...student, status: "graduated" as const };
  });

  if (snapshots.length === 0) return 0;

  saveStudentDirectory(next);
  graduationHistoryStore.mutate((state) => {
    const existing = new Set(
      state.snapshots.map((row) => graduationSnapshotKey(row.academicYearId, row.id)),
    );
    const extra = snapshots.filter(
      (row) => !existing.has(graduationSnapshotKey(row.academicYearId, row.id)),
    );
    const yearResults = { ...(state.results[yearId] ?? {}) };
    for (const snapshot of snapshots) yearResults[snapshot.id] = snapshot.result;
    return {
      ...state,
      results: { ...state.results, [yearId]: yearResults },
      snapshots: [...state.snapshots, ...extra],
    };
  });
  return snapshots.length;
}
