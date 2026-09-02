import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
} from "../../authorization/index.js";
import { findStudentById } from "../students/repository.js";
import { resolveAccessibleStudentIds } from "../homework/service.js";
import { listActiveEnrollmentsForStudents } from "../homework/repository.js";
import {
  findActiveAssignmentById,
  listTimetableSlots,
} from "../timetable/repository.js";
import {
  findSectionById,
  listConfigVersions,
  listMarksForRegister,
  listRegisters,
} from "./repository.js";
import {
  assertCanWriteAttendance,
} from "./service.js";
import type {
  AttendanceConfigVersionRow,
  AttendanceMethod,
  AttendanceRegisterRow,
  AttendanceSlotKind,
  PortalLearnerAttendanceDto,
  PortalTeacherAttendanceDto,
  PortalTeacherAttendanceSlotDto,
} from "./types.js";

const DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type ExpectedSlot = {
  slotCode: string;
  slotKind: AttendanceSlotKind;
  slotLabel: string;
  periodIndex: number | null;
  timetableSlotId: string | null;
  subjectLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

function weekdayFromIso(date: string): number {
  const day = new Date(`${date.slice(0, 10)}T12:00:00`).getUTCDay();
  return day === 0 ? 7 : day;
}

function pickConfigForSection(
  configs: AttendanceConfigVersionRow[],
  attendanceDate: string,
  classCode: string,
  sectionCode: string,
): AttendanceConfigVersionRow | null {
  return (
    configs
      .filter((c) => c.effective_from <= attendanceDate)
      .filter((c) => {
        if (c.scope === "institute") return true;
        if (c.scope === "class") {
          return (
            (c.class_codes ?? []).length === 0 ||
            (c.class_codes ?? []).includes(classCode)
          );
        }
        if (c.scope === "section") {
          return (
            (c.section_codes ?? []).length === 0 ||
            (c.section_codes ?? []).includes(sectionCode)
          );
        }
        return false;
      })
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0] ?? null
  );
}

async function loadClassSectionCodes(
  admin: SupabaseClient,
  sectionId: string,
  classId: string,
): Promise<{ classCode: string; sectionCode: string }> {
  const sectionRes = await admin
    .from("section")
    .select("code, name")
    .eq("id", sectionId)
    .maybeSingle();
  const sectionRow = sectionRes.data as { code: string | null; name: string | null } | null;
  const sectionCode =
    sectionRow?.code?.trim() || sectionRow?.name?.trim() || sectionId.slice(0, 8);

  const classRes = await admin
    .from("class")
    .select("code, name, grade_label")
    .eq("id", classId)
    .maybeSingle();
  const classRow = classRes.data as {
    code: string | null;
    name: string | null;
    grade_label: string | null;
  } | null;
  const classCode =
    classRow?.code?.trim() ||
    classRow?.grade_label?.trim() ||
    classRow?.name?.trim() ||
    classId.slice(0, 8);

  return { classCode, sectionCode };
}

async function loadSubjectLabel(
  admin: SupabaseClient,
  subjectId: string,
): Promise<string> {
  const res = await admin
    .from("subject")
    .select("name, code")
    .eq("id", subjectId)
    .maybeSingle();
  const row = res.data as { name: string | null; code: string | null } | null;
  return row?.name?.trim() || row?.code?.trim() || "Subject";
}

