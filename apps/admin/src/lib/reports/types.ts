/** Mirrors backend reports DTOs. */

export type ReportDefinitionDto = {
  id: string;
  name: string;
  module: string;
  generationSupported?: boolean;
};

export type ReportJobStatus = "queued" | "running" | "ready" | "failed";

export type ReportJobDto = {
  id: string;
  instituteId: string;
  reportId: string;
  status: ReportJobStatus;
  downloadUrl: string | null;
  fileName: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
