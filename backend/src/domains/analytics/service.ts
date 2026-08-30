import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listStudentsForActor } from "../students/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import { listTeachersForActor } from "../teachers/service.js";
import { listParentsForActor } from "../parents/service.js";
import { listComplaintsForActor } from "../complaints/service.js";
import { listLeaveRequestsForActor } from "../leave/service.js";
import { listHomeworkForActor } from "../homework/service.js";
import {
  listClassesForActor,
  listEnrollmentsForActor,
  listSubjectsForActor,
} from "../academics/service.js";
import { listRegistersForActor } from "../attendance/service.js";
import { listMarkEntriesForActor } from "../marks/service.js";
import { listScoresForEntryIds } from "../marks/repository.js";
import {
  aggregateAttendanceByClass,
  aggregateAttendanceMonthly,
  aggregateEnrollmentMonthly,
  aggregateFeePaymentsMonthly,
  aggregateStudentStatus,
  aggregateSubjectAverages,
  firstDayOfMonth,
  lastDayOfMonth,
  monthsForRange,
  ymdInInclusiveRange,
  type AnalyticsRange,
  type AttendanceFact,
} from "./aggregate.js";
import {
  listFeePaymentsForInstitute,
  listMarksForRegisterIds,
} from "./repository.js";
import type { AnalyticsSeriesDto, AnalyticsSummaryDto } from "./types.js";

function assertAnalyticsReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

async function safeCount(fn: () => Promise<unknown[]>): Promise<number> {
  try {
    const rows = await fn();
    return rows.length;
  } catch {
    return 0;
  }
}

async function safeList<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

/**
 * Aggregate institute counts from existing domain list functions.
 * Individual list failures degrade to zero so the summary shape stays stable.
 */
export async function getAnalyticsSummaryForActor(
  admin: SupabaseClient,
  actor: Actor,
  opts: { instituteId: string },
): Promise<AnalyticsSummaryDto> {
  const instituteId = requireInstituteId(actor, opts.instituteId);
  assertAnalyticsReader(actor, instituteId);

  const [students, teachers, parents, complaints, leave, homework] =
    await Promise.all([
      safeCount(() => listStudentsForActor(admin, actor, { instituteId })),
      safeCount(() => listTeachersForActor(admin, actor, { instituteId })),
      safeCount(() => listParentsForActor(admin, actor, { instituteId })),
      (async () => {
        try {
          const rows = await listComplaintsForActor(admin, actor, {
            instituteId,
          });
          return rows.filter(
            (c) =>
              c.status === "pending" ||
              c.status === "review" ||
              c.status === "forwarded",
          ).length;
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const rows = await listLeaveRequestsForActor(admin, actor, {
            instituteId,
          });
          return rows.filter((r) => r.status === "pending").length;
        } catch {
          return 0;
        }
      })(),
      safeCount(() => listHomeworkForActor(admin, actor, { instituteId })),
    ]);

  return {
    instituteId,
    students,
    teachers,
    parents,
    openComplaints: complaints,
    pendingLeave: leave,
    homeworkItems: homework,
  };
}

/**
 * Chart series from existing fact tables — no invented history / GPA / MAU / SLA.
 */
export async function getAnalyticsSeriesForActor(
  admin: SupabaseClient,
  actor: Actor,
  opts: { instituteId: string; range: AnalyticsRange; asOf?: Date },
): Promise<AnalyticsSeriesDto> {
  const instituteId = requireInstituteId(actor, opts.instituteId);
  assertAnalyticsReader(actor, instituteId);

  const asOf = opts.asOf ?? new Date();
  const months = monthsForRange(opts.range, asOf);
  const fromMonth = months[0]?.month ?? "";
  const toMonth = months[months.length - 1]?.month ?? "";
  const dateFrom = fromMonth ? firstDayOfMonth(fromMonth) : "1970-01-01";

  const [students, enrollments, classes, subjects, registers, publishedEntries] =
    await Promise.all([
      safeList(() => listStudentsForActor(admin, actor, { instituteId })),
      safeList(() => listEnrollmentsForActor(admin, actor, { instituteId })),
      safeList(() => listClassesForActor(admin, actor, { instituteId })),
      safeList(() => listSubjectsForActor(admin, actor, { instituteId })),
      safeList(() =>
        listRegistersForActor(admin, actor, {
          instituteId,
          status: "submitted",
        }),
      ),
      safeList(() =>
        listMarkEntriesForActor(admin, actor, {
          instituteId,
          status: "published",
        }),
      ),
    ]);

  const dateTo = toMonth ? lastDayOfMonth(toMonth) : "9999-12-31";
  const registersInRange = registers.filter(
    (r) =>
      r.instituteId === instituteId &&
      ymdInInclusiveRange(r.attendanceDate, dateFrom, dateTo),
  );
  const marks = await listMarksForRegisterIds(
    admin,
    registersInRange.map((r) => r.id),
    instituteId,
  );
  const registerById = new Map(registersInRange.map((r) => [r.id, r]));
  const attendanceFacts: AttendanceFact[] = [];
  for (const mark of marks) {
    if (mark.institute_id !== instituteId) continue;
    const reg = registerById.get(mark.register_id);
    if (!reg || reg.instituteId !== instituteId) continue;
    attendanceFacts.push({
      attendanceDate: reg.attendanceDate,
      classId: reg.classId,
      status: mark.status,
    });
  }

  const paymentsRaw = await listFeePaymentsForInstitute(admin, instituteId);
  const payments = paymentsRaw
    .filter(
      (p) =>
        p.institute_id === instituteId &&
        ymdInInclusiveRange(p.paid_on, dateFrom, dateTo),
    )
    .map((p) => ({
      paidOn: p.paid_on,
      amount: Number(p.amount) || 0,
    }));

  const publishedInRange = publishedEntries.filter((e) => {
    if (e.instituteId !== instituteId) return false;
    const published = e.publishedAt ?? e.updatedAt;
    return published
      ? ymdInInclusiveRange(published, dateFrom, dateTo)
      : false;
  });

  const scores =
    publishedInRange.length === 0
      ? []
      : await listScoresForEntryIds(
          admin,
          publishedInRange.map((e) => e.id),
        );

  const classNames = new Map(classes.map((c) => [c.id, c.name]));
  const subjectNames = new Map(subjects.map((s) => [s.id, s.name]));

  return {
    instituteId,
    range: opts.range,
    fromMonth,
    toMonth,
    studentStatus: aggregateStudentStatus(students),
    enrollmentMonthly: aggregateEnrollmentMonthly(months, {
      enrollments: enrollments
        .filter((e) => e.instituteId === instituteId)
        .map((e) => ({ enrolledOn: e.enrolledOn })),
      students: students
        .filter((s) => s.instituteId === instituteId)
        .map((s) => ({ createdAt: s.createdAt })),
    }),
    attendanceMonthly: aggregateAttendanceMonthly(months, attendanceFacts),
    attendanceByClass: aggregateAttendanceByClass(attendanceFacts, classNames),
    feePaymentsMonthly: aggregateFeePaymentsMonthly(months, payments),
    subjectAverages: aggregateSubjectAverages(
      publishedInRange.map((e) => ({
        id: e.id,
        subjectId: e.subjectId,
        maxMarks: e.maxMarks,
      })),
      scores.map((s) => ({
        markEntryId: s.mark_entry_id,
        marks: s.marks == null ? null : Number(s.marks),
      })),
      subjectNames,
    ),
  };
}
