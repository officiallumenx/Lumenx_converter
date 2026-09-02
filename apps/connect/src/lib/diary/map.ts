import type { DiaryDayDto, DiaryRowInput, DiarySectionOption } from "./types";
import type { ClassDto, SectionDto, TeacherAssignmentDto } from "./types";
import type { DiaryDay, DiaryRow, DiaryScope } from "@/lib/teacher/diary/types";
import { newDiaryRow } from "@/lib/teacher/diary/store";

export function diaryDtoToDay(dto: DiaryDayDto): DiaryDay {
  return {
    apiId: dto.id,
    date: dto.diaryDate,
    scope: dto.scope,
    submittedAt: dto.submittedAt ?? undefined,
    updatedAt: dto.updatedAt,
    rows:
      dto.rows.length > 0
        ? dto.rows.map((row) => ({
            id: row.id,
            className: row.classLabel,
            description: row.description,
            sectionId: row.sectionId,
          }))
        : [newDiaryRow()],
  };
}

export function emptyDiaryDay(scope: DiaryScope, date: string): DiaryDay {
  return {
    date,
    scope,
    rows: [newDiaryRow()],
    updatedAt: new Date().toISOString(),
  };
}

export function diaryRowsToApiInput(rows: DiaryRow[], scope: DiaryScope): DiaryRowInput[] {
  return rows
    .filter((r) => r.className.trim() && r.description.trim())
    .map((r, i) => ({
      sectionId: scope === "subject" ? (r.sectionId ?? null) : null,
      classLabel: r.className.trim(),
      description: r.description.trim(),
      sortOrder: i,
    }));
}

export function buildSectionOptions(input: {
  assignments: TeacherAssignmentDto[];
  sections: SectionDto[];
  classes: ClassDto[];
}): DiarySectionOption[] {
  const classById = new Map(input.classes.map((c) => [c.id, c]));
  const sectionById = new Map(input.sections.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const out: DiarySectionOption[] = [];

  for (const assignment of input.assignments) {
    if (seen.has(assignment.sectionId)) continue;
    seen.add(assignment.sectionId);
    const section = sectionById.get(assignment.sectionId);
    if (!section) continue;
    const cls = classById.get(section.classId);
    const classLabel = cls?.name ?? cls?.code ?? "Class";
    const sectionLabel = section.name || section.code || "Section";
    out.push({
      sectionId: section.id,
      classId: section.classId,
      label: `${classLabel}-${sectionLabel}`,
    });
  }

  return out.sort((a, b) => a.label.localeCompare(b.label));
}
