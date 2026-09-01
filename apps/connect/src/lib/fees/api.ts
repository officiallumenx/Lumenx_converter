import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import type {
  GetStudentFeePortalParams,
  ListSectionFeeRosterParams,
  SectionFeeRosterRowDto,
  StudentFeePortalDto,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Fees API is only available in API auth mode");
  }
}

export async function getStudentFeePortal(
  params: GetStudentFeePortalParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<StudentFeePortalDto> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.studentId)) {
    throw new Error("institute_id and student_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  return client.get<StudentFeePortalDto>(
    `/api/v1/fees/portal/students/${params.studentId.trim()}?${query.toString()}`,
  );
}

export async function listSectionFeeRoster(
  params: ListSectionFeeRosterParams,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<SectionFeeRosterRowDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId) || !isInstituteUuid(params.sectionId)) {
    throw new Error("institute_id and section_id must be valid UUIDs");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  query.set("section_id", params.sectionId.trim());
  return client.get<SectionFeeRosterRowDto[]>(
    `/api/v1/fees/portal/roster?${query.toString()}`,
  );
}
