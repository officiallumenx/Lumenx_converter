import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { TeacherClass, TeacherStudent } from "@/lib/teacher/types";
import {
  fetchMe,
  listClasses,
  listEnrollments,
  listSections,
  listSubjects,
  listTeacherAssignments,
} from "./api";
import { assignmentsToTeacherClasses, enrollmentsToTeacherStudents } from "./map";

export type TeacherPortalApiData = {
  teacherId: string;
  classes: TeacherClass[];
  studentsBySection: Map<string, TeacherStudent[]>;
  allStudents: TeacherStudent[];
};

let cached: TeacherPortalApiData | null = null;

export function getTeacherPortalApiCache(): TeacherPortalApiData | null {
  return cached;
}

export function clearTeacherPortalApiCache(): void {
  cached = null;
}

export async function loadTeacherPortalApiData(
  instituteId: string,
): Promise<TeacherPortalApiData | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) {
    cached = null;
    return null;
  }

  const me = await fetchMe();
  const teacherId =
    me.identities.teachers.find((t) => t.instituteId === instituteId)?.teacherId ??
    null;
  if (!teacherId) {
    cached = null;
    return null;
  }

  const [assignments, sections, classes, subjects] = await Promise.all([
    listTeacherAssignments({ instituteId, teacherId }),
    listSections(instituteId),
    listClasses(instituteId),
    listSubjects(instituteId),
  ]);

  const sectionIds = [...new Set(assignments.map((a) => a.sectionId))];
  const enrollmentGroups = await Promise.all(
    sectionIds.map((sectionId) =>
      listEnrollments({ instituteId, sectionId }).catch(() => []),
    ),
  );
  const enrollments = enrollmentGroups.flat();

  const teacherClasses = assignmentsToTeacherClasses(
    assignments,
    sections,
    classes,
    enrollments,
    subjects,
  );

  const studentsBySection = new Map<string, TeacherStudent[]>();
  for (const sectionId of sectionIds) {
    const sectionEnrollments = enrollments.filter((e) => e.sectionId === sectionId);
    studentsBySection.set(
      sectionId,
      enrollmentsToTeacherStudents(sectionEnrollments, sections, classes),
    );
  }

  const allStudents = enrollmentsToTeacherStudents(enrollments, sections, classes);
  cached = { teacherId, classes: teacherClasses, studentsBySection, allStudents };
  return cached;
}

export function getTeacherStudentsForSection(sectionId: string): TeacherStudent[] {
  return cached?.studentsBySection.get(sectionId) ?? [];
}

export function getTeacherClassesFromCache(): TeacherClass[] {
  return cached?.classes ?? [];
}

export function getAllTeacherStudentsFromCache(): TeacherStudent[] {
  return cached?.allStudents ?? [];
}
