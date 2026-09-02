/**
 * Pick attendance config version for register create.
 * Prefer most recent effective_from on or before the attendance date,
 * matching scope to class/section codes when scoped.
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
  const eligible = configs
    .filter((c) => c.effectiveFrom <= attendanceDate)
    .filter((c) => {
      if (c.scope === "institute") return true;
      if (c.scope === "class") {
        return c.classCodes.length === 0 || c.classCodes.includes(classCode);
      }
      if (c.scope === "section") {
        return c.sectionCodes.length === 0 || c.sectionCodes.includes(sectionCode);
      }
      return false;
    })
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return eligible[0] ?? null;
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
