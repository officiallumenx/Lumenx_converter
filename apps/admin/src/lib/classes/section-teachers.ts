import { createTeacherAssignment, listTeacherAssignments } from "@/lib/timetable";
import { teacherAssignmentDtosToListItems } from "@/lib/timetable/map";
import type { TeacherAssignmentListItem } from "@/lib/timetable/types";
import { listSubjects } from "@/lib/subjects/api";
import { listTeachers } from "@/lib/teachers/api";
import type { SectionDetailItem } from "./types";

export async function loadSectionTeacherAssignments(
  section: Pick<SectionDetailItem, "id" | "instituteId">,
): Promise<TeacherAssignmentListItem[]> {
  const [assignments, teachers, subjects] = await Promise.all([
    listTeacherAssignments({
      instituteId: section.instituteId,
      sectionId: section.id,
      status: "active",
    }),
    listTeachers({ instituteId: section.instituteId }),
    listSubjects({ instituteId: section.instituteId }),
  ]);
  const teachersById = new Map(
    teachers.map((t) => [t.id, { ...t, name: t.name }]),
  );
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  return teacherAssignmentDtosToListItems(assignments, teachersById, subjectsById);
}

export async function assignTeacherToSection(input: {
  section: Pick<
    SectionDetailItem,
    "id" | "instituteId" | "academicYearId" | "classId"
  >;
  teacherId: string;
  subjectId: string;
}) {
  return createTeacherAssignment({
    instituteId: input.section.instituteId,
    academicYearId: input.section.academicYearId,
    classId: input.section.classId,
    sectionId: input.section.id,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    status: "active",
  });
}

export async function listTeachersForSectionPicker(instituteId: string) {
  const teachers = await listTeachers({ instituteId });
  return teachers
    .filter((t) => t.status === "active")
    .map((t) => ({ id: t.id, label: t.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function listSubjectsForSectionPicker(instituteId: string) {
  const subjects = await listSubjects({ instituteId });
  return subjects
    .filter((s) => s.status === "active")
    .map((s) => ({
      id: s.id,
      label: s.name?.trim() || s.code?.trim() || s.id.slice(0, 8),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
