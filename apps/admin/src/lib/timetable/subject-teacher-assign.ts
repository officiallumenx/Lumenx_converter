/**
 * Subject ↔ teacher assignment helpers using timetable teacher_assignment API.
 */
import {
  createTeacherAssignment,
  listTeacherAssignments,
} from "@/lib/timetable";
import { teacherAssignmentDtosToListItems } from "@/lib/timetable/map";
import type { TeacherAssignmentListItem } from "@/lib/timetable/types";
import { listTeachers } from "@/lib/teachers/api";
import { teacherDtosToListItems } from "@/lib/teachers/map";
import { listSubjects } from "@/lib/subjects/api";
import { listAcademicYears } from "@/lib/academic-years/api";
import { listClassesCatalog } from "@/lib/classes/api";

export async function loadSubjectTeacherAssignments(input: {
  instituteId: string;
  subjectId: string;
  academicYearId?: string;
}): Promise<TeacherAssignmentListItem[]> {
  const [assignments, teacherDtos, subjects] = await Promise.all([
    listTeacherAssignments({
      instituteId: input.instituteId,
      academicYearId: input.academicYearId,
      status: "active",
    }),
    listTeachers({ instituteId: input.instituteId }),
    listSubjects({ instituteId: input.instituteId }),
  ]);
  const teachersById = new Map(teacherDtosToListItems(teacherDtos).map((t) => [t.id, t]));
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  return teacherAssignmentDtosToListItems(assignments, teachersById, subjectsById).filter(
    (row) => row.subjectId === input.subjectId,
  );
}

export async function loadTeacherSubjectAssignments(input: {
  instituteId: string;
  teacherId: string;
  academicYearId?: string;
}): Promise<TeacherAssignmentListItem[]> {
  const [assignments, teacherDtos, subjects] = await Promise.all([
    listTeacherAssignments({
      instituteId: input.instituteId,
      academicYearId: input.academicYearId,
      status: "active",
    }),
    listTeachers({ instituteId: input.instituteId }),
    listSubjects({ instituteId: input.instituteId }),
  ]);
  const teachersById = new Map(teacherDtosToListItems(teacherDtos).map((t) => [t.id, t]));
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));
  return teacherAssignmentDtosToListItems(
    assignments.filter((row) => row.teacherId === input.teacherId),
    teachersById,
    subjectsById,
  );
}

export async function assignTeacherSubjectSection(input: {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  teacherId: string;
  subjectId: string;
}) {
  return createTeacherAssignment({
    instituteId: input.instituteId,
    academicYearId: input.academicYearId,
    classId: input.classId,
    sectionId: input.sectionId,
    teacherId: input.teacherId,
    subjectId: input.subjectId,
    status: "active",
  });
}

export async function loadAssignPickers(instituteId: string, academicYearId?: string) {
  const years = await listAcademicYears({ instituteId });
  const yearId =
    academicYearId ||
    years.find((y) => y.status === "active")?.id ||
    years[0]?.id ||
    "";
  const [teachers, subjects, catalog] = await Promise.all([
    listTeachers({ instituteId }),
    listSubjects({ instituteId }),
    yearId
      ? listClassesCatalog({ instituteId })
      : Promise.resolve({ classes: [], sections: [] }),
  ]);
  const classes = catalog.classes.filter((c) => !yearId || c.academicYearId === yearId);
  const sections = catalog.sections.filter((s) => !yearId || s.academicYearId === yearId);
  return {
    years,
    academicYearId: yearId,
    teachers: teacherDtosToListItems(teachers)
      .filter((t) => t.status === "active")
      .map((t) => ({ id: t.id, label: t.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    subjects: subjects
      .filter((s) => s.status === "active")
      .map((s) => ({
        id: s.id,
        label: s.name?.trim() || s.code?.trim() || s.id.slice(0, 8),
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    classes,
    sections,
  };
}
