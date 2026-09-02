import type { StudentListItem } from "@/lib/students/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { ComplaintDto, ComplaintListItem } from "./types";
import { complaintDtoToListItem } from "./map";

export type ComplaintEnrichmentContext = {
  studentNames: Map<string, string>;
  teacherNames: Map<string, string>;
};

export function emptyComplaintEnrichmentContext(): ComplaintEnrichmentContext {
  return {
    studentNames: new Map(),
    teacherNames: new Map(),
  };
}

export function buildComplaintEnrichmentContext(input: {
  students: StudentListItem[];
  teachers: TeacherListItem[];
}): ComplaintEnrichmentContext {
  const studentNames = new Map<string, string>();
  for (const student of input.students) {
    studentNames.set(student.id, student.name);
  }
  const teacherNames = new Map<string, string>();
  for (const teacher of input.teachers) {
    teacherNames.set(teacher.id, teacher.name);
  }
  return { studentNames, teacherNames };
}

export function enrichComplaintDtoToListItem(
  dto: ComplaintDto,
  ctx: ComplaintEnrichmentContext,
): ComplaintListItem | null {
  const item = complaintDtoToListItem(dto);
  if (!item) return null;

  if (dto.studentId) {
    const name = ctx.studentNames.get(dto.studentId);
    if (name) item.from = name;
  } else if (dto.teacherId) {
    const name = ctx.teacherNames.get(dto.teacherId);
    if (name) item.from = name;
  }

  return item;
}

export function enrichComplaintDtosToListItems(
  dtos: ComplaintDto[],
  ctx: ComplaintEnrichmentContext,
): ComplaintListItem[] {
  const items: ComplaintListItem[] = [];
  for (const dto of dtos) {
    const item = enrichComplaintDtoToListItem(dto, ctx);
    if (item) items.push(item);
  }
  return items;
}
