/**
 * Attendance report CSV builders shared by catalog attendance-* ids.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listMarksForInstitute,
  listRegisters,
} from "../attendance/repository.js";
import type { AttendanceMarkRow, AttendanceRegisterRow } from "../attendance/types.js";
import type { GeneratedReportFile } from "./types.js";

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

function stamp(reportId: string): string {
  const d = new Date().toISOString().slice(0, 10);
  return `${reportId}-${d}.csv`;
}

function weekStart(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().slice(0, 10);
}

type AttendanceContext = {
  registers: AttendanceRegisterRow[];
  registerById: Map<string, AttendanceRegisterRow>;
  marks: AttendanceMarkRow[];
};

async function loadAttendanceContext(
  admin: SupabaseClient,
  instituteId: string,
): Promise<AttendanceContext> {
  const registers = await listRegisters(admin, { instituteId });
  const registerById = new Map(registers.map((row) => [row.id, row]));
  const marks = (await listMarksForInstitute(admin, instituteId)).filter(
    (row) => row.institute_id === instituteId,
  );
  return { registers, registerById, marks };
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
): Promise<GeneratedReportFile> {
  const ctx = await loadAttendanceContext(admin, instituteId);

  switch (reportId) {
    case "attendance":
      return {
        fileName: stamp(reportId),
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
            reg?.class_id ?? "",
            sectionId,
            String(counts.present),
            String(counts.absent),
            String(counts.leave),
            String(counts.total),
            pct(counts.present, counts.total),
          ];
        });
      return {
        fileName: stamp(reportId),
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
          const reg = ctx.registers.find((row) => row.section_id === sectionId);
          const counts = countStatuses(marks);
          return [
            weekOf,
            reg?.class_id ?? "",
            sectionId,
            String(counts.present),
            String(counts.absent),
            String(counts.leave),
            String(counts.total),
            pct(counts.present, counts.total),
          ];
        });
      return {
        fileName: stamp(reportId),
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
        fileName: stamp(reportId),
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
                reg?.class_id,
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
        fileName: stamp(reportId),
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
              reg.class_id,
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
        const key = `${reg.attendance_date}|${reg.class_id}`;
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
        fileName: stamp(reportId),
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
        fileName: stamp(reportId),
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
                const reg = ctx.registers.find((row) => row.section_id === sectionId);
                const counts = countStatuses(marks);
                return [
                  sectionId,
                  reg?.class_id ?? "",
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
