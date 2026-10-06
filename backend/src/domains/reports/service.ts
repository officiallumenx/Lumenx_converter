import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import {
  generateReportCsv,
  isReportGenerationSupported,
} from "./generate.js";
import {
  findReportJobById,
  insertReportJob,
  listReportJobs,
  updateReportJobFields,
} from "./repository.js";
import type {
  CreateReportJobInput,
  ReportDefinitionDto,
  ReportJobDto,
  ReportJobRow,
} from "./types.js";

const REPORT_CATALOG: Array<Omit<ReportDefinitionDto, "generationSupported">> = [
  { id: "students", name: "Student roster export", module: "Students" },
  { id: "teachers", name: "Faculty directory export", module: "Teachers" },
  { id: "attendance", name: "Attendance marks export", module: "Attendance" },
  { id: "attendance-daily", name: "Daily attendance by section", module: "Attendance" },
  { id: "attendance-weekly", name: "Weekly attendance by section", module: "Attendance" },
  { id: "attendance-student", name: "Student attendance marks", module: "Attendance" },
  { id: "attendance-teacher", name: "Teacher attendance submissions", module: "Attendance" },
  { id: "attendance-class", name: "Class attendance totals", module: "Attendance" },
  { id: "attendance-section", name: "Section attendance totals", module: "Attendance" },
  { id: "marks", name: "Published exam marks export", module: "Marks" },
  { id: "transport", name: "Routes, vehicles & enrollments", module: "Transport" },
  { id: "transport-trips", name: "Trip log export", module: "Transport" },
  {
    id: "transport-attendance",
    name: "Boarding & dropping marks",
    module: "Transport",
  },
  { id: "transport-emergencies", name: "SOS emergency register", module: "Transport" },
  { id: "admissions", name: "Admission applications export", module: "Admissions" },
  { id: "careers", name: "Career jobs & applications", module: "Careers" },
  { id: "complaints", name: "Complaints register export", module: "Complaints" },
  { id: "fees", name: "Fee ledger & payments", module: "Fees" },
  { id: "events", name: "Events list export", module: "Events" },
  { id: "leave", name: "Leave requests export", module: "Leave" },
  { id: "documents", name: "Generated documents export", module: "Documents" },
  { id: "audit", name: "Admin activity audit export", module: "Audit" },
];

const WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

function assertReportsReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

function assertReportsWriter(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...WRITE_ROLES]);
}

export function toReportJobDto(row: ReportJobRow): ReportJobDto {
  const ready = row.status === "ready";
  return {
    id: row.id,
    instituteId: row.institute_id,
    reportId: row.report_id,
    status: row.status,
    downloadUrl: ready ? `/api/v1/reports/jobs/${row.id}/download` : null,
    fileName: row.file_name,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function listReportCatalogForActor(
  actor: Actor,
  instituteIdRaw: string,
): ReportDefinitionDto[] {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReportsReader(actor, instituteId);
  return REPORT_CATALOG.map((r) => ({
    ...r,
    generationSupported: isReportGenerationSupported(r.id),
  }));
}

export async function listReportJobsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<ReportJobDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReportsReader(actor, instituteId);
  const rows = await listReportJobs(admin, instituteId);
  return rows.map(toReportJobDto);
}

export async function createReportJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateReportJobInput,
): Promise<ReportJobDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertReportsWriter(actor, instituteId);

  const report = REPORT_CATALOG.find((r) => r.id === input.reportId);
  if (!report) {
    throw AppError.validation("Unknown report_id", {
      report_id: ["Report not in catalog"],
    });
  }

  let row = await insertReportJob(admin, {
    instituteId,
    reportId: report.id,
    createdByUserId: actor.userId,
  });

  const running = await updateReportJobFields(admin, row.id, {
    status: "running",
  });
  if (running) row = running;

  try {
    if (!isReportGenerationSupported(report.id)) {
      throw new Error(
        `No CSV generator for report_id "${report.id}" (Supabase Storage / async workers not configured)`,
      );
    }
    const file = await generateReportCsv(admin, instituteId, report.id, {
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
    });
    const completedAt = new Date().toISOString();
    const ready = await updateReportJobFields(admin, row.id, {
      status: "ready",
      file_name: file.fileName,
      content_type: file.contentType,
      content_text: file.contentText,
      error_message: null,
      completed_at: completedAt,
    });
    if (!ready) throw AppError.internal("Failed to finalize report job");
    return toReportJobDto(ready);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Report generation failed";
    const failed = await updateReportJobFields(admin, row.id, {
      status: "failed",
      error_message: message.slice(0, 1000),
      completed_at: new Date().toISOString(),
      file_name: null,
      content_type: null,
      content_text: null,
    });
    if (!failed) throw AppError.internal("Failed to record report job failure");
    return toReportJobDto(failed);
  }
}

export type ReportDownloadPayload = {
  fileName: string;
  contentType: string;
  contentText: string;
};

export async function downloadReportJobForActor(
  admin: SupabaseClient,
  actor: Actor,
  jobId: string,
): Promise<ReportDownloadPayload> {
  const row = await findReportJobById(admin, jobId);
  if (!row) throw AppError.notFound("Report job not found");

  assertReportsReader(actor, row.institute_id);

  if (row.status !== "ready") {
    throw AppError.conflict("Report is not ready for download");
  }
  if (!row.content_text || !row.file_name || !row.content_type) {
    throw AppError.conflict("Report file is missing");
  }

  return {
    fileName: row.file_name,
    contentType: row.content_type,
    contentText: row.content_text,
  };
}
