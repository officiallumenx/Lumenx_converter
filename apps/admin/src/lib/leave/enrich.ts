import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { StudentListItem } from "@/lib/students/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { LeaveListItem, LeaveRequestDto } from "./types";
import { daysBetween, leaveDtoToListItem } from "./map";

export type LeaveEnrichmentContext = {
  studentsById: Map<string, Pick<StudentListItem, "name" | "classLabel" | "sectionLabel">>;
  teachersById: Map<string, Pick<TeacherListItem, "name" | "dept">>;
  classNameById: Map<string, string>;
  sectionById: Map<string, SectionDto>;
  decisionNotesByRequestId: Map<string, string | null>;
};

export function buildLeaveEnrichmentContext(input: {
  students: StudentListItem[];
  teachers: TeacherListItem[];
  classes: ClassDto[];
  sections: SectionDto[];
  decisionNotes: Map<string, string | null>;
}): LeaveEnrichmentContext {
  const studentsById = new Map(
    input.students.map((s) => [
      s.id,
      { name: s.name, classLabel: s.classLabel, sectionLabel: s.sectionLabel },
    ]),
  );
  const teachersById = new Map(
    input.teachers.map((t) => [t.id, { name: t.name, dept: t.dept }]),
  );
  const classNameById = new Map(input.classes.map((c) => [c.id, c.name]));
  const sectionById = new Map(input.sections.map((s) => [s.id, s]));
  return {
    studentsById,
    teachersById,
    classNameById,
    sectionById,
    decisionNotesByRequestId: input.decisionNotes,
  };
}

function resolveClassLabel(
  dto: LeaveRequestDto,
  ctx: LeaveEnrichmentContext,
): string {
  if (dto.sectionId) {
    const section = ctx.sectionById.get(dto.sectionId);
    if (section) {
      const className =
        ctx.classNameById.get(section.classId) ?? section.classId.slice(0, 8);
      return `${className}-${section.name}`;
    }
  }
  if (dto.classId) {
    const className = ctx.classNameById.get(dto.classId);
    if (className) return className;
  }
  if (dto.studentId) {
    const student = ctx.studentsById.get(dto.studentId);
    if (student?.classLabel && student.sectionLabel) {
      return `${student.classLabel}-${student.sectionLabel}`;
    }
    if (student?.classLabel) return student.classLabel;
  }
  return "—";
}

function approverLabel(role: LeaveRequestDto["intendedApproverRole"]): string {
  if (role === "institute_admin") return "Institute admin";
  if (role === "principal") return "Principal";
  return "—";
}

export function enrichLeaveDtoToListItem(
  dto: LeaveRequestDto,
  ctx: LeaveEnrichmentContext,
): LeaveListItem {
  const base = leaveDtoToListItem(dto);
  const decisionNote = ctx.decisionNotesByRequestId.get(dto.id) ?? undefined;

  if (dto.subjectKind === "student") {
    const student = dto.studentId ? ctx.studentsById.get(dto.studentId) : null;
    return {
      ...base,
      name: student?.name ?? base.name,
      className: resolveClassLabel(dto, ctx),
      decisionNote,
    };
  }

  const teacher = dto.teacherId ? ctx.teachersById.get(dto.teacherId) : null;
  return {
    ...base,
    name: teacher?.name ?? base.name,
    dept: teacher?.dept?.trim() || "—",
    toRole: approverLabel(dto.intendedApproverRole),
    decisionNote,
  };
}

export function enrichLeaveDtosToListItems(
  dtos: LeaveRequestDto[],
  ctx: LeaveEnrichmentContext,
): LeaveListItem[] {
  return dtos.map((dto) => enrichLeaveDtoToListItem(dto, ctx));
}

export function emptyLeaveEnrichmentContext(): LeaveEnrichmentContext {
  return {
    studentsById: new Map(),
    teachersById: new Map(),
    classNameById: new Map(),
    sectionById: new Map(),
    decisionNotesByRequestId: new Map(),
  };
}

/** Test helper — verify inclusive day span is preserved after enrichment. */
export function enrichedDaysBetween(startIso: string, endIso: string): number {
  return daysBetween(startIso, endIso);
}
