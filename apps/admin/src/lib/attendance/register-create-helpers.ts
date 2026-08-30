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

export function slotFieldsFromMethod(method: AttendanceMethod): {
  slotKind: AttendanceSlotKind;
  slotCode: string;
  slotLabel: string;
  periodIndex: number | null;
} {
  switch (method) {
    case "morning_first_period":
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
        slotCode: "slot:period:1",
        slotLabel: "Period 1",
        periodIndex: 1,
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
