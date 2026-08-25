/** Admin → Connect digital ID card sync (shared localStorage, same origin). */

import { CONNECT_LEARNER_TO_STUDENT_ID } from "@lumenx/utils";

import { formatStudentGradeDisplay, parseClassSection } from "@/lib/class-section-filter";

export const STUDENT_ID_CARD_SYNC_KEY = "lumenx.shared.studentIdCards.v1";
export const STUDENT_ID_CARD_SYNC_MESSAGE = "lumenx-student-id-card-sync";

/** Minimal student shape required to publish an ID-card snapshot. */
export type StudentIdCardSource = {
  id: string;
  name: string;
  firstName: string;
  surname: string;
  grade: string;
  address: string;
  parentName: string;
  parentPhone: string;
  rollNo?: string;
  admissionNumber?: string;
  photoDataUrl?: string;
  photoAssetId?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  house?: string;
  idCardIssuedOn?: string;
  idCardValidTill?: string;
  connectAccount?: { email?: string };
};

export type StudentIdCardSyncRow = {
  studentId: string;
  name: string;
  firstName: string;
  surname: string;
  /** Display class label e.g. "Class 10" / "Grade 10". */
  classLabel: string;
  section: string;
  rollNo: string;
  address: string;
  parentName: string;
  parentPhone: string;
  photoDataUrl?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  house?: string;
  idCardIssuedOn?: string;
  idCardValidTill?: string;
  institute: string;
  email?: string;
  /** Connect learner aliases that map to this student (C1, S-2041, …). */
  aliases: string[];
};

export type StudentIdCardSyncSnapshot = {
  updatedAt: string;
  students: StudentIdCardSyncRow[];
};

const DEFAULT_INSTITUTE = "LumenX Academy";

function aliasesForStudentId(studentId: string): string[] {
  return Object.entries(CONNECT_LEARNER_TO_STUDENT_ID)
    .filter(([, canonical]) => canonical === studentId)
    .map(([alias]) => alias);
}

function rollOf(student: StudentIdCardSource): string {
  const roll = student.rollNo?.trim();
  if (roll) return roll;
  const admission = student.admissionNumber?.trim();
  if (admission && admission !== student.id) return admission;
  const digits = student.id.replace(/\D/g, "");
  if (digits.length > 0) return digits.slice(-2).padStart(2, "0");
  return "—";
}

function classParts(grade: string): { classLabel: string; section: string } {
  const parsed = parseClassSection(grade);
  if (parsed) {
    const display = formatStudentGradeDisplay(grade);
    const withoutSection = display.replace(/\s*·\s*Sec\s+[A-D]$/i, "").trim();
    return {
      classLabel: withoutSection || `Class ${parsed.classNum}`,
      section: parsed.section,
    };
  }
  return { classLabel: grade || "—", section: "—" };
}

export function toIdCardSyncRow(record: StudentIdCardSource): StudentIdCardSyncRow {
  const { classLabel, section } = classParts(record.grade);
  return {
    studentId: record.id,
    name: record.name,
    firstName: record.firstName,
    surname: record.surname,
    classLabel,
    section,
    rollNo: rollOf(record),
    address: record.address?.trim() || "",
    parentName: record.parentName?.trim() || "",
    parentPhone: record.parentPhone?.trim() || "",
    photoDataUrl: record.photoDataUrl?.trim() || undefined,
    bloodGroup: record.bloodGroup?.trim() || undefined,
    emergencyContact: record.emergencyContact?.trim() || undefined,
    house: record.house?.trim() || undefined,
    idCardIssuedOn: record.idCardIssuedOn?.trim() || undefined,
    idCardValidTill: record.idCardValidTill?.trim() || undefined,
    institute: DEFAULT_INSTITUTE,
    email: record.connectAccount?.email?.trim() || undefined,
    aliases: aliasesForStudentId(record.id),
  };
}

export function publishStudentIdCardSync(records: readonly StudentIdCardSource[]): void {
  const snapshot: StudentIdCardSyncSnapshot = {
    updatedAt: new Date().toISOString(),
    students: records.map(toIdCardSyncRow),
  };
  try {
    localStorage.setItem(STUDENT_ID_CARD_SYNC_KEY, JSON.stringify(snapshot));
  } catch {
    return;
  }
  try {
    window.dispatchEvent(new Event("lumenx-student-id-card-sync"));
    window.postMessage(
      { type: STUDENT_ID_CARD_SYNC_MESSAGE, updatedAt: snapshot.updatedAt },
      "*",
    );
  } catch {
    // Ignore when window is unavailable.
  }
}

/** Human-readable issue date for newly created students. */
export function formatIdCardIssueDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function isIdCardReady(
  record: Pick<StudentIdCardSource, "photoDataUrl" | "photoAssetId">,
): boolean {
  return Boolean(record.photoDataUrl?.trim() || record.photoAssetId?.trim());
}
