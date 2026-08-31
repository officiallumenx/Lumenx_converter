import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type { TeacherOperationalCounts, TeacherPerformanceWindowCounts } from "./score.js";
import { computeOperationalScore, monthLabel, subtractDays, toIsoDate } from "./score.js";

type StaffAttendanceFact = {
  teacher_id: string;
  attendance_date: string;
  status: string;
};

type MarkEntryFact = {
  teacher_id: string;
  published_at: string | null;
  updated_at: string;
};

type HomeworkFact = {
  teacher_id: string;
  published_at: string | null;
  updated_at: string;
};

type DiaryDayFact = {
  teacher_id: string;
  diary_date: string;
  submitted_at: string | null;
};

type AttendanceRegisterFact = {
  marked_by_teacher_id: string | null;
  attendance_date: string;
  status: string;
};

export type TeacherPerformanceFacts = {
  staff: StaffAttendanceFact[];
  marks: MarkEntryFact[];
  homework: HomeworkFact[];
  diary: DiaryDayFact[];
  registers: AttendanceRegisterFact[];
};

export type PerformanceDateRanges = {
  ratingFrom: string;
  recentFrom: string;
  priorFrom: string;
  priorTo: string;
  asOfDate: string;
};

function emptyCounts(): TeacherOperationalCounts {
  return {
    staffPresent: 0,
    staffTotal: 0,
    publishedMarks: 0,
    publishedHomework: 0,
    submittedDiaryDays: 0,
    submittedAttendanceRegisters: 0,
  };
}

function isStaffPresent(status: string): boolean {
  return status === "present" || status === "late" || status === "half-day";
}

function eventDate(value: string | null, fallback: string): string {
  if (!value) return fallback.slice(0, 10);
  return value.slice(0, 10);
}

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

function addStaffCount(counts: TeacherOperationalCounts, status: string): void {
  counts.staffTotal += 1;
  if (isStaffPresent(status)) counts.staffPresent += 1;
}

export function buildPerformanceDateRanges(asOf: Date = new Date()): PerformanceDateRanges {
  return {
    ratingFrom: toIsoDate(subtractDays(asOf, 90)),
    recentFrom: toIsoDate(subtractDays(asOf, 30)),
    priorFrom: toIsoDate(subtractDays(asOf, 60)),
    priorTo: toIsoDate(subtractDays(asOf, 31)),
    asOfDate: toIsoDate(asOf),
  };
}

export async function fetchTeacherPerformanceFacts(
  admin: SupabaseClient,
  instituteId: string,
  fromDate: string,
  toDate: string,
): Promise<TeacherPerformanceFacts> {
  const [staffRows, markRows, homeworkRows, diaryRows, registerRows] =
    await Promise.all([
      admin
        .from("staff_attendance")
        .select("teacher_id, attendance_date, status")
        .eq("institute_id", instituteId)
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate)
        .is("deleted_at", null),
      admin
        .from("mark_entry")
        .select("teacher_id, published_at, updated_at")
        .eq("institute_id", instituteId)
        .eq("status", "published")
        .is("deleted_at", null),
      admin
        .from("homework")
        .select("teacher_id, published_at, updated_at")
        .eq("institute_id", instituteId)
        .eq("status", "published")
        .is("deleted_at", null),
      admin
        .from("diary_day")
        .select("teacher_id, diary_date, submitted_at")
        .eq("institute_id", instituteId)
        .not("submitted_at", "is", null)
        .gte("diary_date", fromDate)
        .lte("diary_date", toDate)
        .is("deleted_at", null),
      admin
        .from("attendance_register")
        .select("marked_by_teacher_id, attendance_date, status")
        .eq("institute_id", instituteId)
        .eq("status", "submitted")
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate)
        .is("deleted_at", null),
    ]);

  return {
    staff: ensureDbOk(staffRows) as StaffAttendanceFact[],
    marks: ensureDbOk(markRows) as MarkEntryFact[],
    homework: ensureDbOk(homeworkRows) as HomeworkFact[],
    diary: ensureDbOk(diaryRows) as DiaryDayFact[],
    registers: ensureDbOk(registerRows) as AttendanceRegisterFact[],
  };
}

function aggregateCountsForRange(
  facts: TeacherPerformanceFacts,
  teacherId: string,
  from: string,
  to: string,
): TeacherOperationalCounts {
  const counts = emptyCounts();

  for (const row of facts.staff) {
    if (row.teacher_id !== teacherId) continue;
    if (!inRange(row.attendance_date, from, to)) continue;
    addStaffCount(counts, row.status);
  }

  for (const row of facts.marks) {
    if (row.teacher_id !== teacherId) continue;
    const date = eventDate(row.published_at, row.updated_at);
    if (!inRange(date, from, to)) continue;
    counts.publishedMarks += 1;
  }

  for (const row of facts.homework) {
    if (row.teacher_id !== teacherId) continue;
    const date = eventDate(row.published_at, row.updated_at);
    if (!inRange(date, from, to)) continue;
    counts.publishedHomework += 1;
  }

  for (const row of facts.diary) {
    if (row.teacher_id !== teacherId) continue;
    if (!inRange(row.diary_date, from, to)) continue;
    counts.submittedDiaryDays += 1;
  }

  for (const row of facts.registers) {
    if (row.marked_by_teacher_id !== teacherId) continue;
    if (!inRange(row.attendance_date, from, to)) continue;
    counts.submittedAttendanceRegisters += 1;
  }

  return counts;
}

export function aggregateTeacherWindows(
  facts: TeacherPerformanceFacts,
  teacherIds: string[],
  ranges: PerformanceDateRanges,
): Map<string, TeacherPerformanceWindowCounts> {
  const byTeacher = new Map<string, TeacherPerformanceWindowCounts>();

  for (const teacherId of teacherIds) {
    byTeacher.set(teacherId, {
      ratingWindow: aggregateCountsForRange(
        facts,
        teacherId,
        ranges.ratingFrom,
        ranges.asOfDate,
      ),
      recentWindow: aggregateCountsForRange(
        facts,
        teacherId,
        ranges.recentFrom,
        ranges.asOfDate,
      ),
      priorWindow: aggregateCountsForRange(
        facts,
        teacherId,
        ranges.priorFrom,
        ranges.priorTo,
      ),
    });
  }

  return byTeacher;
}

export function aggregateMonthlyInstituteAverages(
  facts: TeacherPerformanceFacts,
  teacherIds: string[],
  months: number,
  asOf: Date = new Date(),
): { label: string; value: number }[] {
  if (teacherIds.length === 0 || months <= 0) return [];

  const points: { label: string; value: number }[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const monthStart = new Date(
      Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - offset, 1),
    );
    const monthEnd = new Date(
      Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - offset + 1, 0),
    );
    const from = toIsoDate(monthStart);
    const to = toIsoDate(monthEnd);

    const ratings: number[] = [];
    for (const teacherId of teacherIds) {
      const counts = aggregateCountsForRange(facts, teacherId, from, to);
      const rating = computeOperationalScore(counts);
      if (rating != null) ratings.push(rating);
    }

    if (ratings.length === 0) continue;
    points.push({
      label: monthLabel(monthStart),
      value:
        Math.round(
          (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 100,
        ) / 100,
    });
  }

  return points;
}

export function aggregateInstituteAverage(
  ratings: Array<number | null>,
): number | null {
  const valid = ratings.filter((value): value is number => value != null);
  if (valid.length === 0) return null;
  return (
    Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * 100) /
    100
  );
}
