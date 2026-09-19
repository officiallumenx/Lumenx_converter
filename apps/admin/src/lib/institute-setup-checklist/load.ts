/**
 * Load institute setup counts from existing Admin APIs (soft-fail per source).
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAcademicYears } from "@/lib/academic-years/api";
import { listAttendanceConfig } from "@/lib/attendance/api";
import { listClassesCatalog } from "@/lib/classes/api";
import { listCalendarEvents } from "@/lib/calendar/api";
import { listFeePlans } from "@/lib/fees/api";
import { listParents } from "@/lib/parents/api";
import { parentDtosToListItems } from "@/lib/parents/map";
import { listStudents } from "@/lib/students/api";
import { listSubjects } from "@/lib/subjects/api";
import { listTeachers } from "@/lib/teachers/api";
import {
  listTransportDrivers,
  listTransportEnrollments,
  listTransportRoutes,
  listTransportVehicles,
} from "@/lib/transport/api";
import {
  adminCacheKey,
  cachedAdminFetch,
  invalidateAdminCache,
  peekAdminCacheSoft,
} from "@/lib/admin-resource-cache";
import { evaluateSetupProgress, summarizeSetupProgress } from "./progress";
import type { SetupChecklistState, SetupCounts } from "./types";

function emptyCounts(): SetupCounts {
  return {
    activeYears: 0,
    classes: 0,
    sections: 0,
    subjects: 0,
    teachers: 0,
    teachersWithLogin: 0,
    students: 0,
    studentsWithLogin: 0,
    parents: 0,
    parentsWithLinks: 0,
    attendanceConfigs: 0,
    publishedFeePlans: 0,
    calendarEvents: 0,
    vehicles: 0,
    drivers: 0,
    routes: 0,
    approvedRoutes: 0,
    enrollments: 0,
    approvedEnrollments: 0,
  };
}

function isCacheableSetupState(state: SetupChecklistState): boolean {
  return state.status === "ready";
}

async function fetchSetupChecklist(
  instituteId: string,
): Promise<SetupChecklistState> {
  const [
    years,
    catalog,
    subjects,
    teachers,
    students,
    parents,
    attendanceConfigs,
    feePlans,
    calendarEvents,
    vehicles,
    drivers,
    routes,
    enrollments,
  ] = await Promise.all([
    listAcademicYears({ instituteId }).catch(() => []),
    listClassesCatalog({ instituteId }).catch(() => ({
      classes: [],
      sections: [],
    })),
    listSubjects({ instituteId }).catch(() => []),
    listTeachers({ instituteId }).catch(() => []),
    listStudents({ instituteId }).catch(() => []),
    listParents({ instituteId }).catch(() => []),
    listAttendanceConfig({ instituteId }).catch(() => []),
    listFeePlans({ instituteId }).catch(() => []),
    listCalendarEvents({ instituteId }).catch(() => []),
    listTransportVehicles({ instituteId }).catch(() => []),
    listTransportDrivers({ instituteId }).catch(() => []),
    listTransportRoutes({ instituteId }).catch(() => []),
    listTransportEnrollments({ instituteId }).catch(() => []),
  ]);

  const parentItems = parentDtosToListItems(parents);

  const counts: SetupCounts = {
    activeYears: years.filter((y) => y.status === "active").length,
    classes: catalog.classes.length,
    sections: catalog.sections.length,
    subjects: subjects.length,
    teachers: teachers.length,
    teachersWithLogin: teachers.filter((t) => Boolean(t.userProfileId)).length,
    students: students.length,
    studentsWithLogin: students.filter((s) => Boolean(s.userProfileId)).length,
    parents: parents.length,
    parentsWithLinks: parentItems.filter((p) => p.linkedStudentIds.length > 0)
      .length,
    attendanceConfigs: attendanceConfigs.length,
    publishedFeePlans: feePlans.filter((p) => p.status === "published").length,
    calendarEvents: calendarEvents.length,
    vehicles: vehicles.length,
    drivers: drivers.length,
    routes: routes.length,
    approvedRoutes: routes.filter((r) => r.approvalStatus === "approved").length,
    enrollments: enrollments.length,
    approvedEnrollments: enrollments.filter(
      (e) => e.approvalStatus === "approved",
    ).length,
  };

  const steps = evaluateSetupProgress(counts);
  const summary = summarizeSetupProgress(steps);

  return {
    status: "ready",
    errorMessage: null,
    counts,
    steps,
    ...summary,
  };
}

export function peekSetupChecklistCache(
  activeInstituteId: string,
): SetupChecklistState | null {
  const cached = peekAdminCacheSoft<SetupChecklistState>(
    adminCacheKey("setup-checklist", activeInstituteId),
  );
  if (!cached || !isCacheableSetupState(cached)) return null;
  return cached;
}

export function invalidateSetupChecklistCache(instituteId?: string): void {
  if (instituteId) {
    invalidateAdminCache(adminCacheKey("setup-checklist", instituteId));
  } else {
    invalidateAdminCache("admin:setup-checklist:");
  }
}

export async function loadSetupChecklist(
  activeInstituteId: string | null,
  opts?: { force?: boolean },
): Promise<SetupChecklistState> {
  if (!isApiAuthMode()) {
    return {
      status: "error",
      errorMessage: "Setup checklist requires live institute data.",
      counts: null,
      steps: [],
      coreDone: 0,
      coreTotal: 0,
      extendedDone: 0,
      extendedTotal: 0,
      coreComplete: false,
    };
  }

  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return {
      status: "needs_institute",
      errorMessage: null,
      counts: null,
      steps: [],
      coreDone: 0,
      coreTotal: 0,
      extendedDone: 0,
      extendedTotal: 0,
      coreComplete: false,
    };
  }

  const cacheKey = adminCacheKey("setup-checklist", activeInstituteId);
  const poisoned = peekAdminCacheSoft<SetupChecklistState>(cacheKey);
  if (poisoned && !isCacheableSetupState(poisoned)) {
    invalidateAdminCache(cacheKey);
  }

  try {
    return await cachedAdminFetch(
      cacheKey,
      () => fetchSetupChecklist(activeInstituteId),
      { force: opts?.force },
    );
  } catch (err) {
    return {
      status: "error",
      errorMessage:
        err instanceof Error ? err.message : "Failed to load setup checklist",
      counts: emptyCounts(),
      steps: evaluateSetupProgress(emptyCounts()),
      ...summarizeSetupProgress(evaluateSetupProgress(emptyCounts())),
      coreComplete: false,
    };
  }
}
