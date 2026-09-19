import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { getTeacherSelfPortal } from "@/lib/teachers/api";
import type { TeacherClass, TeacherStudent } from "@/lib/teacher/types";
import {
  fetchMe,
  listClasses,
  listEnrollments,
  listSections,
  listSubjects,
  listTeacherAssignments,
  type ClassDto,
  type SectionDto,
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

function normalizeSectionLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

/** Match Admin assigned_section_labels (e.g. "G10-A") to live section rows. */
export function matchSectionIdsByLabels(
  labels: string[] | null | undefined,
  sections: SectionDto[],
  classes: ClassDto[],
): string[] {
  if (!labels?.length) return [];
  const classesById = new Map(classes.map((c) => [c.id, c]));
  const needles = labels
    .map((l) => normalizeSectionLabel(l))
    .filter(Boolean);
  if (needles.length === 0) return [];

  const matched: string[] = [];
  for (const section of sections) {
    if (section.status !== "active") continue;
    const cls = classesById.get(section.classId);
    const candidates = [
      `${cls?.code ?? ""}-${section.code}`,
      `${cls?.name ?? ""}-${section.code}`,
      `${cls?.code ?? ""}-${section.name}`,
      `${cls?.name ?? ""}-${section.name}`,
      section.code,
      section.name,
    ].map(normalizeSectionLabel);
    if (needles.some((needle) => candidates.includes(needle))) {
      matched.push(section.id);
    }
  }
  return matched;
}

function resolveTeacherIdForInstitute(
  me: Awaited<ReturnType<typeof fetchMe>>,
  instituteId: string,
): string | null {
  const linked = me.identities.teachers.filter((t) => t.instituteId === instituteId);
  const active = linked.find((t) => t.status === "active");
  return active?.teacherId ?? linked[0]?.teacherId ?? null;
}

async function settledValue<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export async function loadTeacherPortalApiData(
  instituteId: string,
): Promise<TeacherPortalApiData | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) {
    cached = null;
    return null;
  }

  const me = await fetchMe();
  const teacherId = resolveTeacherIdForInstitute(me, instituteId);
  if (!teacherId) {
    cached = null;
    return null;
  }

  // Soft-fail catalog reads so a single 403/500 cannot wipe My Classes.
  // Portal/me is authoritative for class-teacher + assignment section IDs.
  const [assignments, sections, classes, subjects, portalSelf] = await Promise.all([
    settledValue(listTeacherAssignments({ instituteId, teacherId }), []),
    settledValue(listSections(instituteId), []),
    settledValue(listClasses(instituteId), []),
    settledValue(listSubjects(instituteId), []),
    getTeacherSelfPortal({ instituteId, teacherId }).catch(() => null),
  ]);

  // Class-teacher sections must appear even without a subject placement yet.
  const classTeacherSectionIds = sections
    .filter((s) => s.classTeacherId === teacherId && s.status === "active")
    .map((s) => s.id);

  const portalAssignmentSectionIds = (portalSelf?.assignments ?? [])
    .map((a) => a.sectionId)
    .filter(Boolean);

  const labelMatchedSectionIds = matchSectionIdsByLabels(
    portalSelf?.assignedSectionLabels,
    sections,
    classes,
  );

  const sectionIds = [
    ...new Set([
      ...assignments.map((a) => a.sectionId),
      ...classTeacherSectionIds,
      ...portalAssignmentSectionIds,
      ...labelMatchedSectionIds,
    ]),
  ];

  // Soft-fail enrollments: keep classes even when roster fetches fail.
  const enrollmentResults = await Promise.allSettled(
    sectionIds.map((sectionId) => listEnrollments({ instituteId, sectionId })),
  );
  const enrollments = enrollmentResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );

  const teacherClasses = assignmentsToTeacherClasses(
    assignments,
    sections,
    classes,
    enrollments,
    subjects,
    teacherId,
  );

  // Ensure class-teacher-only / label-matched / portal sections appear in My Classes.
  const presentIds = new Set(teacherClasses.map((c) => c.id));
  const classesById = new Map(classes.map((c) => [c.id, c]));
  for (const sectionId of sectionIds) {
    if (presentIds.has(sectionId)) continue;
    const section = sections.find((s) => s.id === sectionId);
    if (section && section.status === "active") {
      const cls = classesById.get(section.classId);
      const isClassTeacher = section.classTeacherId === teacherId;
      teacherClasses.push({
        id: sectionId,
        className: cls?.name?.trim() || cls?.code?.trim() || "Class",
        section: section.code?.trim() || section.name?.trim() || "—",
        subject: isClassTeacher ? "Class teacher" : "Assigned",
        studentCount: enrollments.filter((e) => e.sectionId === sectionId).length,
        isClassTeacher,
        attendanceRate: 0,
        homeworkSubmissionRate: 0,
        avgScore: 0,
      });
      presentIds.add(sectionId);
      continue;
    }

    // Fallback when section catalog was scoped/failed: use portal self labels.
    const portalRow = portalSelf?.assignments?.find((a) => a.sectionId === sectionId);
    if (!portalRow) continue;
    teacherClasses.push({
      id: sectionId,
      className: portalRow.classLabel?.trim() || "Class",
      section: portalRow.sectionLabel?.trim() || "—",
      subject: portalRow.subjects?.join(", ") || "Assigned",
      studentCount: enrollments.filter((e) => e.sectionId === sectionId).length,
      isClassTeacher: (portalRow.subjects ?? []).includes("Class teacher"),
      attendanceRate: 0,
      homeworkSubmissionRate: 0,
      avgScore: 0,
    });
    presentIds.add(sectionId);
  }
  teacherClasses.sort((a, b) =>
    `${a.className}-${a.section}`.localeCompare(`${b.className}-${b.section}`),
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
