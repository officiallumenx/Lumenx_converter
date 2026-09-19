/**
 * Institute setup checklist — API-driven progress for Admin onboarding.
 */

export type SetupStepId =
  | "academic_year"
  | "classes"
  | "sections"
  | "subjects"
  | "teachers"
  | "students"
  | "parents"
  | "attendance_config"
  | "fees"
  | "calendar"
  | "transport_fleet"
  | "transport_routes"
  | "transport_enrollments";

export type SetupStepState = "done" | "todo" | "blocked";

export type SetupStepKind = "core" | "extended";

export type SetupStepDef = {
  id: SetupStepId;
  kind: SetupStepKind;
  title: string;
  description: string;
  href: string;
  search?: Record<string, string>;
  /** Prior step ids that must be done before this is actionable. */
  requires: SetupStepId[];
};

export type SetupCounts = {
  activeYears: number;
  classes: number;
  sections: number;
  subjects: number;
  teachers: number;
  teachersWithLogin: number;
  students: number;
  studentsWithLogin: number;
  parents: number;
  parentsWithLinks: number;
  attendanceConfigs: number;
  publishedFeePlans: number;
  calendarEvents: number;
  vehicles: number;
  drivers: number;
  routes: number;
  approvedRoutes: number;
  enrollments: number;
  approvedEnrollments: number;
};

export type SetupStepProgress = SetupStepDef & {
  state: SetupStepState;
  detail: string;
  blockedReason: string | null;
};

export type SetupChecklistState = {
  status: "loading" | "needs_institute" | "ready" | "error";
  errorMessage: string | null;
  counts: SetupCounts | null;
  steps: SetupStepProgress[];
  coreDone: number;
  coreTotal: number;
  extendedDone: number;
  extendedTotal: number;
  coreComplete: boolean;
};
