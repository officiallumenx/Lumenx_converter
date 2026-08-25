/**
 * Programmatic workflow verification — method × owner matrix against one engine.
 */

import { createAttendanceWorkflow } from "./attendance-engine";
import { buildAttendanceSlots } from "./slots";
import type {
  AttendanceActor,
  AttendanceConfigVersion,
  AttendanceMethod,
  AttendanceOwner,
} from "./types";

export type WorkflowVerificationCase = {
  id: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  actor: "class_teacher" | "period_teacher" | "incharge" | "other_teacher";
  expectCanMark: boolean;
  expectSlotCount: number;
  expectMarkableCount?: number;
  /** When true, period_wise runs with zero timetable periods (no placeholder). */
  emptyPeriods?: boolean;
  /** Override actor.subjects (e.g. English teacher for Morning First CPT). */
  actorSubjects?: string[];
};

const PERIODS = [
  { index: 0, subject: "English", time: "08:00" },
  { index: 1, subject: "Mathematics", time: "08:45" },
  { index: 2, subject: "Physics", time: "09:30" },
];

function actorFor(
  kind: WorkflowVerificationCase["actor"],
): AttendanceActor {
  if (kind === "incharge") {
    return {
      teacherId: "t-incharge",
      teacherName: "Incharge",
      subjects: ["Mathematics"],
      isClassTeacherForSection: false,
      isAttendanceIncharge: true,
      teachesSection: true,
    };
  }
  if (kind === "class_teacher") {
    return {
      teacherId: "t-ct",
      teacherName: "Class Teacher",
      subjects: ["Mathematics"],
      isClassTeacherForSection: true,
      isAttendanceIncharge: false,
      teachesSection: true,
    };
  }
  if (kind === "period_teacher") {
    return {
      teacherId: "t-math",
      teacherName: "Math Teacher",
      subjects: ["Mathematics"],
      isClassTeacherForSection: false,
      isAttendanceIncharge: false,
      teachesSection: true,
    };
  }
  return {
    teacherId: "t-other",
    teacherName: "Other",
    subjects: ["Art"],
    isClassTeacherForSection: false,
    isAttendanceIncharge: false,
    teachesSection: false,
  };
}

function configOf(
  method: AttendanceMethod,
  owner: AttendanceOwner,
): AttendanceConfigVersion {
  return {
    id: `verify-${method}-${owner}`,
    effectiveFrom: "2026-04-01",
    method,
    owner,
    scope: "institute",
    classTargets: [],
    sectionTargets: [],
    createdAt: "2026-04-01T00:00:00.000Z",
    createdBy: "Verify",
  };
}

export const WORKFLOW_VERIFICATION_CASES: WorkflowVerificationCase[] = [
  // Daily
  {
    id: "daily-class_teacher-ct",
    method: "daily",
    owner: "class_teacher",
    actor: "class_teacher",
    expectCanMark: true,
    expectSlotCount: 1,
  },
  {
    id: "daily-class_teacher-other",
    method: "daily",
    owner: "class_teacher",
    actor: "other_teacher",
    expectCanMark: false,
    expectSlotCount: 1,
  },
  {
    id: "daily-period_teacher-assigned",
    method: "daily",
    owner: "current_period_teacher",
    actor: "period_teacher",
    expectCanMark: true,
    expectSlotCount: 1,
  },
  {
    id: "daily-incharge",
    method: "daily",
    owner: "attendance_incharge",
    actor: "incharge",
    expectCanMark: true,
    expectSlotCount: 1,
  },
  {
    id: "daily-incharge-blocked-ct",
    method: "daily",
    owner: "attendance_incharge",
    actor: "class_teacher",
    expectCanMark: false,
    expectSlotCount: 1,
  },
  // Morning + Afternoon
  {
    id: "ma-class_teacher",
    method: "morning_afternoon",
    owner: "class_teacher",
    actor: "class_teacher",
    expectCanMark: true,
    expectSlotCount: 2,
  },
  {
    id: "ma-period_teacher",
    method: "morning_afternoon",
    owner: "current_period_teacher",
    actor: "period_teacher",
    expectCanMark: true,
    expectSlotCount: 2,
  },
  {
    id: "ma-incharge",
    method: "morning_afternoon",
    owner: "attendance_incharge",
    actor: "incharge",
    expectCanMark: true,
    expectSlotCount: 2,
  },
  // Period wise
  {
    id: "period-class_teacher-all",
    method: "period_wise",
    owner: "class_teacher",
    actor: "class_teacher",
    expectCanMark: true,
    expectSlotCount: 3,
    expectMarkableCount: 3,
  },
  {
    id: "period-period_teacher-math-only",
    method: "period_wise",
    owner: "current_period_teacher",
    actor: "period_teacher",
    expectCanMark: true,
    expectSlotCount: 3,
    expectMarkableCount: 1,
  },
  {
    id: "period-incharge-all",
    method: "period_wise",
    owner: "attendance_incharge",
    actor: "incharge",
    expectCanMark: true,
    expectSlotCount: 3,
    expectMarkableCount: 3,
  },
  {
    id: "period-other-blocked",
    method: "period_wise",
    owner: "current_period_teacher",
    actor: "other_teacher",
    expectCanMark: false,
    expectSlotCount: 3,
  },
  {
    id: "period-no-timetable-periods",
    method: "period_wise",
    owner: "class_teacher",
    actor: "class_teacher",
    expectCanMark: false,
    expectSlotCount: 0,
    expectMarkableCount: 0,
    /** Empty periods — engine must not invent placeholder Period 1. */
    emptyPeriods: true,
  },
  // Morning First (PERIODS[0] = English)
  {
    id: "mf-class_teacher",
    method: "morning_first_period",
    owner: "class_teacher",
    actor: "class_teacher",
    expectCanMark: true,
    expectSlotCount: 1,
  },
  {
    id: "mf-cpt-math-blocked",
    method: "morning_first_period",
    owner: "current_period_teacher",
    actor: "period_teacher",
    expectCanMark: false,
    expectSlotCount: 1,
    expectMarkableCount: 0,
  },
  {
    id: "mf-cpt-english-ok",
    method: "morning_first_period",
    owner: "current_period_teacher",
    actor: "period_teacher",
    actorSubjects: ["English"],
    expectCanMark: true,
    expectSlotCount: 1,
    expectMarkableCount: 1,
  },
  {
    id: "mf-incharge",
    method: "morning_first_period",
    owner: "attendance_incharge",
    actor: "incharge",
    expectCanMark: true,
    expectSlotCount: 1,
  },
  {
    id: "mf-incharge-blocked-ct",
    method: "morning_first_period",
    owner: "attendance_incharge",
    actor: "class_teacher",
    expectCanMark: false,
    expectSlotCount: 1,
  },
];

