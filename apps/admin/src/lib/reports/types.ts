/** Mirrors backend report DTOs. */

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
