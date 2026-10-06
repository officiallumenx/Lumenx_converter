/**
 * Attendance report CSV builders shared by catalog attendance-* ids.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPagedRows } from "../../db/fetch-all-pages.js";
import type { AttendanceMarkRow, AttendanceRegisterRow } from "../attendance/types.js";
import type { GeneratedReportFile, ReportDateRange } from "./types.js";

const REGISTER_COLS =
  "id, institute_id, academic_year_id, class_id, section_id, config_version_id, method, owner, attendance_date, slot_kind, slot_code, period_index, timetable_slot_id, slot_label, subject_label, starts_at, ends_at, status, marked_by_teacher_id, submitted_at, created_at, updated_at, deleted_at";

const MARK_COLS =
  "id, institute_id, register_id, student_id, enrollment_id, status, created_at, updated_at, deleted_at";

function esc(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(
  headers: string[],
  rows: Array<Array<string | null | undefined>>,
): string {
  const lines = [
    headers.map(esc).join(","),
    ...rows.map((row) =>
      row.map((cell) => esc(cell == null ? "" : String(cell))).join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

function stamp(reportId: string, range?: ReportDateRange): string {
  const d = new Date().toISOString().slice(0, 10);
  if (range?.fromDate || range?.toDate) {
    return `${reportId}-${range.fromDate ?? "start"}_${range.toDate ?? "end"}.csv`;
  }
  return `${reportId}-${d}.csv`;
}

function weekStart(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

/** Prefer newest register's class_id per section (avoids stale class after section moves). */
function buildSectionClassMap(
  registers: AttendanceRegisterRow[],
): Map<string, string> {
  const sorted = [...registers].sort((a, b) =>
    b.attendance_date.localeCompare(a.attendance_date),
  );
  const map = new Map<string, string>();
  for (const reg of sorted) {
    if (reg.section_id && reg.class_id && !map.has(reg.section_id)) {
      map.set(reg.section_id, reg.class_id);
    }
  }
  return map;
}

type AttendanceContext = {
  registers: AttendanceRegisterRow[];
  registerById: Map<string, AttendanceRegisterRow>;
  marks: AttendanceMarkRow[];
  sectionClassMap: Map<string, string>;
};

