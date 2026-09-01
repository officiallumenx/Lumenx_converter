import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ListStudentsParams, StudentDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Students API is only available in API auth mode");
  }
}

export async function listStudents(
  params: ListStudentsParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }

  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.status) query.set("status", params.status);
  if (params.q?.trim()) query.set("q", params.q.trim());

  return client.get<StudentDto[]>(`/api/v1/students?${query.toString()}`);
}
