import type { DemoInstituteProfile } from "@lumenx/types";
import type { CertificatePopulateContext } from "@lumenx/module-certificates";
import { loadAcademicYears } from "@/lib/academic-management-data";
import type { StudentDirectoryRecord } from "@/lib/student-directory-store";

function parseClassSection(grade: string): { className: string; section: string } {
  const parts = grade.split("-").filter(Boolean);
  if (parts.length >= 2) {
    return {
      className: parts.slice(0, -1).join("-"),
      section: parts[parts.length - 1] ?? "",
    };
  }
  return { className: grade.trim(), section: "" };
}

function activeAcademicYearLabel(): string {
  try {
    return loadAcademicYears().find((year) => year.status === "active")?.label ?? "";
  } catch {
    return "";
  }
}

function formatIssueDate(now = new Date()): string {
  return now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  return `${value}%`;
}

/**
 * Builds a one-off populate context for a student.
 * Reads institute data only — never writes to the student record.
 */
export function certificatePopulateContextForStudent(input: {
  student: StudentDirectoryRecord;
  institute: DemoInstituteProfile;
  principalName?: string;
  academicYear?: string;
}): CertificatePopulateContext {
  const { student, institute } = input;
  const { className, section } = parseClassSection(student.grade ?? "");
  const academicYear = (input.academicYear ?? activeAcademicYearLabel()).trim();
  const fullName =
    student.name.trim() ||
    `${student.firstName ?? ""} ${student.surname ?? ""}`.trim();

  return {
    student: {
      name: fullName,
      firstName: student.firstName,
      surname: student.surname,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNo,
      class: className,
      section,
      dateOfBirth: student.dateOfBirth,
      parentName: student.parentName || student.parent,
    },
    institute: {
      name: institute.name,
      address: institute.address,
      principalName: input.principalName || institute.principal,
      issueDate: formatIssueDate(),
    },
    academic: {
      academicYear,
      class: className,
      section,
      attendancePercent: formatPercent(student.attendance),
    },
  };
}
