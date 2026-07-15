import type { DemoInstituteProfile } from "@lumenx/types";
import type { AdminStudentRecord } from "@lumenx/module-students";
import { TEMPLATE_VARIABLES } from "./categories";

function parseGradeSection(grade: string): { classLabel: string; section: string } {
  const parts = grade.split("-").filter(Boolean);
  if (parts.length >= 2) {
    return {
      classLabel: parts.slice(0, -1).join("-"),
      section: parts[parts.length - 1] ?? "",
    };
  }
  return { classLabel: grade, section: "" };
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return `${y}–${y + 1}`;
}

function formatIssueDate(): string {
  return new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function certificateNumber(seq: number): string {
  const y = new Date().getFullYear();
  return `LXA/CERT/${y}/${String(seq).padStart(4, "0")}`;
}

export function instituteVariableMap(profile: DemoInstituteProfile): Record<string, string> {
  return {
    InstituteName: profile.name,
    PrincipalName: profile.principal,
    IssueDate: formatIssueDate(),
    AcademicYear: currentAcademicYear(),
  };
}

export function studentVariableMap(
  student: AdminStudentRecord,
  profile: DemoInstituteProfile,
  certSeq: number,
): Record<string, string> {
  const { classLabel, section } = parseGradeSection(student.grade);
  return {
    ...instituteVariableMap(profile),
    StudentName: student.name,
    AdmissionNumber: student.id.replace("STU-", "ADM-"),
    RollNumber: student.id.replace("STU-", ""),
    Class: classLabel,
    Section: section,
    Grade: classLabel,
    ParentName: student.parent,
    CertificateNumber: certificateNumber(certSeq),
    Achievement: "Outstanding performance",
    EventName: "Annual Day",
    TeacherName: "Class teacher",
  };
}

export function sampleVariableMap(
  instituteName: string,
  principalName: string,
): Record<string, string> {
  const map: Record<string, string> = {
    InstituteName: instituteName,
    PrincipalName: principalName,
    IssueDate: formatIssueDate(),
    AcademicYear: currentAcademicYear(),
  };
  for (const v of TEMPLATE_VARIABLES) {
    if (!(v.key in map)) map[v.key] = v.sample;
  }
  return map;
}

export function applyTemplateVariables(text: string, values: Record<string, string>): string {
  let out = text;
  for (const [key, val] of Object.entries(values)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}
