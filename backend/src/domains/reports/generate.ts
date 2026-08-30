/**
 * Synchronous CSV generators for catalog reports that have institute-scoped
 * list repositories. Unsupported ids throw — caller marks the job failed.
 *
 * CSV is stored on report_job.content_text (no Storage bucket / worker queue).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listApplications } from "../admissions/repository.js";
import {
  listMarksForInstitute,
  listRegisters,
} from "../attendance/repository.js";
import { listAuditEvents } from "../audit/repository.js";
import { listComplaints } from "../complaints/repository.js";
import { listEvents } from "../events/repository.js";
import { listExams } from "../exams/repository.js";
import {
  listPaymentsForInstitute,
  listStudentFeesForInstitute,
} from "../fees/repository.js";
import { listLeaveRequests } from "../leave/repository.js";
import {
  listMarkEntries,
  listScoresForEntryIds,
} from "../marks/repository.js";
import { listStudents } from "../students/repository.js";
import { listTeachers } from "../teachers/repository.js";
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

const SUPPORTED = new Set([
  "students",
  "teachers",
  "attendance",
  "marks",
  "fees",
  "complaints",
  "leave",
  "events",
  "admissions",
  "audit",
]);

export function isReportGenerationSupported(reportId: string): boolean {
  return SUPPORTED.has(reportId);
}

export async function generateReportCsv(
  admin: SupabaseClient,
  instituteId: string,
  reportId: string,
): Promise<GeneratedReportFile> {
  switch (reportId) {
    case "students": {
      const rows = await listStudents(admin, { instituteId });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "id",
            "admission_number",
            "display_name",
            "class_label",
            "section_label",
            "status",
          ],
          rows.map((r) => [
            r.id,
            r.admission_number,
            r.display_name,
            r.class_label,
            r.section_label,
            r.status,
          ]),
        ),
      };
    }
    case "attendance": {
      const registers = await listRegisters(admin, { instituteId });
      const registerById = new Map(registers.map((r) => [r.id, r]));
      const marks = (await listMarksForInstitute(admin, instituteId)).filter(
        (m) => m.institute_id === instituteId,
      );
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
          marks.map((m) => {
            const reg = registerById.get(m.register_id);
            return [
              m.register_id,
              reg?.attendance_date,
              reg?.class_id,
              reg?.section_id,
              reg?.slot_label,
              reg?.status,
              m.student_id,
              m.enrollment_id,
              m.status,
            ];
          }),
        ),
      };
    }
    case "fees": {
      const ledger = (await listStudentFeesForInstitute(admin, instituteId)).filter(
        (r) => r.institute_id === instituteId,
      );
      const payments = (await listPaymentsForInstitute(admin, instituteId)).filter(
        (r) => r.institute_id === instituteId,
      );
      const paymentByStudentPlan = new Map<string, typeof payments>();
      for (const p of payments) {
        const key = `${p.fee_plan_id}:${p.student_id}`;
        const list = paymentByStudentPlan.get(key) ?? [];
        list.push(p);
        paymentByStudentPlan.set(key, list);
      }
      const rows: Array<Array<string>> = [];
      const ledgerKeys = new Set<string>();
      for (const fee of ledger) {
        const key = `${fee.fee_plan_id}:${fee.student_id}`;
        ledgerKeys.add(key);
        const recs = paymentByStudentPlan.get(key) ?? [];
        if (recs.length === 0) {
          rows.push([
            "ledger",
            fee.id,
            fee.fee_plan_id,
            fee.student_id,
            fee.status,
            String(fee.billed_amount),
            String(fee.paid_amount),
            "",
            "",
            "",
            "",
            "",
          ]);
        } else {
          for (const p of recs) {
            rows.push([
              "payment",
              fee.id,
              fee.fee_plan_id,
              fee.student_id,
              fee.status,
              String(fee.billed_amount),
              String(fee.paid_amount),
              p.id,
              String(p.amount),
              p.method,
              p.receipt_no,
              p.paid_on,
            ]);
          }
        }
      }
      for (const p of payments) {
        const key = `${p.fee_plan_id}:${p.student_id}`;
        if (ledgerKeys.has(key)) continue;
        rows.push([
          "payment",
          "",
          p.fee_plan_id,
          p.student_id,
          "",
          "",
          "",
          p.id,
          String(p.amount),
          p.method,
          p.receipt_no,
          p.paid_on,
        ]);
      }
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "row_kind",
            "student_fee_id",
            "fee_plan_id",
            "student_id",
            "ledger_status",
            "billed_amount",
            "paid_amount",
            "payment_id",
            "payment_amount",
            "method",
            "receipt_no",
            "paid_on",
          ],
          rows,
        ),
      };
    }
    case "marks": {
      const entries = await listMarkEntries(admin, { instituteId });
      const exams = await listExams(admin, { instituteId });
      const examName = new Map(exams.map((e) => [e.id, e.name]));
      const scores = (
        await listScoresForEntryIds(
          admin,
          entries.map((e) => e.id),
        )
      ).filter((s) => s.institute_id === instituteId);
      const scoresByEntry = new Map<string, typeof scores>();
      for (const s of scores) {
        const list = scoresByEntry.get(s.mark_entry_id) ?? [];
        list.push(s);
        scoresByEntry.set(s.mark_entry_id, list);
      }
      const rows: Array<Array<string | null | undefined>> = [];
      for (const entry of entries) {
        const entryScores = scoresByEntry.get(entry.id) ?? [];
        if (entryScores.length === 0) {
          rows.push([
            entry.id,
            entry.exam_id,
            examName.get(entry.exam_id) ?? "",
            entry.subject_id,
            entry.class_id,
            entry.section_id,
            entry.status,
            String(entry.max_marks),
            "",
            "",
            "",
          ]);
        } else {
          for (const s of entryScores) {
            rows.push([
              entry.id,
              entry.exam_id,
              examName.get(entry.exam_id) ?? "",
              entry.subject_id,
              entry.class_id,
              entry.section_id,
              entry.status,
              String(entry.max_marks),
              s.student_id,
              s.enrollment_id,
              s.marks == null ? "" : String(s.marks),
            ]);
          }
        }
      }
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "mark_entry_id",
            "exam_id",
            "exam_name",
            "subject_id",
            "class_id",
            "section_id",
            "entry_status",
            "max_marks",
            "student_id",
            "enrollment_id",
            "marks",
          ],
          rows,
        ),
      };
    }
    case "teachers": {
      const rows = await listTeachers(admin, { instituteId });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          ["id", "employee_id", "display_name", "department", "email", "status"],
          rows.map((r) => [
            r.id,
            r.employee_id,
            r.display_name,
            r.department,
            r.email,
            r.status,
          ]),
        ),
      };
    }
    case "complaints": {
      const rows = await listComplaints(admin, { instituteId });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          ["id", "title", "category", "priority", "status", "created_at"],
          rows.map((r) => [
            r.id,
            r.title,
            r.category,
            r.priority,
            r.status,
            r.created_at,
          ]),
        ),
      };
    }
    case "leave": {
      const rows = await listLeaveRequests(admin, { instituteId });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          ["id", "leave_type", "status", "start_date", "end_date", "created_at"],
          rows.map((r) => [
            r.id,
            r.leave_type,
            r.status,
            r.start_date,
            r.end_date,
            r.created_at,
          ]),
        ),
      };
    }
    case "events": {
      const rows = await listEvents(admin, { instituteId });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          ["id", "title", "kind", "starts_on", "ends_on", "published"],
          rows.map((r) => [
            r.id,
            r.title,
            r.kind,
            r.starts_on,
            r.ends_on,
            String(r.published),
          ]),
        ),
      };
    }
    case "admissions": {
      const rows = await listApplications(admin, instituteId);
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          ["id", "student_display_name", "status", "submitted_at", "created_at"],
          rows.map((r) => [
            r.id,
            r.student_display_name,
            r.status,
            r.submitted_at,
            r.created_at,
          ]),
        ),
      };
    }
    case "audit": {
      const rows = await listAuditEvents(admin, {
        scope: "institute",
        instituteId,
        limit: 200,
      });
      return {
        fileName: stamp(reportId),
        contentType: "text/csv; charset=utf-8",
        contentText: toCsv(
          [
            "id",
            "action",
            "entity_type",
            "entity_id",
            "actor_user_id",
            "created_at",
          ],
          rows.map((r) => [
            r.id,
            r.action,
            r.entity_type,
            r.entity_id,
            r.actor_user_id,
            r.created_at,
          ]),
        ),
      };
    }
    default:
      throw new Error(
        `No CSV generator for report_id "${reportId}" (Supabase Storage / async workers not configured; use a supported catalog id)`,
      );
  }
}