async function loadAttendanceContext(
  admin: SupabaseClient,
  instituteId: string,
  range?: ReportDateRange,
): Promise<AttendanceContext> {
  const registersPage = await fetchAllPagedRows<AttendanceRegisterRow>((from, to) => {
    let query = admin
      .from("attendance_register")
      .select(REGISTER_COLS)
      .eq("institute_id", instituteId)
      .is("deleted_at", null)
      .order("attendance_date", { ascending: true })
      .order("id", { ascending: true });
    if (range?.fromDate) query = query.gte("attendance_date", range.fromDate);
    if (range?.toDate) query = query.lte("attendance_date", range.toDate);
    return query.range(from, to);
  });
  const registers = registersPage.rows;
  const registerById = new Map(registers.map((row) => [row.id, row]));
  const registerIds = new Set(registers.map((row) => row.id));

  const marksPage = await fetchAllPagedRows<AttendanceMarkRow>((from, to) =>
    admin
      .from("attendance_mark")
      .select(MARK_COLS)
      .eq("institute_id", instituteId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .range(from, to),
  );
  const marks = marksPage.rows.filter((row) => registerIds.has(row.register_id));

  return {
    registers,
    registerById,
    marks,
    sectionClassMap: buildSectionClassMap(registers),
  };
}

function countStatuses(marks: AttendanceMarkRow[]) {
  return {
    present: marks.filter((m) => m.status === "present").length,
    absent: marks.filter((m) => m.status === "absent").length,
    leave: marks.filter((m) => m.status === "leave").length,
    total: marks.length,
  };
}

function pct(present: number, total: number): string {
  if (total === 0) return "";
  return String(Math.round((present / total) * 10000) / 100);
}

export async function generateAttendanceReportCsv(
  admin: SupabaseClient,
  instituteId: string,
  reportId: string,
  range?: ReportDateRange,
): Promise<GeneratedReportFile> {
  const ctx = await loadAttendanceContext(admin, instituteId, range);
  const classForSection = (sectionId: string | undefined, fallback?: string | null) =>
    (sectionId ? ctx.sectionClassMap.get(sectionId) : undefined) ?? fallback ?? "";

  switch (reportId) {
    case "attendance":
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "register_id",
            "attendance_date",
            "class_id",
            "section_id",
            "slot_label",
            "register_status",
            "student_id",
            "enrollment_id",
            "mark_status",
          ],
          ctx.marks.map((mark) => {
            const reg = ctx.registerById.get(mark.register_id);
            return [
              mark.register_id,
              reg?.attendance_date,
              reg?.class_id,
              reg?.section_id,
              reg?.slot_label,
              reg?.status,
              mark.student_id,
              mark.enrollment_id,
              mark.status,
            ];
          }),
        ),
      };
    case "attendance-daily": {
      const buckets = new Map<string, AttendanceMarkRow[]>();
      for (const mark of ctx.marks) {
        const reg = ctx.registerById.get(mark.register_id);
        if (!reg) continue;
        const key = `${reg.attendance_date}|${reg.section_id}`;
        const list = buckets.get(key) ?? [];
        list.push(mark);
        buckets.set(key, list);
      }
      const rows = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, marks]) => {
          const [date, sectionId] = key.split("|");
          const reg = ctx.registers.find(
            (row) => row.attendance_date === date && row.section_id === sectionId,
          );
          const counts = countStatuses(marks);
          return [
            date,
            classForSection(sectionId, reg?.class_id),
            sectionId,
            String(counts.present),
            String(counts.absent),
            String(counts.leave),
            String(counts.total),
            pct(counts.present, counts.total),
          ];
        });
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "attendance_date",
            "class_id",
            "section_id",
            "present",
            "absent",
            "leave",
            "total",
            "attendance_pct",
          ],
          rows,
        ),
      };
    }
    case "attendance-weekly": {
      const buckets = new Map<string, AttendanceMarkRow[]>();
      for (const mark of ctx.marks) {
        const reg = ctx.registerById.get(mark.register_id);
        if (!reg) continue;
        const key = `${weekStart(reg.attendance_date)}|${reg.section_id}`;
        const list = buckets.get(key) ?? [];
        list.push(mark);
        buckets.set(key, list);
      }
      const rows = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, marks]) => {
          const [weekOf, sectionId] = key.split("|");
          const counts = countStatuses(marks);
          return [
            weekOf,
            classForSection(sectionId),
            sectionId,
            String(counts.present),
            String(counts.absent),
            String(counts.leave),
            String(counts.total),
            pct(counts.present, counts.total),
          ];
        });
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "week_start",
            "class_id",
            "section_id",
            "present",
            "absent",
            "leave",
            "total",
            "attendance_pct",
          ],
          rows,
        ),
      };
    }
    case "attendance-student":
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "student_id",
            "attendance_date",
            "class_id",
            "section_id",
            "slot_label",
            "mark_status",
          ],
          ctx.marks
            .map((mark) => {
              const reg = ctx.registerById.get(mark.register_id);
              return [
                mark.student_id,
                reg?.attendance_date,
                classForSection(reg?.section_id, reg?.class_id),
                reg?.section_id,
                reg?.slot_label,
                mark.status,
              ];
            })
            .sort(
              (a, b) =>
                String(a[1] ?? "").localeCompare(String(b[1] ?? "")) ||
                String(a[0] ?? "").localeCompare(String(b[0] ?? "")),
            ),
        ),
      };
    case "attendance-teacher":
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "teacher_id",
            "attendance_date",
            "class_id",
            "section_id",
            "slot_label",
            "register_status",
            "submitted_at",
          ],
          ctx.registers
            .map((reg) => [
              reg.marked_by_teacher_id,
              reg.attendance_date,
              classForSection(reg.section_id, reg.class_id),
              reg.section_id,
              reg.slot_label,
              reg.status,
              reg.submitted_at,
            ])
            .sort(
              (a, b) =>
                String(a[1] ?? "").localeCompare(String(b[1] ?? "")) ||
                String(a[0] ?? "").localeCompare(String(b[0] ?? "")),
            ),
        ),
      };
    case "attendance-class": {
      const buckets = new Map<string, AttendanceMarkRow[]>();
      for (const mark of ctx.marks) {
        const reg = ctx.registerById.get(mark.register_id);
        if (!reg) continue;
        const classId = classForSection(reg.section_id, reg.class_id);
        const key = `${reg.attendance_date}|${classId}`;
        const list = buckets.get(key) ?? [];
        list.push(mark);
        buckets.set(key, list);
      }
      const rows = [...buckets.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, marks]) => {
          const [date, classId] = key.split("|");
          const counts = countStatuses(marks);
          return [
            date,
            classId,
            String(counts.present),
            String(counts.absent),
            String(counts.leave),
            String(counts.total),
            pct(counts.present, counts.total),
          ];
        });
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "attendance_date",
            "class_id",
            "present",
            "absent",
            "leave",
            "total",
            "attendance_pct",
          ],
          rows,
        ),
      };
    }
    case "attendance-section":
      return {
        fileName: stamp(reportId, range),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "section_id",
            "class_id",
            "attendance_date",
            "present",
            "absent",
            "leave",
            "total",
            "attendance_pct",
          ],
          (() => {
            const buckets = new Map<string, AttendanceMarkRow[]>();
            for (const mark of ctx.marks) {
              const reg = ctx.registerById.get(mark.register_id);
              if (!reg) continue;
              const key = `${reg.section_id}|${reg.attendance_date}`;
              const list = buckets.get(key) ?? [];
              list.push(mark);
              buckets.set(key, list);
            }
            return [...buckets.entries()]
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, marks]) => {
                const [sectionId, date] = key.split("|");
                const counts = countStatuses(marks);
                return [
                  sectionId,
                  classForSection(sectionId),
                  date,
                  String(counts.present),
                  String(counts.absent),
                  String(counts.leave),
                  String(counts.total),
                  pct(counts.present, counts.total),
                ];
              });
          })(),
        ),
      };
    default:
      throw new Error(`Unknown attendance report_id "${reportId}"`);
  }
}

export function isAttendanceReportId(reportId: string): boolean {
  return [
    "attendance",
    "attendance-daily",
    "attendance-weekly",
    "attendance-student",
    "attendance-teacher",
    "attendance-class",
    "attendance-section",
  ].includes(reportId);
}
