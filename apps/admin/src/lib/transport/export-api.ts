import { getAdminApiClient } from "@/lib/admin-api";
import { createReportJob, downloadReportJob, saveBlobAsFile } from "@/lib/reports";

export type TransportExportReportId =
  | "transport"
  | "transport-trips"
  | "transport-attendance"
  | "transport-emergencies";

const LABELS: Record<TransportExportReportId, string> = {
  transport: "Route ridership",
  "transport-trips": "Trip log",
  "transport-attendance": "Boarding marks",
  "transport-emergencies": "SOS register",
};

export function transportExportLabel(reportId: TransportExportReportId): string {
  return LABELS[reportId];
}

export async function exportTransportReportCsv(input: {
  instituteId: string;
  reportId: TransportExportReportId;
}): Promise<{ fileName: string }> {
  const job = await createReportJob({
    instituteId: input.instituteId,
    reportId: input.reportId,
  });
  if (job.status !== "ready") {
    throw new Error(job.errorMessage ?? `Export failed for ${input.reportId}`);
  }
  const { blob, fileName } = await downloadReportJob(job.id);
  saveBlobAsFile(blob, job.fileName ?? fileName);
  return { fileName: job.fileName ?? fileName };
}

/** @internal for tests */
export function getAdminApiClientForTransportExport() {
  return getAdminApiClient();
}
