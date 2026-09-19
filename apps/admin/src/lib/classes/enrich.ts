import type { EnrollmentDto } from "@/lib/enrollments/types";
import type { SubjectDto } from "@/lib/subjects/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { TeacherDto } from "@/lib/teachers/types";
import type { TeacherAssignmentDto } from "@/lib/timetable/types";
import type { ClassDto, SectionDto } from "./types";

export type SectionEnrichment = {
  enrollmentCountBySection: Map<string, number>;
  teachersBySection: Map<string, string>;
  subjectTeacherBySection: Map<string, Record<string, string>>;
};

export function buildSectionEnrichment(
  enrollments: EnrollmentDto[],
  assignments: TeacherAssignmentDto[],
  teachersById: Map<string, Pick<TeacherListItem, "name">>,
  subjectsById: Map<string, Pick<SubjectDto, "name" | "code">>,
): SectionEnrichment {
  const enrollmentCountBySection = new Map<string, number>();
  for (const row of enrollments) {
    if (row.status !== "active") continue;
    enrollmentCountBySection.set(
      row.sectionId,
      (enrollmentCountBySection.get(row.sectionId) ?? 0) + 1,
    );
  }

  const subjectTeacherBySection = new Map<string, Record<string, string>>();
  const teachersBySection = new Map<string, string>();

  for (const assignment of assignments) {
    if (assignment.status !== "active") continue;
    const teacher =
      teachersById.get(assignment.teacherId)?.name?.trim() ||
      `Teacher ${assignment.teacherId.slice(0, 8)}`;
    const subject =
      subjectsById.get(assignment.subjectId)?.name?.trim() ||
      subjectsById.get(assignment.subjectId)?.code?.trim() ||
      `Subject ${assignment.subjectId.slice(0, 8)}`;

    const bucket = subjectTeacherBySection.get(assignment.sectionId) ?? {};
    bucket[assignment.subjectId] = teacher;
    subjectTeacherBySection.set(assignment.sectionId, bucket);

    const existing = teachersBySection.get(assignment.sectionId);
    if (!existing) {
      teachersBySection.set(assignment.sectionId, teacher);
    } else if (!existing.includes(teacher)) {
      const names = new Set(
        Object.values(subjectTeacherBySection.get(assignment.sectionId) ?? {}),
      );
      teachersBySection.set(
        assignment.sectionId,
        names.size > 1 ? `${names.size} teachers` : teacher,
      );
    }
  }

  return { enrollmentCountBySection, teachersBySection, subjectTeacherBySection };
}

export function applyClassTeacherEnrichment(
  enrichment: SectionEnrichment,
  sections: SectionDto[],
  classes: ClassDto[],
  teachers: TeacherDto[],
): SectionEnrichment {
  const classesById = new Map(classes.map((item) => [item.id, item]));
  const teachersById = new Map(teachers.map((item) => [item.id, item]));
  for (const section of sections) {
    if (section.classTeacherId) {
      const named = teachersById.get(section.classTeacherId)?.displayName?.trim();
      if (named) {
        enrichment.teachersBySection.set(section.id, named);
        continue;
      }
    }
    const cls = classesById.get(section.classId);
    if (!cls) continue;
    const labels = new Set([
      `${cls.code}-${section.code}`.toLowerCase(),
      `${cls.name}-${section.code}`.toLowerCase(),
    ]);
    const classTeacher = teachers.find((teacher) =>
      (teacher.assignedSectionLabels ?? []).some((label) =>
        labels.has(label.trim().toLowerCase()),
      ),
    );
    if (classTeacher) {
      enrichment.teachersBySection.set(section.id, classTeacher.displayName);
    }
  }
  return enrichment;
}
