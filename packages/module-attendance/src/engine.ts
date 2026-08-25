/**
 * Attendance persistence + open helpers.
 * Workflow construction always delegates to `createAttendanceWorkflow` (one engine).
 * All register writes (mark sheet, leave approval, late entry, early exit) go through
 * `saveSlotAttendance` — the only production path that calls `upsertSlotRegister`.
 */

import {
  resolveAttendanceConfigForDate,
  type NewAttendanceConfigInput,
} from "./config-store";
import { createAttendanceWorkflow } from "./attendance-engine";
import { actorCanMarkSlot } from "./ownership";
import {
  loadSlotRegister,
  listRegistersForSection,
  upsertSlotRegister,
} from "./register-store";
import {
  canonicalAttendanceClassId,
  normalizeAttendanceSectionKey,
} from "./identity";
import type {
  AttendanceActor,
  AttendanceConfigVersion,
  AttendanceMarkStatus,
  AttendanceSlotRegister,
  AttendanceWorkflow,
  OpenAttendanceWorkflowInput,
  PeriodInput,
} from "./types";

/**
 * Who initiated the register write.
 * Mark sheet is ownership-gated; integration writes skip Taken By checks
 * but still freeze method/owner/config from the opened workflow.
 */
export type AttendanceWriteKind =
  | "mark_sheet"
  | "leave_approval"
  | "late_entry"
  | "early_exit";

export type SaveSlotAttendanceInput = {
  workflow: AttendanceWorkflow;
  actor: AttendanceActor;
  sectionKey: string;
  classLabel: string;
  section: string;
  date: string;
  slotId: string;
  absentIds: string[];
  leaveIds?: string[];
  draft?: boolean;
  /** Defaults to mark_sheet (ownership enforced). */
  writeKind?: AttendanceWriteKind;
};

export type SaveSlotAttendanceResult =
  | { ok: true; register: AttendanceSlotRegister }
  | { ok: false; error: string };

const INTEGRATION_WRITE_KINDS: ReadonlySet<AttendanceWriteKind> = new Set([
  "leave_approval",
  "late_entry",
  "early_exit",
]);

function isIntegrationWrite(kind: AttendanceWriteKind | undefined): boolean {
  return kind != null && INTEGRATION_WRITE_KINDS.has(kind);
}

/**
 * Resolve live configuration for the date, then open via the one engine.
 * Apps must not branch on method/owner themselves.
 */
export function openAttendanceWorkflow(
  input: OpenAttendanceWorkflowInput,
  actor: AttendanceActor,
): AttendanceWorkflow | null {
  const sectionKey = normalizeAttendanceSectionKey(input.sectionKey);
  const classLabel = canonicalAttendanceClassId(input.classLabel);
  const config = resolveAttendanceConfigForDate(input.date, {
    classLabel,
    sectionKey,
  });
  if (!config) return null;

  return createAttendanceWorkflow({
    config,
    actor,
    periods: input.periods,
  });
}

/** Open with an explicit config row (tests, history replay). Still one engine. */
export function openAttendanceWorkflowFromConfig(
  config: AttendanceConfigVersion,
  input: Omit<OpenAttendanceWorkflowInput, "date"> & { date?: string },
  actor: AttendanceActor,
): AttendanceWorkflow {
  return createAttendanceWorkflow({
    config,
    actor,
    periods: input.periods,
  });
}

/**
 * Sole production write into Attendance Registers.
 * Mark sheet, leave approval, late entry, and early exit must all call this.
 */
export function saveSlotAttendance(
  input: SaveSlotAttendanceInput,
): SaveSlotAttendanceResult {
  const { workflow, actor, slotId } = input;
  const writeKind = input.writeKind ?? "mark_sheet";

  if (
    !isIntegrationWrite(writeKind) &&
    !actorCanMarkSlot(workflow.owner, workflow.slots, actor, slotId)
  ) {
    return {
      ok: false,
      error:
        workflow.blockedReason ??
        "You are not allowed to mark this attendance slot.",
    };
  }

  const slot = workflow.slots.find((s) => s.id === slotId);
  if (!slot) {
    return { ok: false, error: "Unknown attendance slot for current method." };
  }

  const status: AttendanceMarkStatus = input.draft ? "draft" : "submitted";
  const now = new Date().toISOString();
  const leaveIds = [...new Set(input.leaveIds ?? [])];
  const absentIds = input.absentIds.filter((id) => !leaveIds.includes(id));

  const sectionKey = normalizeAttendanceSectionKey(input.sectionKey);
  const classLabel = canonicalAttendanceClassId(input.classLabel);
  const section = (input.section ?? "").trim().toUpperCase();

  const existing = loadSlotRegister(sectionKey, input.date, slotId);
  const preserveMarker = isIntegrationWrite(writeKind) && existing;

  const register: AttendanceSlotRegister = {
    id: existing?.id ?? `att-reg-${Date.now()}`,
    configVersionId: workflow.config.id,
    method: workflow.method,
    owner: workflow.owner,
    sectionKey,
    classLabel,
    section,
    date: input.date,
    slotId: slot.id,
    slotLabel: slot.label,
    slotKind: slot.kind,
    absentIds,
    leaveIds,
    status,
    markedById: preserveMarker ? existing.markedById : actor.teacherId,
    markedByName: preserveMarker ? existing.markedByName : actor.teacherName,
    updatedAt: now,
    submittedAt:
      status === "submitted"
        ? (existing?.submittedAt ?? now)
        : existing?.submittedAt,
  };

  upsertSlotRegister(register);
  return { ok: true, register };
}

