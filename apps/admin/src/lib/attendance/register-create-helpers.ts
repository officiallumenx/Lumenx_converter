/**
 * Pick attendance config version for register create.
 * Flowchart scope precedence: section → class → institute.
 * Prefer most recent effectiveFrom on or before the attendance date.
 */
import type {
  AttendanceConfigDto,
  AttendanceMethod,
  AttendanceSlotKind,
} from "@/lib/attendance/types";

export type AttendanceRegisterSlotFields = {
  slotKind: AttendanceSlotKind;
  slotCode: string;
  slotLabel: string;
  periodIndex: number | null;
  timetableSlotId?: string | null;
  subjectLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export function pickAttendanceConfigForRegister(opts: {
  configs: AttendanceConfigDto[];
  attendanceDate: string;
  classCode: string;
  sectionCode: string;
}): AttendanceConfigDto | null {
  const { configs, attendanceDate, classCode, sectionCode } = opts;
  const dated = configs
    .filter((c) => c.effectiveFrom <= attendanceDate)
    .sort((a, b) => {
      const byDate = b.effectiveFrom.localeCompare(a.effectiveFrom);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });

  const sectionHit = dated.find(
    (c) =>
      c.scope === "section" &&
      c.sectionCodes.some((code) => code.trim() === sectionCode.trim()),
  );
  if (sectionHit) return sectionHit;

  const classHit = dated.find(
    (c) =>
      c.scope === "class" &&
      c.classCodes.some((code) => code.trim() === classCode.trim()),
  );
  if (classHit) return classHit;

  return dated.find((c) => c.scope === "institute") ?? null;
}

export function slotFieldsFromPeriod(input: AttendanceRegisterSlotFields): AttendanceRegisterSlotFields {
  return input;
}

export function slotFieldsFromMethod(
  method: AttendanceMethod,
  period?: AttendanceRegisterSlotFields,
): AttendanceRegisterSlotFields {
  if (period) return period;
  switch (method) {
    case "morning_first_period":
      return {
        slotKind: "morning",
        slotCode: "slot:morning-first",
        slotLabel: "Morning · First Period",
        periodIndex: null,
      };
    case "morning_afternoon":
      return {
        slotKind: "morning",
        slotCode: "slot:morning",
        slotLabel: "Morning",
        periodIndex: null,
      };
    case "period_wise":
      return {
        slotKind: "period",
        slotCode: "slot:period:0",
        slotLabel: "Period 1",
        periodIndex: 0,
      };
    case "daily":
    default:
      return {
        slotKind: "day",
        slotCode: "slot:day",
        slotLabel: "Full day",
        periodIndex: null,
      };
  }
}

export function afternoonSlotFields(): AttendanceRegisterSlotFields {
  return {
    slotKind: "afternoon",
    slotCode: "slot:afternoon",
    slotLabel: "Afternoon",
    periodIndex: null,
  };
}

/** Empty-slot create UI copy — distinguishes missing timetable from fully marked. */
export function emptyAttendanceSlotCreateMessage(
  method: AttendanceMethod | null | undefined,
  markSlotCount: number,
): string {
  if (markSlotCount === 0) {
    return method === "period_wise"
      ? "No timetable periods for this date. Publish a timetable for this section first."
      : "No attendance slots available for this date.";
  }
  return "All slots are marked for this date.";
}