async function buildExpectedSlots(
  admin: SupabaseClient,
  input: {
    method: AttendanceMethod;
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    attendanceDate: string;
  },
): Promise<ExpectedSlot[]> {
  switch (input.method) {
    case "daily":
      return [
        {
          slotCode: "slot:day",
          slotKind: "day",
          slotLabel: "Full day",
          periodIndex: null,
          timetableSlotId: null,
          subjectLabel: null,
          startsAt: null,
          endsAt: null,
        },
      ];
    case "morning_afternoon":
      return [
        {
          slotCode: "slot:morning",
          slotKind: "morning",
          slotLabel: "Morning",
          periodIndex: null,
          timetableSlotId: null,
          subjectLabel: null,
          startsAt: null,
          endsAt: null,
        },
        {
          slotCode: "slot:afternoon",
          slotKind: "afternoon",
          slotLabel: "Afternoon",
          periodIndex: null,
          timetableSlotId: null,
          subjectLabel: null,
          startsAt: null,
          endsAt: null,
        },
      ];
    case "morning_first_period": {
      const periods = await periodSlotsFromTimetable(admin, input);
      const first = periods[0];
      if (first) {
        return [
          {
            slotCode: "slot:morning-first",
            slotKind: "morning",
            slotLabel: `Morning · First Period · ${first.subjectLabel ?? "Period"}`,
            periodIndex: first.periodIndex,
            timetableSlotId: first.timetableSlotId,
            subjectLabel: first.subjectLabel,
            startsAt: first.startsAt,
            endsAt: first.endsAt,
          },
        ];
      }
      return [
        {
          slotCode: "slot:morning-first",
          slotKind: "morning",
          slotLabel: "Morning · First Period",
          periodIndex: null,
          timetableSlotId: null,
          subjectLabel: null,
          startsAt: null,
          endsAt: null,
        },
      ];
    }
    case "period_wise":
      return periodSlotsFromTimetable(admin, input);
    default:
      return [];
  }
}

async function periodSlotsFromTimetable(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    academicYearId: string;
    classId: string;
    sectionId: string;
    attendanceDate: string;
  },
): Promise<ExpectedSlot[]> {
  const dayOfWeek = weekdayFromIso(input.attendanceDate);
  const slots = await listTimetableSlots(admin, {
    instituteId: input.instituteId,
    academicYearId: input.academicYearId,
    sectionId: input.sectionId,
  });

  const active = slots
    .filter((slot) => slot.status === "active" && slot.day_of_week === dayOfWeek)
    .sort((a, b) => a.period_index - b.period_index);

  const result: ExpectedSlot[] = [];
  let denseIndex = 0;
  for (const slot of active) {
    const assignment = await findActiveAssignmentById(
      admin,
      slot.teacher_assignment_id,
    );
    const subject = assignment
      ? await loadSubjectLabel(admin, assignment.subject_id)
      : "Period";
    const startsAt =
      slot.starts_at.length >= 5 ? slot.starts_at.slice(0, 5) : slot.starts_at;
    const endsAt =
      slot.ends_at.length >= 5 ? slot.ends_at.slice(0, 5) : slot.ends_at;
    result.push({
      slotCode: `slot:period:${denseIndex}`,
      slotKind: "period",
      slotLabel: `P${denseIndex + 1} · ${subject}`,
      periodIndex: denseIndex,
      timetableSlotId: slot.id,
      subjectLabel: subject,
      startsAt,
      endsAt,
    });
    denseIndex += 1;
  }
  return result;
}

function matchRegisterToSlot(
  register: AttendanceRegisterRow,
  slot: ExpectedSlot,
): boolean {
  if (register.timetable_slot_id && slot.timetableSlotId) {
    return register.timetable_slot_id === slot.timetableSlotId;
  }
  return register.slot_code === slot.slotCode;
}

function slotsWithRegisters(
  expected: ExpectedSlot[],
  registers: AttendanceRegisterRow[],
): PortalTeacherAttendanceSlotDto[] {
  return expected.map((slot) => {
    const register =
      registers.find((row) => matchRegisterToSlot(row, slot)) ?? null;
    return {
      slotCode: slot.slotCode,
      slotKind: slot.slotKind,
      slotLabel: slot.slotLabel,
      periodIndex: slot.periodIndex,
      timetableSlotId: slot.timetableSlotId,
      subjectLabel: slot.subjectLabel,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      registerId: register?.id ?? null,
      registerStatus: register?.status ?? null,
    };
  });
}

function aggregateDayStatus(
  statuses: Array<"present" | "absent" | "leave">,
): "present" | "absent" | "leave" | "unknown" {
  if (statuses.length === 0) return "unknown";
  if (statuses.some((s) => s === "leave")) return "leave";
  if (statuses.some((s) => s === "absent")) return "absent";
  return "present";
}

function computeAttendancePct(
  present: number,
  expected: number,
  leave: number,
): number {
  if (expected <= 0) return 0;
  return Math.round(((present + leave) / expected) * 100);
}

