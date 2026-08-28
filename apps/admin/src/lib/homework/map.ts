import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { SubjectListItem } from "@/lib/subjects/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { HomeworkDto, HomeworkListItem } from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function sectionClassLabel(
  sectionId: string,
  sectionsById: Map<string, SectionDto>,
  classesById: Map<string, ClassDto>,
): string {
  const section = sectionsById.get(sectionId);
  if (!section) return shortRef(sectionId, "Section");
  const cls = classesById.get(section.classId);
  const className = cls?.name?.trim() || cls?.code?.trim() || shortRef(section.classId, "Class");
  const sectionCode = section.code?.trim() || section.name?.trim() || "—";
  return `${className} · Sec ${sectionCode}`;
}

export function homeworkDtoToListItem(
  dto: HomeworkDto,
  teachersById: Map<string, TeacherListItem>,
  sectionsById: Map<string, SectionDto>,
  classesById: Map<string, ClassDto>,
  subjectsById: Map<string, SubjectListItem>,
): HomeworkListItem {
  const teacher = teachersById.get(dto.teacherId);
  const subject = subjectsById.get(dto.subjectId);
  return {
    id: dto.id,
    title: dto.title.trim() || "Untitled",
    kind: dto.kind,
    status: dto.status,
    dueDate: dto.dueDate,
    teacherName: teacher?.name ?? shortRef(dto.teacherId, "Teacher"),
    classLabel: sectionClassLabel(dto.sectionId, sectionsById, classesById),
    subjectLabel: subject?.name ?? shortRef(dto.subjectId, "Subject"),
    updatedAt: dto.updatedAt,
  };
}

export function homeworkDtosToListItems(
  rows: HomeworkDto[],
  teachersById: Map<string, TeacherListItem>,
  sectionsById: Map<string, SectionDto>,
  classesById: Map<string, ClassDto>,
  subjectsById: Map<string, SubjectListItem>,
): HomeworkListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Homework API response must be an array");
  }
  return rows.map((dto) =>
    homeworkDtoToListItem(dto, teachersById, sectionsById, classesById, subjectsById),
  );
}
