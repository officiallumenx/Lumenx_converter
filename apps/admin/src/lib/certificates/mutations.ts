/**
 * Certificates write API — issue / revoke. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  IssuedCertificateDto,
  IssuedCertificateFileKind,
  IssuedCertificateStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Certificates API is only available in API auth mode");
  }
}

export type IssueCertificateInput = {
  instituteId: string;
  generatedDocumentId?: string;
  templateId?: string;
  studentId?: string | null;
  teacherId?: string | null;
  title?: string;
  category?: string | null;
  recipientName?: string;
  recipientRef?: string | null;
  certificateNumber?: string;
  year?: number;
  assetPath?: string | null;
  fileKind?: IssuedCertificateFileKind | null;
  metadataOnly?: boolean;
};

export type RevokeCertificateInput = {
  reason: string;
  status?: Extract<IssuedCertificateStatus, "revoked" | "superseded">;
};

export async function issueCertificate(
  input: IssueCertificateInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<IssuedCertificateDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  if (input.generatedDocumentId && !isInstituteUuid(input.generatedDocumentId)) {
    throw new Error("generated_document_id must be a valid UUID");
  }
  if (input.templateId && !isInstituteUuid(input.templateId)) {
    throw new Error("template_id must be a valid UUID");
  }
  return client.post<IssuedCertificateDto>("/api/v1/certificates", {
    institute_id: input.instituteId.trim(),
    generated_document_id: input.generatedDocumentId,
    template_id: input.templateId,
    student_id: input.studentId,
    teacher_id: input.teacherId,
    title: input.title,
    category: input.category,
    recipient_name: input.recipientName,
    recipient_ref: input.recipientRef,
    certificate_number: input.certificateNumber,
    year: input.year,
    asset_path: input.assetPath,
    file_kind: input.fileKind,
    metadata_only: input.metadataOnly,
  });
}

export async function revokeCertificate(
  certificateId: string,
  input: RevokeCertificateInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<IssuedCertificateDto> {
  assertApiMode();
  if (!isInstituteUuid(certificateId)) {
    throw new Error("certificate_id must be a valid UUID");
  }
  return client.post<IssuedCertificateDto>(
    `/api/v1/certificates/${certificateId.trim()}/revoke`,
    {
      reason: input.reason.trim(),
      status: input.status,
    },
  );
}
