import type {
  AttendanceActor,
  AttendanceOwner,
  AttendanceSlot,
} from "./types";

export type OwnershipDecision = {
  markableSlotIds: string[];
  canMarkAny: boolean;
  blockedReason?: string;
};

/**
 * Who may mark which slots — driven only by Attendance Owner from configuration.
 * Method only decides which slots exist (`buildAttendanceSlots`).
 * Apps must pass factual actor flags (no persona spoofing).
 */
export function resolveMarkableSlots(
  owner: AttendanceOwner,
  slots: AttendanceSlot[],
  actor: AttendanceActor,
): OwnershipDecision {
  if (owner === "attendance_incharge") {
    if (!actor.isAttendanceIncharge) {
      return {
        markableSlotIds: [],
        canMarkAny: false,
        blockedReason:
          "Only the Attendance Coordinator can mark attendance under the current configuration.",
      };
    }
    return {
      markableSlotIds: slots.map((s) => s.id),
      canMarkAny: true,
    };
  }

  if (owner === "class_teacher") {
    if (!actor.isClassTeacherForSection) {
      return {
        markableSlotIds: [],
        canMarkAny: false,
        blockedReason:
          "Only the Class Teacher can mark attendance for this section under the current configuration.",
      };
    }
    return {
      markableSlotIds: slots.map((s) => s.id),
      canMarkAny: true,
    };
  }

  // current_period_teacher — subject teacher of each slot (or any assigned teacher when slot has no subject)
  if (!actor.teachesSection && !actor.isClassTeacherForSection) {
    return {
      markableSlotIds: [],
      canMarkAny: false,
      blockedReason:
        "You are not assigned to teach this section, so you cannot mark attendance.",
    };
  }

  const subjectSet = new Set(
    actor.subjects.map((s) => s.trim().toLowerCase()).filter(Boolean),
  );

  const markable = slots.filter((slot) => {
    const subject = (slot.subject ?? "").trim().toLowerCase();
    // Period Wise + Morning First (first-period subject bound): match actor subjects.
    if (subject) {
      return subjectSet.has(subject);
    }
    // Daily / Morning+Afternoon (no subject on slot): any assigned teacher of the section.
    return actor.teachesSection || actor.isClassTeacherForSection;
  });

  if (markable.length === 0) {
    return {
      markableSlotIds: [],
      canMarkAny: false,
      blockedReason:
        "No periods match your subjects for this section today.",
    };
  }

  return {
    markableSlotIds: markable.map((s) => s.id),
    canMarkAny: true,
  };
}

export function actorCanMarkSlot(
  owner: AttendanceOwner,
  slots: AttendanceSlot[],
  actor: AttendanceActor,
  slotId: string,
): boolean {
  return resolveMarkableSlots(owner, slots, actor).markableSlotIds.includes(
    slotId,
  );
}
