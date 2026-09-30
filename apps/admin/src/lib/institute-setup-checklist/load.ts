/**
 * Load institute setup counts from existing Admin APIs.
 * Critical sources (years, classes/sections) must succeed — soft-failing them to
 * empty arrays was poisoning the checklist as “incomplete” after network flaps.
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

function isCacheableSetupState(state: SetupChecklistState): boolean {
  return state.status === "ready";
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function settledOk(result: PromiseSettledResult<unknown>): boolean {
  return result.status === "fulfilled";
}

async function fetchSetupChecklist(
  instituteId: string,
): Promise<SetupChecklistState> {
  const results = await Promise.allSettled([
    listAcademicYears({ instituteId }),
    listClassesCatalog({ instituteId }),
    listSubjects({ instituteId }),
    listTeachers({ instituteId }),
    listStudents({ instituteId }),
    listParents({ instituteId }),
    listAttendanceConfig({ instituteId }),
    listFeePlans({ instituteId }),
    listCalendarEvents({ instituteId }),
    listTransportVehicles({ instituteId }),
    listTransportDrivers({ instituteId }),
    listTransportRoutes({ instituteId }),
    listTransportEnrollments({ instituteId }),
  ]);

  const [
    yearsResult,
    catalogResult,
    subjectsResult,
    teachersResult,
    studentsResult,
    parentsResult,
    attendanceResult,
    feePlansResult,
    calendarResult,
    vehiclesResult,
    driversResult,
    routesResult,
    enrollmentsResult,
  ] = results;

  // Years + class catalog drive core gate — never invent "no years/classes".
  if (!settledOk(yearsResult) || !settledOk(catalogResult)) {
    const yearErr =
      yearsResult.status === "rejected"
        ? yearsResult.reason instanceof Error
          ? yearsResult.reason.message
          : "Failed to load academic years"
        : null;
    const catalogErr =
      catalogResult.status === "rejected"
        ? catalogResult.reason instanceof Error
          ? catalogResult.reason.message
          : "Failed to load classes"
        : null;
    throw new Error(yearErr ?? catalogErr ?? "Failed to load setup checklist");
  }

  const years = settledValue(yearsResult, []);
  const catalog = settledValue(catalogResult, { classes: [], sections: [] });
  const subjects = settledValue(subjectsResult, []);
  const teachers = settledValue(teachersResult, []);
  const students = settledValue(studentsResult, []);
  const parents = settledValue(parentsResult, []);
  const attendanceConfigs = settledValue(attendanceResult, []);
  const feePlans = settledValue(feePlansResult, []);
  const calendarEvents = settledValue(calendarResult, []);
  const vehicles = settledValue(vehiclesResult, []);
  const drivers = settledValue(driversResult, []);
  const routes = settledValue(routesResult, []);
  const enrollments = settledValue(enrollmentsResult, []);

  const parentItems = parentDtosToListItems(parents);

  // Active or upcoming counts as configured (create often leaves first year active;
  // older data may still be upcoming until activated).
  const usableYears = years.filter(
    (y) => y.status === "active" || y.status === "upcoming",
  ).length;

  const counts: SetupCounts = {
    activeYears: usableYears,
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
      counts: null,
      steps: [],
      coreDone: 0,
      coreTotal: 0,
      extendedDone: 0,
      extendedTotal: 0,
      coreComplete: false,
    };
  }
}
