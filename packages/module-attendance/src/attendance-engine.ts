/**
 * ONE Attendance Engine — configuration in, workflow out.
 *
 * Rules:
 * - Never duplicate this path in Admin / Connect / reports.
 * - Method → slots only (`buildAttendanceSlots`).
 * - Owner → who may mark only (`resolveMarkableSlots`).
 * - Do NOT hardcode product workflows here; pass config + actor + optional periods.
 */

import { buildAttendanceSlots } from "./slots";
import { resolveMarkableSlots } from "./ownership";
import type {
  AttendanceActor,
  AttendanceConfigVersion,
  AttendanceWorkflow,
  PeriodInput,
} from "./types";

/** Minimum config the engine needs — always supplied by the caller (never invented). */
export type AttendanceEngineConfig = Pick<
  AttendanceConfigVersion,
  | "id"
  | "method"
  | "owner"
  | "effectiveFrom"
  | "scope"
  | "classTargets"
  | "sectionTargets"
  | "createdAt"
  | "createdBy"
>;

export type CreateAttendanceWorkflowInput = {
  /** Active or historical configuration row — engine does not choose policy. */
  config: AttendanceConfigVersion;
  /** Who is opening the mark UI. */
  actor: AttendanceActor;
  /**
   * Timetable periods for the day.
   * Required when `config.method === "period_wise"` (no placeholder slots).
   * Also used by Morning First to bind the first-period subject for CPT matching.
   */
  periods?: PeriodInput[];
};

const NO_TIMETABLE_PERIODS =
  "No timetable periods for this date. Publish a class timetable before marking Period Wise attendance.";

/**
 * Sole factory for attendance workflows.
 * All modes (Daily, Morning First, Morning + Afternoon, Period Wise)
 * and all owners (Class Teacher, Current Period Teacher, Attendance Coordinator)
 * go through this function.
 */
export function createAttendanceWorkflow(
  input: CreateAttendanceWorkflowInput,
): AttendanceWorkflow {
  const { config, actor } = input;
  const slots = buildAttendanceSlots(config.method, input.periods ?? []);

  if (config.method === "period_wise" && slots.length === 0) {
    return {
      config,
      method: config.method,
      owner: config.owner,
      slots: [],
      markableSlotIds: [],
      canMarkAny: false,
      blockedReason: NO_TIMETABLE_PERIODS,
    };
  }

  const ownership = resolveMarkableSlots(config.owner, slots, actor);

  return {
    config,
    method: config.method,
    owner: config.owner,
    slots,
    markableSlotIds: ownership.markableSlotIds,
    canMarkAny: ownership.canMarkAny,
    blockedReason: ownership.blockedReason,
  };
}
