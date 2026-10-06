import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPagedRows } from "../../db/fetch-all-pages.js";
import type { TeacherOperationalCounts, TeacherPerformanceWindowCounts } from "./score.js";
import {
  PERFORMANCE_TZ,
  computeOperationalScore,
  monthLabel,
  subtractDays,
  toIsoDate,
} from "./score.js";

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

type IndexedFacts = {
  staff: Map<string, StaffAttendanceFact[]>;
  marks: Map<string, MarkEntryFact[]>;
  homework: Map<string, HomeworkFact[]>;
  diary: Map<string, DiaryDayFact[]>;
  registers: Map<string, AttendanceRegisterFact[]>;
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

function groupByTeacherId<T extends { teacher_id: string }>(
  rows: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.teacher_id);
    if (list) list.push(row);
    else map.set(row.teacher_id, [row]);
  }
  return map;
}

function indexFacts(facts: TeacherPerformanceFacts): IndexedFacts {
  const registers = new Map<string, AttendanceRegisterFact[]>();
  for (const row of facts.registers) {
    const teacherId = row.marked_by_teacher_id;
    if (!teacherId) continue;
    const list = registers.get(teacherId);
    if (list) list.push(row);
    else registers.set(teacherId, [row]);
  }
  return {
    staff: groupByTeacherId(facts.staff),
    marks: groupByTeacherId(facts.marks),
    homework: groupByTeacherId(facts.homework),
    diary: groupByTeacherId(facts.diary),
    registers,
  };
}

/** Calendar year/month in Asia/Kolkata (1-based month). */
export function istYearMonth(
  date: Date,
  timeZone: string = PERFORMANCE_TZ,
): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
  };
}

/** Inclusive ISO date bounds for an Asia/Kolkata calendar month. */
export function istMonthBounds(
  year: number,
  month: number,
): { from: string; to: string; labelDate: Date } {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  // Noon UTC keeps the calendar day stable across IST for monthLabel.
  const labelDate = new Date(Date.UTC(year, month - 1, 15, 12));
  return { from, to, labelDate };
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
  const fromIso = `${fromDate}T00:00:00.000Z`;
  const toIso = `${toDate}T23:59:59.999Z`;

  const [staff, marks, homework, diary, registers] = await Promise.all([
    fetchAllPagedRows<StaffAttendanceFact>((from, to) =>
      admin
        .from("staff_attendance")
        .select("teacher_id, attendance_date, status")
        .eq("institute_id", instituteId)
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate)
        .is("deleted_at", null)
        .order("attendance_date", { ascending: true })
        .range(from, to),
    ),
    fetchAllPagedRows<MarkEntryFact>((from, to) =>
      admin
        .from("mark_entry")
        .select("teacher_id, published_at, updated_at")
        .eq("institute_id", instituteId)
        .eq("status", "published")
        .is("deleted_at", null)
        .gte("updated_at", fromIso)
        .lte("updated_at", toIso)
        .order("updated_at", { ascending: true })
        .range(from, to),
    ),
    fetchAllPagedRows<HomeworkFact>((from, to) =>
      admin
        .from("homework")
        .select("teacher_id, published_at, updated_at")
        .eq("institute_id", instituteId)
        .eq("status", "published")
        .is("deleted_at", null)
        .gte("updated_at", fromIso)
        .lte("updated_at", toIso)
        .order("updated_at", { ascending: true })
        .range(from, to),
    ),
    fetchAllPagedRows<DiaryDayFact>((from, to) =>
      admin
        .from("diary_day")
        .select("teacher_id, diary_date, submitted_at")
        .eq("institute_id", instituteId)
        .not("submitted_at", "is", null)
        .gte("diary_date", fromDate)
        .lte("diary_date", toDate)
        .is("deleted_at", null)
        .order("diary_date", { ascending: true })
        .range(from, to),
    ),
    fetchAllPagedRows<AttendanceRegisterFact>((from, to) =>
      admin
        .from("attendance_register")
        .select("marked_by_teacher_id, attendance_date, status")
        .eq("institute_id", instituteId)
        .eq("status", "submitted")
        .gte("attendance_date", fromDate)
        .lte("attendance_date", toDate)
        .is("deleted_at", null)
        .order("attendance_date", { ascending: true })
        .range(from, to),
    ),
  ]);

  return {
    staff: staff.rows,
    marks: marks.rows,
    homework: homework.rows,
    diary: diary.rows,
    registers: registers.rows,
  };
}

function aggregateCountsForTeacher(
  indexed: IndexedFacts,
  teacherId: string,
  from: string,
  to: string,
): TeacherOperationalCounts {
  const counts = emptyCounts();

  for (const row of indexed.staff.get(teacherId) ?? []) {
    if (!inRange(row.attendance_date, from, to)) continue;
    addStaffCount(counts, row.status);
  }

  for (const row of indexed.marks.get(teacherId) ?? []) {
    const date = eventDate(row.published_at, row.updated_at);
    if (!inRange(date, from, to)) continue;
    counts.publishedMarks += 1;
  }

  for (const row of indexed.homework.get(teacherId) ?? []) {
    const date = eventDate(row.published_at, row.updated_at);
    if (!inRange(date, from, to)) continue;
    counts.publishedHomework += 1;
  }

  for (const row of indexed.diary.get(teacherId) ?? []) {
    if (!inRange(row.diary_date, from, to)) continue;
    counts.submittedDiaryDays += 1;
  }

  for (const row of indexed.registers.get(teacherId) ?? []) {
    if (!inRange(row.attendance_date, from, to)) continue;
    counts.submittedAttendanceRegisters += 1;
  }

  return counts;
}

/** @deprecated Prefer indexed path via aggregateTeacherWindows; kept for tests. */
export function aggregateCountsForRange(
  facts: TeacherPerformanceFacts,
  teacherId: string,
  from: string,
  to: string,
): TeacherOperationalCounts {
  return aggregateCountsForTeacher(indexFacts(facts), teacherId, from, to);
}

export function aggregateTeacherWindows(
  facts: TeacherPerformanceFacts,
  teacherIds: string[],
  ranges: PerformanceDateRanges,
): Map<string, TeacherPerformanceWindowCounts> {
  const indexed = indexFacts(facts);
  const byTeacher = new Map<string, TeacherPerformanceWindowCounts>();

  for (const teacherId of teacherIds) {
    byTeacher.set(teacherId, {
      ratingWindow: aggregateCountsForTeacher(
        indexed,
        teacherId,
        ranges.ratingFrom,
        ranges.asOfDate,
      ),
      recentWindow: aggregateCountsForTeacher(
        indexed,
        teacherId,
        ranges.recentFrom,
        ranges.asOfDate,
      ),
      priorWindow: aggregateCountsForTeacher(
        indexed,
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

  const indexed = indexFacts(facts);
  const { year: asOfYear, month: asOfMonth } = istYearMonth(asOf);
  const points: { label: string; value: number }[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const totalMonths = asOfYear * 12 + (asOfMonth - 1) - offset;
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    const { from, to, labelDate } = istMonthBounds(year, month);

    const ratings: number[] = [];
    for (const teacherId of teacherIds) {
      const counts = aggregateCountsForTeacher(indexed, teacherId, from, to);
      const rating = computeOperationalScore(counts);
      if (rating != null) ratings.push(rating);
    }

    points.push({
      label: monthLabel(labelDate),
      value:
        ratings.length === 0
          ? 0
          : Math.round(
              (ratings.reduce((sum, value) => sum + value, 0) / ratings.length) *
                100,
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
