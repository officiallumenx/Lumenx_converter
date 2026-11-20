import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
import { getPhotoSignedUrl } from "@/lib/photos/api";
import { getTeacherPortalApiCache } from "@/lib/teacher-classes/load";
import { getLearnerFacultyPortal, getTeacherSelfPortal } from "./api";
import {
  buildTeacherDashboardFromApi,
  facultyDtoToCards,
  portalTeacherSelfToProfile,
} from "./map";
import type { LearnerTeacherCard, PortalTeacherSelfDto } from "./types";
import type { DashboardSnapshot, TeacherProfile } from "@/lib/teacher/types";
import { loadTeacherTimetable } from "@/lib/timetable/load";
import { getTodayDayName } from "@/lib/teacher/repositories";
import { enrichTeacherDashboardSnapshot } from "@/lib/dashboard";

export type LearnerTeachersLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "empty"
  | "error"
  | "needs_institute"
  | "forbidden";

async function resolveTeacherPhotoUrl(
  teacherId: string,
  photoAssetPath: string | null | undefined,
): Promise<string | undefined> {
  if (!photoAssetPath?.trim()) return undefined;
  try {
    const signed = await getPhotoSignedUrl("teacher", teacherId);
    return signed.photoSignedUrl ?? undefined;
  } catch {
    return undefined;
  }
}

export async function loadLearnerTeachers(input: {
  instituteId: string | null;
  studentId: string | null;
}): Promise<{
  status: LearnerTeachersLoadStatus;
  teachers: LearnerTeacherCard[];
  classLabel: string | null;
  sectionLabel: string | null;
  errorMessage: string | null;
}> {
  if (!isApiAuthMode()) {
    return {
      status: "demo",
      teachers: [],
      classLabel: null,
      sectionLabel: null,
      errorMessage: null,
    };
  }
  if (
    !input.instituteId ||
    !isInstituteUuid(input.instituteId) ||
    !input.studentId ||
    !isInstituteUuid(input.studentId)
  ) {
    return {
      status: "needs_institute",
      teachers: [],
      classLabel: null,
      sectionLabel: null,
      errorMessage: null,
    };
  }

  try {
    const dto = await getLearnerFacultyPortal({
      instituteId: input.instituteId,
      studentId: input.studentId,
    });
    const teachers = facultyDtoToCards(dto);
    return {
      status: teachers.length === 0 ? "empty" : "ready",
      teachers,
      classLabel: dto.classLabel,
      sectionLabel: dto.sectionLabel,
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load teachers";
    if (status === 403) {
      return {
        status: "forbidden",
        teachers: [],
        classLabel: null,
        sectionLabel: null,
        errorMessage: message,
      };
    }
    return {
      status: "error",
      teachers: [],
      classLabel: null,
      sectionLabel: null,
      errorMessage: message,
    };
  }
}

export async function loadTeacherPortalProfile(input: {
  instituteId: string;
  teacherId?: string;
}): Promise<PortalTeacherSelfDto> {
  const roster = getTeacherPortalApiCache();
  if (
    roster?.instituteId === input.instituteId &&
    roster.portalSelf &&
    (!input.teacherId || roster.portalSelf.teacherId === input.teacherId)
  ) {
    return roster.portalSelf;
  }
  return getTeacherSelfPortal({
    instituteId: input.instituteId,
    teacherId: input.teacherId,
  });
}

/** Profile + timetable shell — enough for first usable Teacher Home paint. */
export async function loadTeacherPortalBase(input: {
  instituteId: string;
  classes: import("@/lib/teacher/types").TeacherClass[];
  signal?: AbortSignal;
  /**
   * When the Home context already started timetable in parallel with roster,
   * pass the schedule here to avoid a second `/timetable/portal/teacher` wait.
   */
  schedule?: import("@/lib/timetable/types").WeeklyTimetable;
}): Promise<{
  profile: TeacherProfile;
  dashboard: DashboardSnapshot;
  teacherId: string;
  portalSelf: PortalTeacherSelfDto;
}> {
  if (input.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const roster = getTeacherPortalApiCache();
  const teacherIdHint =
    roster?.instituteId === input.instituteId ? roster.teacherId : undefined;
  const portalSelfPromise = loadTeacherPortalProfile({
    instituteId: input.instituteId,
    teacherId: teacherIdHint,
  });
  const timetablePromise =
    input.schedule != null
      ? Promise.resolve({ schedule: input.schedule, status: "ready" as const })
      : loadTeacherTimetable({
          instituteId: input.instituteId,
          teacherId: teacherIdHint,
        });
  const [portalSelf, timetable] = await Promise.all([
    portalSelfPromise,
    timetablePromise,
  ]);
  if (input.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  // Prefer portal-provided signed URL; fall back to photos signed-url endpoint.
  let photoUrl = portalSelf.photoSignedUrl?.trim() || undefined;
  if (!photoUrl && portalSelf.photoAssetPath?.trim()) {
    photoUrl = await resolveTeacherPhotoUrl(
      portalSelf.teacherId,
      portalSelf.photoAssetPath,
    );
  }
  const profile = portalTeacherSelfToProfile(portalSelf, photoUrl);
  const dashboard = buildTeacherDashboardFromApi({
    schedule: timetable.schedule,
    todayName: getTodayDayName(),
    classes: input.classes,
  });
  return { profile, dashboard, teacherId: portalSelf.teacherId, portalSelf };
}

/** Full bundle (base + enrichment). Prefer split base/enrich queries on Home. */
export async function loadTeacherPortalBundle(input: {
  instituteId: string;
  classes: import("@/lib/teacher/types").TeacherClass[];
  signal?: AbortSignal;
}): Promise<{ profile: TeacherProfile; dashboard: DashboardSnapshot }> {
  const base = await loadTeacherPortalBase(input);
  if (input.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const dashboard = await enrichTeacherDashboardSnapshot({
    instituteId: input.instituteId,
    teacherId: base.teacherId,
    classes: input.classes,
    base: base.dashboard,
  });
  return { profile: base.profile, dashboard };
}
