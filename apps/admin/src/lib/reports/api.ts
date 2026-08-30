/**
 * Reports API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ReportDefinitionDto, ReportJobDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Reports API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listReportCatalog(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ReportDefinitionDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<ReportDefinitionDto[]>(
    `/api/v1/reports/catalog?${query.toString()}`,
  );
}

export async function listReportJobs(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ReportJobDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<ReportJobDto[]>(`/api/v1/reports/jobs?${query.toString()}`);
}

export async function createReportJob(
  input: { instituteId: string; reportId: string },
  client: AdminApiClient = getAdminApiClient(),
): Promise<ReportJobDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.post<ReportJobDto>("/api/v1/reports/jobs", {
    institute_id: input.instituteId.trim(),
    report_id: input.reportId,
  });
}

export async function downloadReportJob(
  jobId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<{ blob: Blob; fileName: string }> {
  assertApiMode();
  if (!isInstituteUuid(jobId)) {
    throw new Error("job id must be a valid UUID");
  }
  const result = await client.download(
    `/api/v1/reports/jobs/${jobId.trim()}/download`,
  );
  return {
    blob: result.blob,
    fileName: result.fileName ?? `report-${jobId}.csv`,
  };
}

/** Trigger a browser file save from an authenticated download. */
export function saveBlobAsFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
