/** Report catalog + export job stubs — Stage 9. */

export type ReportDefinitionDto = {
  id: string;
  name: string;
  module: string;
};

export type ReportJobStatus = "queued" | "ready";

export type ReportJobDto = {
  id: string;
  instituteId: string;
  reportId: string;
  status: ReportJobStatus;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateReportJobInput = {
  instituteId: string;
  reportId: string;
};
