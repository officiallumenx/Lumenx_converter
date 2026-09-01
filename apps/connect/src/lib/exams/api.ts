import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ExamDto, ListExamsParams } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Exams API is only available in API auth mode");
  }
}

export async function listExams(
  params: ListExamsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<ExamDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.scheduleStatus) query.set("schedule_status", params.scheduleStatus);
  return client.get<ExamDto[]>(`/api/v1/exams?${query.toString()}`);
}