export type WorkflowVerificationResult = {
  id: string;
  passed: boolean;
  detail: string;
};

export function runAttendanceWorkflowVerification(): {
  passed: number;
  failed: number;
  results: WorkflowVerificationResult[];
} {
  const results: WorkflowVerificationResult[] = [];

  for (const c of WORKFLOW_VERIFICATION_CASES) {
    const periods =
      c.emptyPeriods
        ? []
        : c.method === "period_wise" || c.method === "morning_first_period"
          ? PERIODS
          : [];
    const expectedSlots = buildAttendanceSlots(c.method, periods);
    const baseActor = actorFor(c.actor);
    const actor: AttendanceActor = c.actorSubjects
      ? { ...baseActor, subjects: c.actorSubjects }
      : baseActor;
    const workflow = createAttendanceWorkflow({
      config: configOf(c.method, c.owner),
      actor,
      periods,
    });

    const slotOk = workflow.slots.length === c.expectSlotCount;
    const canOk = workflow.canMarkAny === c.expectCanMark;
    const markableOk =
      c.expectMarkableCount == null ||
      workflow.markableSlotIds.length === c.expectMarkableCount;
    const slotsMatchEngine =
      expectedSlots.length === workflow.slots.length &&
      workflow.slots.every((s, i) => s.id === expectedSlots[i]?.id);
    const noPlaceholder =
      !c.emptyPeriods ||
      !workflow.slots.some(
        (s) => s.id === "slot:period:0" && !s.subject && s.label === "Period 1",
      );
    const passed =
      slotOk && canOk && markableOk && slotsMatchEngine && noPlaceholder;

    results.push({
      id: c.id,
      passed,
      detail: passed
        ? `OK · slots=${workflow.slots.length} markable=${workflow.markableSlotIds.length}`
        : `FAIL · slots=${workflow.slots.length}/${c.expectSlotCount} canMark=${workflow.canMarkAny}/${c.expectCanMark} markable=${workflow.markableSlotIds.length}/${c.expectMarkableCount ?? "n/a"}`,
    });
  }

  // History freeze check: saving under daily must not change slot shape of a prior morning register conceptually
  const dailySlots = buildAttendanceSlots("daily");
  const morningFirstSlots = buildAttendanceSlots("morning_first_period");
  const morningSlots = buildAttendanceSlots("morning_afternoon");
  const freezeOk =
    dailySlots.length === 1 &&
    morningFirstSlots.length === 1 &&
    morningSlots.length === 2 &&
    morningFirstSlots[0]!.id === "slot:morning-first" &&
    dailySlots[0]!.id !== morningSlots[0]!.id;
  results.push({
    id: "history-slot-identity-stable",
    passed: freezeOk,
    detail: freezeOk
      ? "OK · daily / morning-first / morning+afternoon use distinct slot shapes"
      : "FAIL · slot ids collide across methods",
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  return { passed, failed, results };
}

export function formatAttendanceWorkflowVerificationReport(): string {
  const run = runAttendanceWorkflowVerification();
  const lines = [
    "# Attendance Workflow Verification Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `**Result:** ${run.failed === 0 ? "PASS" : "FAIL"} · ${run.passed} passed · ${run.failed} failed`,
    "",
    "## Engine rules",
    "",
    "| Attendance Method | Slots produced |",
    "|-------------------|----------------|",
    "| Daily | 1 · Full day (`slot:day`) |",
    "| Morning First | 1 · Morning first (`slot:morning-first`) |",
    "| Morning + Afternoon | 2 · Morning, Afternoon |",
    "| Period Wise | N · one per timetable period |",
    "",
    "| Attendance Owner | Who may mark |",
    "|------------------|--------------|",
    "| Class Teacher | Class teacher of the section — all slots |",
    "| Current Period Teacher | Assigned section teachers; period slots filtered by subject |",
    "| Attendance Coordinator | Coordinator only — all slots |",
    "",
    "## Case results",
    "",
    "| Case | Status | Detail |",
    "|------|--------|--------|",
    ...run.results.map(
      (r) => `| \`${r.id}\` | ${r.passed ? "PASS" : "FAIL"} | ${r.detail} |`,
    ),
    "",
    "## Notes",
    "",
    "- One engine: `createAttendanceWorkflow` (config + actor + periods) → all methods & owners.",
    "- `openAttendanceWorkflow` only resolves live config, then calls the same factory.",
    "- Method → slots; owner → markable slots. Apps must not duplicate either.",
    "- Registers freeze `method`, `owner`, and `configVersionId` at save time so mid-year config changes never rewrite history.",
    "",
  ];
  return lines.join("\n");
}
