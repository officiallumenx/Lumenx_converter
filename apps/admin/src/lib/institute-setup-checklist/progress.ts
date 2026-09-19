import type { SetupCounts, SetupStepId, SetupStepProgress } from "./types";
import { SETUP_STEPS } from "./steps";

function isSatisfied(id: SetupStepId, counts: SetupCounts): boolean {
  switch (id) {
    case "academic_year":
      return counts.activeYears > 0;
    case "classes":
      return counts.classes > 0;
    case "sections":
      return counts.sections > 0;
    case "subjects":
      return counts.subjects > 0;
    case "teachers":
      return counts.teachers > 0;
    case "students":
      return counts.students > 0;
    case "parents":
      return counts.parents > 0 && counts.parentsWithLinks > 0;
    case "attendance_config":
      return counts.attendanceConfigs > 0;
    case "fees":
      return counts.publishedFeePlans > 0;
    case "calendar":
      return counts.calendarEvents > 0;
    case "transport_fleet":
      return counts.vehicles > 0 && counts.drivers > 0;
    case "transport_routes":
      return counts.approvedRoutes > 0 || counts.routes > 0;
    case "transport_enrollments":
      return counts.approvedEnrollments > 0 || counts.enrollments > 0;
    default:
      return false;
  }
}

function detailFor(id: SetupStepId, counts: SetupCounts): string {
  switch (id) {
    case "academic_year":
      return counts.activeYears > 0
        ? `${counts.activeYears} active year${counts.activeYears === 1 ? "" : "s"}`
        : "No active academic year";
    case "classes":
      return counts.classes > 0 ? `${counts.classes} classes` : "No classes yet";
    case "sections":
      return counts.sections > 0 ? `${counts.sections} sections` : "No sections yet";
    case "subjects":
      return counts.subjects > 0 ? `${counts.subjects} subjects` : "No subjects yet";
    case "teachers":
      return counts.teachers > 0
        ? `${counts.teachers} teachers · ${counts.teachersWithLogin} with login`
        : "No teachers yet";
    case "students":
      return counts.students > 0
        ? `${counts.students} students · ${counts.studentsWithLogin} with login`
        : "No students yet";
    case "parents":
      return counts.parents > 0
        ? `${counts.parents} parents · ${counts.parentsWithLinks} with linked children`
        : "No parents yet";
    case "attendance_config":
      return counts.attendanceConfigs > 0
        ? "Attendance rules configured"
        : "Attendance rules not configured";
    case "fees":
      return counts.publishedFeePlans > 0
        ? `${counts.publishedFeePlans} published plan${counts.publishedFeePlans === 1 ? "" : "s"}`
        : "No published fee plan";
    case "calendar":
      return counts.calendarEvents > 0
        ? `${counts.calendarEvents} calendar items`
        : "No calendar events yet";
    case "transport_fleet":
      return counts.vehicles > 0 || counts.drivers > 0
        ? `${counts.vehicles} vehicles · ${counts.drivers} drivers`
        : "No fleet yet";
    case "transport_routes":
      return counts.routes > 0
        ? `${counts.routes} routes · ${counts.approvedRoutes} approved`
        : "No routes yet";
    case "transport_enrollments":
      return counts.enrollments > 0
        ? `${counts.enrollments} enrollments · ${counts.approvedEnrollments} approved`
        : "No transport enrollments";
    default:
      return "";
  }
}

function titleFor(id: SetupStepId): string {
  return SETUP_STEPS.find((s) => s.id === id)?.title ?? id;
}

export function evaluateSetupProgress(counts: SetupCounts): SetupStepProgress[] {
  const done = new Set<SetupStepId>();
  for (const step of SETUP_STEPS) {
    if (isSatisfied(step.id, counts)) done.add(step.id);
  }

  return SETUP_STEPS.map((step) => {
    const missing = step.requires.filter((id) => !done.has(id));
    if (done.has(step.id)) {
      return {
        ...step,
        state: "done" as const,
        detail: detailFor(step.id, counts),
        blockedReason: null,
      };
    }
    if (missing.length > 0) {
      return {
        ...step,
        state: "blocked" as const,
        detail: detailFor(step.id, counts),
        blockedReason: `Finish first: ${missing.map(titleFor).join(", ")}`,
      };
    }
    return {
      ...step,
      state: "todo" as const,
      detail: detailFor(step.id, counts),
      blockedReason: null,
    };
  });
}

export function summarizeSetupProgress(steps: SetupStepProgress[]) {
  const core = steps.filter((s) => s.kind === "core");
  const extended = steps.filter((s) => s.kind === "extended");
  const coreDone = core.filter((s) => s.state === "done").length;
  const extendedDone = extended.filter((s) => s.state === "done").length;
  return {
    coreDone,
    coreTotal: core.length,
    extendedDone,
    extendedTotal: extended.length,
    coreComplete: coreDone === core.length,
  };
}
