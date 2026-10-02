/**
 * Load institute setup counts from existing Admin APIs.
 * Core sources (years, classes/sections, subjects, teachers, students, parents)
 * must succeed — soft-failing them to empty arrays poisons the checklist as
 * “incomplete” after network flaps and re-locks Admin.
 * Extended sources (attendance, fees, calendar, transport) may soft-fail.
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
import {
  listStudentsCached,
  listTeachersCached,
} from "@/lib/directory-lists-cache";
import { listSubjects } from "@/lib/subjects/api";
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

const COMPLETE_SNAPSHOT_PREFIX = "lumenx.admin.setup-core-complete.v1:";

function isCacheableSetupState(state: SetupChecklistState): boolean {
  return state.status === "ready";
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function settledOk(result: PromiseSettledResult<unknown>): boolean {
  return result.status === "fulfilled";
}

function rejectMessage(
  result: PromiseSettledResult<unknown>,
  fallback: string,
): string {
  if (result.status !== "rejected") return fallback;
  return result.reason instanceof Error ? result.reason.message : fallback;
}

function completeSnapshotKey(instituteId: string): string {
  return `${COMPLETE_SNAPSHOT_PREFIX}${instituteId}`;
}

/** Last verified core-complete flag (institute-scoped). Not auth secrets. */
export function readVerifiedSetupCoreComplete(instituteId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(completeSnapshotKey(instituteId)) === "1";
  } catch {
    return false;
  }
}

export function writeVerifiedSetupCoreComplete(
  instituteId: string,
  complete: boolean,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    const key = completeSnapshotKey(instituteId);
    if (complete) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // Ignore quota / private mode.
  }
}

export function clearVerifiedSetupCoreComplete(instituteId?: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (instituteId) {
      localStorage.removeItem(completeSnapshotKey(instituteId));
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(COMPLETE_SNAPSHOT_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

async function fetchSetupChecklist(
  instituteId: string,
): Promise<SetupChecklistState> {
  const results = await Promise.allSettled([
    listAcademicYears({ instituteId }),
    listClassesCatalog({ instituteId }),
    listSubjects({ instituteId }),
    listTeachersCached(instituteId),
    listStudentsCached(instituteId),
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

  // All core gate sources must succeed — never invent empty core counts.
  const coreResults: Array<{ ok: boolean; message: string }> = [
    {
      ok: settledOk(yearsResult),
      message: rejectMessage(yearsResult, "Failed to load academic years"),
    },
    {
      ok: settledOk(catalogResult),
      message: rejectMessage(catalogResult, "Failed to load classes"),
    },
    {
      ok: settledOk(subjectsResult),
      message: rejectMessage(subjectsResult, "Failed to load subjects"),
    },
    {
      ok: settledOk(teachersResult),
      message: rejectMessage(teachersResult, "Failed to load teachers"),
    },
    {
      ok: settledOk(studentsResult),
      message: rejectMessage(studentsResult, "Failed to load students"),
    },
    {
      ok: settledOk(parentsResult),
      message: rejectMessage(parentsResult, "Failed to load parents"),
    },
  ];
  const coreFailure = coreResults.find((r) => !r.ok);
  if (coreFailure) {
    throw new Error(coreFailure.message);
  }

  const years = settledValue(yearsResult, []);
  const catalog = settledValue(catalogResult, { classes: [], sections: [] });
  const subjects = settledValue(subjectsResult, []);
  const teachers = settledValue(teachersResult, []);
  const students = settledValue(studentsResult, []);
  const parents = settledValue(parentsResult, []);
  // Extended steps may soft-fail to empty without locking Admin.
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

  writeVerifiedSetupCoreComplete(instituteId, summary.coreComplete);

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
