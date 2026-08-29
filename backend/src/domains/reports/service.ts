import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { AppError } from "../../errors/app-error.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import type {
  CreateReportJobInput,
  ReportDefinitionDto,
  ReportJobDto,
} from "./types.js";

const REPORT_CATALOG: ReportDefinitionDto[] = [
  { id: "students", name: "Student roster & demographics", module: "Students" },
  { id: "teachers", name: "Faculty directory & assignments", module: "Teachers" },
  { id: "attendance", name: "Monthly attendance register", module: "Attendance" },
  { id: "attendance-daily", name: "Daily attendance by section", module: "Attendance" },
  { id: "attendance-weekly", name: "Weekly attendance by section", module: "Attendance" },
  { id: "marks", name: "Exam results by class", module: "Marks" },
  { id: "transport", name: "Route ridership & compliance", module: "Transport" },
  { id: "admissions", name: "Application funnel", module: "Admissions" },
  { id: "careers", name: "Hiring pipeline", module: "Careers" },
  { id: "complaints", name: "SLA & resolution summary", module: "Complaints" },
  { id: "fees", name: "Collection & defaulters", module: "Fees" },
  { id: "events", name: "Event participation", module: "Events" },
  { id: "leave", name: "Leave register & approvals", module: "Leave" },
  { id: "documents", name: "Document verification summary", module: "Documents" },
  { id: "audit", name: "Admin activity audit trail", module: "Audit" },
];

/** In-memory job store keyed by institute (Stage 9 stub; not durable). */
const jobsByInstitute = new Map<string, ReportJobDto[]>();

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

export function listReportCatalogForActor(
  actor: Actor,
  instituteIdRaw: string,
): ReportDefinitionDto[] {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReportsReader(actor, instituteId);
  return REPORT_CATALOG.map((r) => ({ ...r }));
}

export function listReportJobsForActor(
  actor: Actor,
  instituteIdRaw: string,
): ReportJobDto[] {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertReportsReader(actor, instituteId);
  return [...(jobsByInstitute.get(instituteId) ?? [])];
}

export function createReportJobForActor(
  actor: Actor,
  input: CreateReportJobInput,
): ReportJobDto {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertReportsWriter(actor, instituteId);

  const report = REPORT_CATALOG.find((r) => r.id === input.reportId);
  if (!report) {
    throw AppError.validation("Unknown report_id", {
      report_id: ["Report not in catalog"],
    });
  }

  const now = new Date().toISOString();
  const job: ReportJobDto = {
    id: crypto.randomUUID(),
    instituteId,
    reportId: report.id,
    status: "queued",
    downloadUrl: null,
    createdAt: now,
    updatedAt: now,
  };

  const list = jobsByInstitute.get(instituteId) ?? [];
  list.unshift(job);
  jobsByInstitute.set(instituteId, list.slice(0, 100));
  return job;
}

/** Test helper — clears in-memory jobs. */
export function resetReportJobsForTests(): void {
  jobsByInstitute.clear();
}
