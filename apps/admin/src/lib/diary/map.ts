import type { TeacherListItem } from "@/lib/teachers/types";
import type { DiaryDayDto, DiaryDayRowDto, DiaryListItem } from "./types";

function shortId(id: string | null): string {
  if (!id) return "";
  return id.slice(0, 8);
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return iso;
}

function mapRow(row: DiaryDayRowDto): DiaryListItem["rows"][number] {
  return {
    sectionId: row.sectionId,
    className: row.classLabel?.trim() || "Class",
    description: row.description ?? "",
  };
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function diaryDtoToListItem(
  dto: DiaryDayDto,
  teachersById?: Map<string, TeacherListItem>,
): DiaryListItem {
  const teacher = teachersById?.get(dto.teacherId);
  const teacherPrefix = shortId(dto.teacherId);
  const sortedRows = [...(dto.rows ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  return {
    id: dto.id,
    instituteId: dto.instituteId,
    teacherId: dto.teacherId,
    academicYearId: dto.academicYearId,
    date: dto.diaryDate || "—",
    submittedAt: formatSubmittedAt(dto.submittedAt),
    teacherName: teacher?.name ?? (teacherPrefix ? `Teacher ${teacherPrefix}` : "Teacher"),
    scope: dto.scope,
    rows: sortedRows.map(mapRow),
  };
}

export function diaryDtosToListItems(
  dtos: DiaryDayDto[],
  teachersById?: Map<string, TeacherListItem>,
): DiaryListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Diary API response must be an array");
  }
  return dtos.map((dto) => diaryDtoToListItem(dto, teachersById));
}
