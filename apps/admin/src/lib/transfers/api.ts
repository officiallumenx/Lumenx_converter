import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

export type TransferRequestDto = {
  id: string;
  sourceInstituteId: string;
  destinationInstituteId: string;
  sourceStudentId: string;
  destinationStudentId: string | null;
  status: string;
  effectiveOn: string | null;
  decisionReason: string | null;
  sharedFields: Record<string, boolean>;
  sourceStudentPreview?: {
    displayName: string | null;
    admissionNumber: string | null;
  };
};

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Transfers API is only available in API auth mode");
  }
}

export async function listTransfers(
  instituteId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransferRequestDto[]> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return client.get<TransferRequestDto[]>(
    `/api/v1/transfers?${query.toString()}`,
  );
}

export async function initiateTransfer(
  input: {
    sourceInstituteId: string;
    destinationInstituteId: string;
    sourceStudentId: string;
    effectiveOn?: string | null;
    sharedFields: Record<string, boolean>;
    clientRequestId?: string | null;
  },
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransferRequestDto> {
  assertApiMode();
  return client.post<TransferRequestDto>("/api/v1/transfers", {
    source_institute_id: input.sourceInstituteId,
    destination_institute_id: input.destinationInstituteId,
    source_student_id: input.sourceStudentId,
    effective_on: input.effectiveOn ?? null,
    shared_fields: input.sharedFields,
    client_request_id: input.clientRequestId ?? null,
  });
}

export async function acceptTransfer(
  transferId: string,
  input: {
    destinationAcademicYearId: string;
    destinationClassId: string;
    destinationSectionId: string;
    destinationStudentId?: string | null;
    reason?: string | null;
  },
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransferRequestDto> {
  assertApiMode();
  return client.post<TransferRequestDto>(`/api/v1/transfers/${transferId}/accept`, {
    destination_academic_year_id: input.destinationAcademicYearId,
    destination_class_id: input.destinationClassId,
    destination_section_id: input.destinationSectionId,
    destination_student_id: input.destinationStudentId ?? null,
    reason: input.reason ?? null,
  });
}

export async function rejectTransfer(
  transferId: string,
  reason?: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransferRequestDto> {
  assertApiMode();
  return client.post<TransferRequestDto>(`/api/v1/transfers/${transferId}/reject`, {
    reason: reason ?? null,
  });
}

export async function cancelTransfer(
  transferId: string,
  reason?: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<TransferRequestDto> {
  assertApiMode();
  return client.post<TransferRequestDto>(`/api/v1/transfers/${transferId}/cancel`, {
    reason: reason ?? null,
  });
}
