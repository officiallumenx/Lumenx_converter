import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { getTeacherSelfPortal } from "@/lib/teachers/api";
import type { PortalTeacherSelfDto } from "@/lib/teachers/types";
import type { TeacherClass, TeacherStudent } from "@/lib/teacher/types";
import {
  clearTeacherCatalogCache,
  fetchMe,
  listClasses,
  listEnrollments,
  listSections,
  listSubjects,
  listTeacherAssignments,
  type ClassDto,
  type SectionDto,
} from "./api";
import { listSectionStudentPhotos } from "@/lib/photos/api";
import {
  applyStudentPhotoUrls,
  assignmentsToTeacherClasses,
  enrollmentsToTeacherStudents,
} from "./map";

export type TeacherPortalApiData = {
  instituteId: string;
  teacherId: string;
  /** Self-portal DTO from roster — reused by Home base + session (no second portal/me). */
  portalSelf: PortalTeacherSelfDto | null;
  classes: TeacherClass[];
  studentsBySection: Map<string, TeacherStudent[]>;
  allStudents: TeacherStudent[];
  /**
   * False when Home shell skipped enrollments/photos for faster paint.
   * Background fill sets this true without blocking the shell.
   */
  studentsLoaded: boolean;
};

export type LoadTeacherPortalApiOptions = {
  /**
   * When false, skip enrollments + student photos (Home shell).
   * Classes still resolve from assignments / portal / class-teacher links.
   * Default true for My Classes / search callers.
   */
  includeStudents?: boolean;
};

let cached: TeacherPortalApiData | null = null;
/** Bumped on clear / institute switch so in-flight loads cannot clobber a newer roster. */
let rosterCacheEpoch = 0;

export function getTeacherPortalApiCache(): TeacherPortalApiData | null {
  return cached;
}

/** Drop module roster only (keeps catalog TTL). Use on institute switch. */
export function bumpTeacherPortalRosterEpoch(): void {
  rosterCacheEpoch += 1;
  cached = null;
}

export function clearTeacherPortalApiCache(): void {
  bumpTeacherPortalRosterEpoch();
  // Optional so unit tests can mock ./api without exporting the clearer.
  if (typeof clearTeacherCatalogCache === "function") {
    clearTeacherCatalogCache();
  }
}

