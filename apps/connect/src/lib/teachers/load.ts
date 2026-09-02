import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";
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
}): Promise<PortalTeacherSelfDto> {
  return getTeacherSelfPortal({ instituteId: input.instituteId });
}

export async function loadTeacherPortalBundle(input: {
  instituteId: string;
  classes: import("@/lib/teacher/types").TeacherClass[];
}): Promise<{ profile: TeacherProfile; dashboard: DashboardSnapshot }> {
  const [portalSelf, timetable] = await Promise.all([
    loadTeacherPortalProfile({ instituteId: input.instituteId }),
    loadTeacherTimetable({ instituteId: input.instituteId }),
  ]);
  const profile = portalTeacherSelfToProfile(portalSelf);
  const base = buildTeacherDashboardFromApi({
    schedule: timetable.schedule,
    todayName: getTodayDayName(),
    classes: input.classes,
  });
  const dashboard = await enrichTeacherDashboardSnapshot({
    instituteId: input.instituteId,
    teacherId: portalSelf.teacherId,
    classes: input.classes,
    base,
  });
  return { profile, dashboard };
}
