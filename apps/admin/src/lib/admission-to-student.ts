import type { DemoAcademicConfig } from "@lumenx/types";

import type { AdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { AdminSyncRow } from "@/lib/admissions-sync";
import type { AdmissionApplicationListItem } from "@/lib/admissions";
import type { ParentRelationship } from "@/lib/parent-directory-store";
import {
  normalizePhone,
  type StudentDraft,
  type StudentGender,
} from "@/lib/student-directory-store";

export type AdmissionConvertDraft = {
  student: StudentDraft;
  academicYear: string;
  seatsRemaining: number;
  createParentAccount: boolean;
  parentEmail: string;
  parentPassword: string;
  parentRelationship: ParentRelationship;
};

function splitName(name: string): { firstName: string; surname: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    surname: parts.slice(1).join(" "),
  };
}

function mapGender(value: string): StudentGender | "" {
  const normalized = value.trim().toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  if (normalized === "other") return "Other";
  if (normalized === "prefer not to say") return "Prefer not to say";
  return "";
}

function matchClassLabel(grade: string, academic: DemoAcademicConfig): string {
  const trimmed = grade.trim();
  if (!trimmed) return academic.levels[0]?.label ?? "";
  const exact = academic.levels.find(
    (level) => level.label.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exact) return exact.label;
  const partial = academic.levels.find(
    (level) =>
      level.label.toLowerCase().includes(trimmed.toLowerCase()) ||
      trimmed.toLowerCase().includes(level.label.toLowerCase()) ||
      level.shortLabel?.toLowerCase() === trimmed.toLowerCase(),
  );
  return partial?.label ?? academic.levels[0]?.label ?? trimmed;
}

function formatAddress(detail: AdminAdmissionDetail): string {
  const { address, city, state, country, postalCode } = detail.address;
  return [address, city, state, postalCode, country].filter(Boolean).join(", ");
}

function inferRelationship(detail: AdminAdmissionDetail | null): ParentRelationship {
  if (!detail) return "Guardian";
  const guardian = detail.parent.guardianName.trim().toLowerCase();
  const father = detail.parent.fatherName.trim().toLowerCase();
  const mother = detail.parent.motherName.trim().toLowerCase();
  if (guardian && father && guardian === father) return "Father";
  if (guardian && mother && guardian === mother) return "Mother";
  if (!guardian && father && !mother) return "Father";
  if (!guardian && mother && !father) return "Mother";
  return "Guardian";
}

function emptyStudentConnectFields(): Pick<
  StudentDraft,
  "createConnectAccount" | "studentPhone" | "studentEmail" | "temporaryPassword"
> {
  return {
    createConnectAccount: false,
    studentPhone: "",
    studentEmail: "",
    temporaryPassword: "Student@123",
  };
}

/** Prefill convert draft from an admissions application dossier. */
export function convertDraftFromAdmission(
  row: AdminSyncRow | AdmissionApplicationListItem,
  detail: AdminAdmissionDetail | null,
  academic: DemoAcademicConfig,
): AdmissionConvertDraft {
  const name = detail?.student.name ?? row.name;
  const { firstName, surname } = splitName(name);
  const parentPhone = normalizePhone(detail?.parent.mobile ?? "");
  const parentEmail = detail?.parent.email?.trim().toLowerCase() ?? "";

  return {
    student: {
      firstName,
      surname,
      className: matchClassLabel(detail?.grade ?? row.grade, academic),
      section: academic.sections[0] ?? "",
      parentName:
        detail?.parent.guardianName?.trim() ||
        detail?.parent.fatherName?.trim() ||
        detail?.parent.motherName?.trim() ||
        "",
      parentPhone,
      address: detail ? formatAddress(detail) : "",
      gender: detail ? mapGender(detail.student.gender) : "",
      dateOfBirth: detail?.student.dateOfBirth ?? "",
      admissionNumber: row.id,
      rollNo: "",
      ...emptyStudentConnectFields(),
    },
    academicYear: detail?.academicYear ?? "2026–27",
    seatsRemaining: 0,
    createParentAccount: false,
    parentEmail,
    parentPassword: "Parent@123",
    parentRelationship: inferRelationship(detail),
  };
}

/** When enabling Create Parent Connect account, fill blanks from the application. */
export function fillParentAccountFromAdmission(
  draft: AdmissionConvertDraft,
  detail: AdminAdmissionDetail | null,
): AdmissionConvertDraft {
  const formPhone = normalizePhone(detail?.parent.mobile ?? draft.student.parentPhone);
  const formEmail = detail?.parent.email?.trim().toLowerCase() ?? "";
  return {
    ...draft,
    createParentAccount: true,
    student: {
      ...draft.student,
      parentPhone: draft.student.parentPhone || formPhone,
      parentName:
        draft.student.parentName ||
        detail?.parent.guardianName?.trim() ||
        detail?.parent.fatherName?.trim() ||
        detail?.parent.motherName?.trim() ||
        "",
      ...emptyStudentConnectFields(),
    },
    parentEmail: draft.parentEmail.trim() || formEmail,
    parentPassword: draft.parentPassword || "Parent@123",
    parentRelationship: draft.parentRelationship || inferRelationship(detail),
  };
}

export function validateAdmissionConvertDraft(draft: AdmissionConvertDraft): string[] {
  const errors: string[] = [];
  const { student } = draft;
  if (!student.firstName.trim()) errors.push("First name is required.");
  if (!student.surname.trim()) errors.push("Surname is required.");
  if (!student.className.trim()) errors.push("Class is required.");
  if (!student.section.trim()) errors.push("Section is required.");
  if (!draft.academicYear.trim()) errors.push("Academic year is required.");
  if (!Number.isFinite(draft.seatsRemaining) || draft.seatsRemaining < 0) {
    errors.push("Seats remaining must be 0 or more.");
  }
  if (!student.parentName.trim()) errors.push("Parent name is required.");
  if (!/^\d{10}$/.test(student.parentPhone)) {
    errors.push("Parent phone must contain exactly 10 digits.");
  }
  if (!student.address.trim()) errors.push("Address is required.");
  if (!student.gender) errors.push("Gender is required.");

  if (draft.createParentAccount) {
    if (!/^\d{10}$/.test(student.parentPhone)) {
      errors.push("Parent mobile (10 digits) is required — parents sign in with OTP.");
    }
    const email = draft.parentEmail.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Enter a valid parent email address.");
    }
  }
  return errors;
}