function commitRosterCache(
  epoch: number,
  next: TeacherPortalApiData,
): TeacherPortalApiData {
  if (epoch !== rosterCacheEpoch) {
    // Stale load after clear/switch — return data to the caller but do not publish.
    return next;
  }
  cached = next;
  return cached;
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
  options?: LoadTeacherPortalApiOptions,
): Promise<TeacherPortalApiData | null> {
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) {
    bumpTeacherPortalRosterEpoch();
    return null;
  }
  const epoch = rosterCacheEpoch;
  const includeStudents = options?.includeStudents !== false;

  // Reuse in-memory roster when scope matches (same institute + freshness needs).
  // Full roster satisfies shell callers; shell must not satisfy student consumers.
  if (cached?.instituteId === instituteId) {
    if (cached.studentsLoaded) return cached;
    if (!includeStudents) return cached;
  }

  // Upgrade Home shell → full students without a second me/catalog/portal/me round-trip.
  if (
    includeStudents &&
    cached?.instituteId === instituteId &&
    !cached.studentsLoaded &&
    cached.teacherId
  ) {
    const shell = cached;
    const teacherId = shell.teacherId;
    const sectionIds = [...new Set(shell.classes.map((c) => c.id))];
    const [sections, classes, enrollmentResults] = await Promise.all([
      settledValue(listSections(instituteId), []),
      settledValue(listClasses(instituteId), []),
      Promise.allSettled(
        sectionIds.map((sectionId) => listEnrollments({ instituteId, sectionId })),
      ),
    ]);
    const enrollments = enrollmentResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );

    const studentsBySection = new Map<string, TeacherStudent[]>();
    for (const sectionId of sectionIds) {
      const sectionEnrollments = enrollments.filter((e) => e.sectionId === sectionId);
      studentsBySection.set(
        sectionId,
        enrollmentsToTeacherStudents(sectionEnrollments, sections, classes),
      );
    }

    const photoResults = await Promise.allSettled(
      sectionIds.map(async (sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        const classId =
          section?.classId ??
          shell.classes.find((c) => c.id === sectionId)?.classRecordId;
        if (!classId || !isInstituteUuid(classId)) {
          return { sectionId, map: new Map<string, string>() };
        }
        const rows = await listSectionStudentPhotos({
          instituteId,
          classId,
          sectionId,
        });
        const map = new Map<string, string>();
        for (const row of rows) {
          if (row.photoSignedUrl?.trim()) map.set(row.id, row.photoSignedUrl.trim());
        }
        return { sectionId, map };
      }),
    );
    for (const result of photoResults) {
      if (result.status !== "fulfilled") continue;
      const { sectionId, map } = result.value;
      const current = studentsBySection.get(sectionId);
      if (!current) continue;
      studentsBySection.set(sectionId, applyStudentPhotoUrls(current, map));
    }

    const photoByStudent = new Map<string, string>();
    for (const list of studentsBySection.values()) {
      for (const s of list) {
        if (s.photoUrl) photoByStudent.set(s.id, s.photoUrl);
      }
    }
    const allStudents = applyStudentPhotoUrls(
      enrollmentsToTeacherStudents(enrollments, sections, classes),
      photoByStudent,
    );
    const teacherClasses = shell.classes.map((c) => ({
      ...c,
      studentCount: enrollments.filter((e) => e.sectionId === c.id).length,
    }));
    return commitRosterCache(epoch, {
      instituteId,
      teacherId,
      portalSelf: shell.portalSelf,
      classes: teacherClasses,
      studentsBySection,
      allStudents,
      studentsLoaded: true,
    });
  }

  const me = await fetchMe();
  const teacherId = resolveTeacherIdForInstitute(me, instituteId);
  if (!teacherId) {
    if (epoch === rosterCacheEpoch) cached = null;
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

  // Home shell skips enrollments/photos — those block timetable overlap and are
  // non-essential for "classes today" paint. My Classes loads them via includeStudents.
  let enrollments: Awaited<ReturnType<typeof listEnrollments>> = [];
  if (includeStudents) {
    const enrollmentResults = await Promise.allSettled(
      sectionIds.map((sectionId) => listEnrollments({ instituteId, sectionId })),
    );
    enrollments = enrollmentResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
  }

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
        classRecordId: section.classId,
        academicYearId: section.academicYearId,
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

  if (includeStudents) {
    // One photos/students request per section (batched), never N signed-url calls.
    const photoResults = await Promise.allSettled(
      sectionIds.map(async (sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        const classId = section?.classId;
        if (!classId || !isInstituteUuid(classId)) {
          return { sectionId, map: new Map<string, string>() };
        }
        const rows = await listSectionStudentPhotos({
          instituteId,
          classId,
          sectionId,
        });
        const map = new Map<string, string>();
        for (const row of rows) {
          if (row.photoSignedUrl?.trim()) map.set(row.id, row.photoSignedUrl.trim());
        }
        return { sectionId, map };
      }),
    );
    for (const result of photoResults) {
      if (result.status !== "fulfilled") continue;
      const { sectionId, map } = result.value;
      const current = studentsBySection.get(sectionId);
      if (!current) continue;
      studentsBySection.set(sectionId, applyStudentPhotoUrls(current, map));
    }
  }

  const photoByStudent = new Map<string, string>();
  for (const list of studentsBySection.values()) {
    for (const s of list) {
      if (s.photoUrl) photoByStudent.set(s.id, s.photoUrl);
    }
  }
  const allStudents = applyStudentPhotoUrls(
    enrollmentsToTeacherStudents(enrollments, sections, classes),
    photoByStudent,
  );
  return commitRosterCache(epoch, {
    instituteId,
    teacherId,
    portalSelf,
    classes: teacherClasses,
    studentsBySection,
    allStudents,
    studentsLoaded: includeStudents,
  });
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
