import type { AcademicYearDto, AcademicYearListItem } from "./types";

export function academicYearDtoToListItem(dto: AcademicYearDto): AcademicYearListItem {
  const label = dto.name?.trim() || dto.code?.trim() || "Academic year";
  return {
    id: dto.id,
    label,
    startDate: dto.startsOn,
    endDate: dto.endsOn,
    status: dto.status,
    code: dto.code?.trim() || "",
  };
}

export function academicYearDtosToListItems(
  rows: AcademicYearDto[],
): AcademicYearListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Academic years API response must be an array");
  }
  return rows.map(academicYearDtoToListItem);
}
