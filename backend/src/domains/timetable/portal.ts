import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  actorHasInstituteRole,
  requireInstituteId,
  requireTeacherIdentity,
} from "../../authorization/index.js";
import { findStudentById } from "../students/repository.js";
import { resolveAccessibleStudentIds } from "../homework/service.js";
import { listActiveEnrollmentsForStudents } from "../homework/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findActiveAssignmentById,
  listTimetableSlots,
} from "./repository.js";
import type { PortalTimetableDto, PortalTimetablePeriodDto } from "./types.js";

const FULL_DAY_NAMES = [
  "",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function formatSlotTime(startsAt: string, endsAt: string): string {
  const start = startsAt.length >= 5 ? startsAt.slice(0, 5) : startsAt;
  const end = endsAt.length >= 5 ? endsAt.slice(0, 5) : endsAt;
  return `${start} – ${end}`;
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

async function slotsToPortalPeriods(
  admin: SupabaseClient,
  slots: Awaited<ReturnType<typeof listTimetableSlots>>,
): Promise<PortalTimetablePeriodDto[]> {
  const periods: PortalTimetablePeriodDto[] = [];
  for (const slot of slots.filter((s) => s.status === "active")) {
    const assignment = await findActiveAssignmentById(
      admin,
      slot.teacher_assignment_id,
    );
    const subject = assignment
      ? await loadSubjectLabel(admin, assignment.subject_id)
      : "Subject";
    let teacher = "Teacher";
    if (assignment?.teacher_id) {
      const teacherRow = await findTeacherById(admin, assignment.teacher_id);
      teacher = teacherRow?.display_name?.trim() || teacher;
    }
    periods.push({
      id: slot.id,
      dayOfWeek: slot.day_of_week,
      dayLabel: FULL_DAY_NAMES[slot.day_of_week] ?? `Day ${slot.day_of_week}`,
      periodIndex: slot.period_index,
      time: formatSlotTime(slot.starts_at, slot.ends_at),
      subject,
      teacher,
      room: slot.room,
    });
  }
  return periods.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.periodIndex - b.periodIndex;
  });
}

function weekdaysFromPeriods(periods: PortalTimetablePeriodDto[]): string[] {
  const seen = new Set<number>();
  const days: string[] = [];
  for (const period of periods) {
    if (!seen.has(period.dayOfWeek)) {
      seen.add(period.dayOfWeek);
      days.push(period.dayLabel);
    }
  }
  return days;
}

export async function getLearnerTimetableForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string },
): Promise<PortalTimetableDto> {
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

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [input.studentId],
  });
  const enrollment = enrollments[0];
  if (!enrollment) {
    return {
      instituteId,
      studentId: input.studentId,
      sectionId: null,
      periods: [],
      weekdays: [],
    };
  }

  const slots = await listTimetableSlots(admin, {
    instituteId,
    sectionId: enrollment.section_id,
    academicYearId: enrollment.academic_year_id,
  });
  const periods = await slotsToPortalPeriods(admin, slots);

  return {
    instituteId,
    studentId: input.studentId,
    sectionId: enrollment.section_id,
    periods,
    weekdays: weekdaysFromPeriods(periods),
  };
}

export async function getTeacherTimetableForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; teacherId?: string; sectionId?: string },
): Promise<PortalTimetableDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  let teacherId = input.teacherId ?? null;
  if (!teacherId) {
    if (!actorHasInstituteRole(actor, instituteId, "teacher")) {
      throw AppError.forbidden("Teacher identity required");
    }
    teacherId = requireTeacherIdentity(actor, instituteId).teacherId;
  }

  const teacher = await findTeacherById(admin, teacherId);
  if (!teacher || teacher.institute_id !== instituteId) {
    throw AppError.notFound("Teacher not found");
  }

  const slots = await listTimetableSlots(
    admin,
    {
      instituteId,
      sectionId: input.sectionId,
    },
    undefined,
  );

  const filtered = [];
  for (const slot of slots) {
    const assignment = await findActiveAssignmentById(
      admin,
      slot.teacher_assignment_id,
    );
    if (assignment?.teacher_id === teacherId) {
      filtered.push(slot);
    }
  }

  const periods = await slotsToPortalPeriods(admin, filtered);
  return {
    instituteId,
    studentId: null,
    sectionId: input.sectionId ?? null,
    periods,
    weekdays: weekdaysFromPeriods(periods),
  };
}
