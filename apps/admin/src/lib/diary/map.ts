import type { DiaryDayDto, DiaryDayRowDto, DiaryListItem } from "./types";

function shortId(id: string | null): string {
  if (!id) return "";
  return id.slice(0, 8);
}

function scopeLabel(scope: DiaryDayDto["scope"]): string {
  if (scope === "subject") return "subject";
  if (scope === "activity") return "activity";
  return "—";
}

function formatSubmittedAt(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return iso;
}

function mapRow(row: DiaryDayRowDto): DiaryListItem["rows"][number] {
  return {
    className: row.classLabel?.trim() || "Class",
    description: row.description ?? "",
  };
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function diaryDtoToListItem(dto: DiaryDayDto): DiaryListItem {
  const teacherPrefix = shortId(dto.teacherId);
  const sortedRows = [...(dto.rows ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );

  return {
    id: dto.id,
    date: dto.diaryDate || "—",
    submittedAt: formatSubmittedAt(dto.submittedAt),
    teacherName: teacherPrefix ? `Teacher ${teacherPrefix}` : "Teacher",
    scope: scopeLabel(dto.scope),
    rows: sortedRows.map(mapRow),
  };
}

export function diaryDtosToListItems(dtos: DiaryDayDto[]): DiaryListItem[] {
  return dtos.map(diaryDtoToListItem);
}