function eachDateInclusive(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate.slice(0, 10)}T12:00:00`);
  const end = new Date(`${toDate.slice(0, 10)}T12:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export async function getTeacherAttendancePortalForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    sectionId: string;
    attendanceDate: string;
  },
): Promise<PortalTeacherAttendanceDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const section = await findSectionById(admin, input.sectionId);
  if (!section || section.institute_id !== instituteId) {
    throw AppError.notFound("Section not found");
  }

  await assertCanWriteAttendance(admin, actor, {
    instituteId,
    sectionId: section.id,
    academicYearId: section.academic_year_id,
    classId: section.class_id,
  });

  const { classCode, sectionCode } = await loadClassSectionCodes(
    admin,
    section.id,
    section.class_id,
  );
  const configRows = await listConfigVersions(admin, instituteId);
  const config = pickConfigForSection(
    configRows,
    input.attendanceDate,
    classCode,
    sectionCode,
  );

  const registers = await listRegisters(admin, {
    instituteId,
    sectionId: section.id,
    attendanceDate: input.attendanceDate,
  });

  const expected = config
    ? await buildExpectedSlots(admin, {
        method: config.method,
        instituteId,
        academicYearId: section.academic_year_id,
        classId: section.class_id,
        sectionId: section.id,
        attendanceDate: input.attendanceDate,
      })
    : [];

  const slots =
    expected.length > 0
      ? slotsWithRegisters(expected, registers)
      : registers.map((register) => ({
          slotCode: register.slot_code,
          slotKind: register.slot_kind,
          slotLabel: register.slot_label,
          periodIndex: register.period_index,
          timetableSlotId: register.timetable_slot_id,
          subjectLabel: register.subject_label,
          startsAt: register.starts_at,
          endsAt: register.ends_at,
          registerId: register.id,
          registerStatus: register.status,
        }));

  return {
    instituteId,
    sectionId: section.id,
    classId: section.class_id,
    academicYearId: section.academic_year_id,
    attendanceDate: input.attendanceDate,
    method: config?.method ?? null,
    configVersionId: config?.id ?? null,
    slots,
  };
}

export async function getLearnerAttendancePortalForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: {
    instituteId: string;
    studentId: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<PortalLearnerAttendanceDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (!accessible.has(input.studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date();
  defaultFrom.setMonth(defaultFrom.getMonth() - 11);
  defaultFrom.setDate(1);
  const fromDate = input.fromDate ?? defaultFrom.toISOString().slice(0, 10);
  const toDate = input.toDate ?? today;

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [input.studentId],
  });
  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];

  const statusByDate = new Map<string, Array<"present" | "absent" | "leave">>();
  for (const sectionId of sectionIds) {
    const registers = await listRegisters(admin, {
      instituteId,
      sectionId,
      status: "submitted",
    });
    for (const register of registers) {
      if (
        register.attendance_date < fromDate ||
        register.attendance_date > toDate
      ) {
        continue;
      }
      const marks = await listMarksForRegister(admin, register.id);
      const studentMark = marks.find((m) => m.student_id === input.studentId);
      if (!studentMark) continue;
      const bucket = statusByDate.get(register.attendance_date) ?? [];
      bucket.push(studentMark.status);
      statusByDate.set(register.attendance_date, bucket);
    }
  }

  const days = eachDateInclusive(fromDate, toDate).map((date) => ({
    date,
    status: aggregateDayStatus(statusByDate.get(date) ?? []),
  }));

  const present = days.filter((d) => d.status === "present").length;
  const absent = days.filter((d) => d.status === "absent").length;
  const leave = days.filter((d) => d.status === "leave").length;
  const unknown = days.filter((d) => d.status === "unknown").length;
  const expected = present + absent + leave;

  return {
    instituteId,
    studentId: input.studentId,
    fromDate,
    toDate,
    days,
    summary: {
      present,
      absent,
      leave,
      unknown,
      attendancePct: computeAttendancePct(present, expected, leave),
    },
  };
}

export { DAY_NAMES as ATTENDANCE_DAY_NAMES };
