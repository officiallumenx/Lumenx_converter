/** Institute report catalog + durable export jobs. */

export type ReportDefinitionDto = {
  id: string;
  name: string;
  module: string;
  /** True when a server-side CSV generator exists for this catalog id. */
  generationSupported: boolean;
};

export type ReportJobStatus = "queued" | "running" | "ready" | "failed";

export type ReportJobRow = {
  id: string;
  institute_id: string;
  report_id: string;
  status: ReportJobStatus;
  file_name: string | null;
  content_type: string | null;
  content_text: string | null;
  error_message: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

export type ReportJobDto = {
  id: string;
  instituteId: string;
  reportId: string;
  status: ReportJobStatus;
  /** Auth-gated relative API path when ready; never a public signed URL. */
  downloadUrl: string | null;
  fileName: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type CreateReportJobInput = {
  instituteId: string;
  reportId: string;
};

export type GeneratedReportFile = {
  fileName: string;
  contentType: string;
  contentText: string;
};