export function getSlotAttendance(
  sectionKey: string,
  date: string,
  slotId: string,
): AttendanceSlotRegister | null {
  return loadSlotRegister(sectionKey, date, slotId);
}

export function getSectionAttendanceHistory(
  sectionKey: string,
): AttendanceSlotRegister[] {
  return listRegistersForSection(sectionKey);
}

/** Pending slots for a section/date under the opened workflow. */
export function listPendingSlots(
  workflow: AttendanceWorkflow,
  sectionKey: string,
  date: string,
): string[] {
  return workflow.slots
    .filter((slot) => {
      const reg = loadSlotRegister(sectionKey, date, slot.id);
      return !reg || reg.status !== "submitted";
    })
    .map((s) => s.id);
}

export type ApplyStudentAttendanceAdjustmentInput = {
  sectionKey: string;
  classLabel: string;
  section: string;
  date: string;
  /** Canonical attendance student id (`stu:…`). */
  studentId: string;
  periods?: PeriodInput[];
  /** Actor recorded when creating a new register (defaults by writeKind). */
  actor?: AttendanceActor;
};

export type ApplyStudentAttendanceAdjustmentResult = {
  ok: boolean;
  error?: string;
  registers: AttendanceSlotRegister[];
};

function defaultActorForWriteKind(kind: AttendanceWriteKind): AttendanceActor {
  if (kind === "leave_approval") {
    return {
      teacherId: "system-leave",
      teacherName: "Leave approval",
      subjects: [],
      isClassTeacherForSection: false,
      isAttendanceIncharge: false,
      teachesSection: false,
    };
  }
  if (kind === "late_entry") {
    return {
      teacherId: "system-late-entry",
      teacherName: "Late entry",
      subjects: [],
      isClassTeacherForSection: false,
      isAttendanceIncharge: false,
      teachesSection: false,
    };
  }
  return {
    teacherId: "system-early-exit",
    teacherName: "Early exit",
    subjects: [],
    isClassTeacherForSection: false,
    isAttendanceIncharge: false,
    teachesSection: false,
  };
}

function mergeIdsForWriteKind(
  kind: AttendanceWriteKind,
  studentId: string,
  existing: AttendanceSlotRegister | null,
): { absentIds: string[]; leaveIds: string[] } {
  const absent = [...(existing?.absentIds ?? [])];
  const leave = [...(existing?.leaveIds ?? [])];

  if (kind === "leave_approval" || kind === "early_exit") {
    const leaveIds = [...new Set([...leave, studentId])];
    const absentIds = absent.filter((id) => id !== studentId);
    return { absentIds, leaveIds };
  }

  // late_entry — student is present (mark sheet has no separate late field)
  return {
    absentIds: absent.filter((id) => id !== studentId),
    leaveIds: leave.filter((id) => id !== studentId),
  };
}

/**
 * Shared integration write: open workflow → adjust student on every slot →
 * `saveSlotAttendance` only (no direct register upsert).
 */
function applyStudentAttendanceAdjustment(
  writeKind: Exclude<AttendanceWriteKind, "mark_sheet">,
  input: ApplyStudentAttendanceAdjustmentInput,
): ApplyStudentAttendanceAdjustmentResult {
  const actor = input.actor ?? defaultActorForWriteKind(writeKind);
  const workflow = openAttendanceWorkflow(
    {
      date: input.date,
      classLabel: input.classLabel,
      section: input.section,
      sectionKey: input.sectionKey,
      periods: input.periods,
    },
    actor,
  );

  if (!workflow) {
    return {
      ok: false,
      error: "No attendance configuration for this date.",
      registers: [],
    };
  }
  if (workflow.slots.length === 0) {
    return {
      ok: false,
      error: workflow.blockedReason ?? "No attendance slots for this date.",
      registers: [],
    };
  }

  const sectionKey = normalizeAttendanceSectionKey(input.sectionKey);
  const registers: AttendanceSlotRegister[] = [];

  for (const slot of workflow.slots) {
    const existing = loadSlotRegister(sectionKey, input.date, slot.id);
    const { absentIds, leaveIds } = mergeIdsForWriteKind(
      writeKind,
      input.studentId,
      existing,
    );
    const result = saveSlotAttendance({
      workflow,
      actor,
      sectionKey,
      classLabel: input.classLabel,
      section: input.section,
      date: input.date,
      slotId: slot.id,
      absentIds,
      leaveIds,
      draft: false,
      writeKind,
    });
    if (!result.ok) {
      return { ok: false, error: result.error, registers };
    }
    registers.push(result.register);
  }

  return { ok: true, registers };
}

/** Approved leave → Registers via `saveSlotAttendance` (leave_approval). */
export function applyLeaveApprovalToRegisters(
  input: ApplyStudentAttendanceAdjustmentInput,
): ApplyStudentAttendanceAdjustmentResult {
  return applyStudentAttendanceAdjustment("leave_approval", input);
}

/**
 * Late entry → Registers via `saveSlotAttendance` (late_entry).
 * Mark sheet has no late field; effect is present (clears absent/leave for the student).
 */
export function applyLateEntryToRegisters(
  input: ApplyStudentAttendanceAdjustmentInput,
): ApplyStudentAttendanceAdjustmentResult {
  return applyStudentAttendanceAdjustment("late_entry", input);
}

/**
 * Early exit → Registers via `saveSlotAttendance` (early_exit).
 * Mark sheet has no early-exit field; effect is leave for the student on each slot.
 */
export function applyEarlyExitToRegisters(
  input: ApplyStudentAttendanceAdjustmentInput,
): ApplyStudentAttendanceAdjustmentResult {
  return applyStudentAttendanceAdjustment("early_exit", input);
}

export type { NewAttendanceConfigInput };
