import type { StudentDetailItem, StudentDto, StudentListItem, StudentStatus } from "./types";

const KNOWN_STATUSES = new Set<StudentStatus>([
  "active",
  "at-risk",
  "watch",
  "inactive",
  "graduated",
]);

export function buildStudentGradeLabel(
  classLabel: string | null,
  sectionLabel: string | null,
): string {
  const cls = classLabel?.trim() || "";
  const sec = sectionLabel?.trim() || "";
  if (!cls && !sec) return "—";
  if (!sec) return cls;
  if (!cls) return sec;
  if (cls.endsWith(`-${sec}`) || cls.endsWith(sec)) return cls;
  return `${cls}-${sec}`;
}

function safeStatus(value: string): StudentStatus {
  return KNOWN_STATUSES.has(value as StudentStatus)
    ? (value as StudentStatus)
    : "active";
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function studentDtoToListItem(dto: StudentDto): StudentListItem {
  const firstName = dto.firstName?.trim() || "";
  const surname = dto.surname?.trim() || "";
  const displayName = dto.displayName?.trim() || "";
  const name =
    displayName || `${firstName} ${surname}`.trim() || "Student";

  return {
    id: dto.id,
    name,
    firstName,
    surname,
    displayName: displayName || name,
    grade: buildStudentGradeLabel(dto.classLabel, dto.sectionLabel),
    classLabel: dto.classLabel?.trim() || null,
    sectionLabel: dto.sectionLabel?.trim() || null,
    rollNo: dto.rollNo?.trim() || null,
    admissionNumber: dto.admissionNumber?.trim() || null,
    status: safeStatus(dto.status),
    accessStatus: dto.accessStatus ?? "active",
    gender: dto.gender ?? "prefer_not_to_say",
    dateOfBirth: dto.dateOfBirth ?? null,
    attendance: 0,
    gpa: 0,
    parent: "",
  };
}

export function studentDtoToDetailItem(dto: StudentDto): StudentDetailItem {
  const base = studentDtoToListItem(dto);
  return {
    ...base,
    instituteId: dto.instituteId,
    address: dto.address?.trim() || "—",
    bloodGroup: dto.bloodGroup?.trim() || null,
    emergencyContact: dto.emergencyContact?.trim() || null,
    house: dto.house?.trim() || null,
    legacyCode: dto.legacyCode?.trim() || null,
    updatedAt: dto.updatedAt,
  };
}

export function studentDtosToListItems(dtos: StudentDto[]): StudentListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Students API response must be an array");
  }
  return dtos.map(studentDtoToListItem);
}
