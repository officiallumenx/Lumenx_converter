import type { SubjectDto, SubjectListItem } from "./types";

export function applicableClassCodesToGrades(codes: string[] | null | undefined): string[] {
  if (!Array.isArray(codes)) return [];
  return codes.map((code) => code.trim()).filter(Boolean);
}

export function gradesDisplayLabel(grades: string[], college: boolean): string {
  if (grades.length === 0) return "—";
  return grades.map((g) => (college ? g : g.replace(/^Grade\s+/i, "G"))).join(", ");
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function subjectDtoToListItem(dto: SubjectDto): SubjectListItem {
  const grades = applicableClassCodesToGrades(dto.applicableClassCodes);

  return {
    id: dto.id,
    name: dto.name?.trim() || "Subject",
    code: dto.code?.trim() || "—",
    category: dto.category?.trim() || "Other",
    periodsPerWeek: dto.periodsPerWeek ?? 0,
    grades,
    assignedTeacherIds: [],
    status: dto.status ?? "active",
  };
}

export function subjectDtosToListItems(dtos: SubjectDto[]): SubjectListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Subjects API response must be an array");
  }
  return dtos.map(subjectDtoToListItem);
}
