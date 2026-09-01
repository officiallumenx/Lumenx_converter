/**
 * Admissions documents API — Connect API auth mode only.
 */
import { getConnectApiClient } from "@/lib/connect-api";
import type { ConnectApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Admissions API is only available in API auth mode");
  }
}

export type AdmissionDocumentDto = {
  id: string;
  instituteId: string;
  applicationId: string;
  docType:
    | "birth_certificate"
    | "transfer_certificate"
    | "marks_memo"
    | "student_photo"
    | "parent_id"
    | "additional";
  label: string;
  fileName: string | null;
  assetPath: string | null;
  status:
    | "not_uploaded"
    | "uploaded"
    | "under_review"
    | "verified"
    | "rejected"
    | "resubmission_required";
  note: string | null;
  uploadedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssetDto = {
  id: string;
  instituteId: string;
  bucket: string;
  objectPath: string;
  fileName: string | null;
};

export async function listAdmissionDocuments(
  applicationId: string,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AdmissionDocumentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.get<AdmissionDocumentDto[]>(
    `/api/v1/admissions/applications/${applicationId.trim()}/documents`,
  );
}

export async function createAdmissionDocument(
  applicationId: string,
  input: {
    docType: AdmissionDocumentDto["docType"];
    label: string;
    fileName?: string | null;
    assetPath?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AdmissionDocumentDto> {
  assertApiMode();
  if (!isInstituteUuid(applicationId)) {
    throw new Error("application_id must be a valid UUID");
  }
  return client.post<AdmissionDocumentDto>(
    `/api/v1/admissions/applications/${applicationId.trim()}/documents`,
    {
      doc_type: input.docType,
      label: input.label.trim(),
      file_name: input.fileName,
      asset_path: input.assetPath,
    },
  );
}

export async function updateAdmissionDocument(
  documentId: string,
  input: {
    status?: AdmissionDocumentDto["status"];
    note?: string | null;
    fileName?: string | null;
    assetPath?: string | null;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AdmissionDocumentDto> {
  assertApiMode();
  if (!isInstituteUuid(documentId)) {
    throw new Error("document_id must be a valid UUID");
  }
  return client.patch<AdmissionDocumentDto>(
    `/api/v1/admissions/documents/${documentId.trim()}`,
    {
      status: input.status,
      note: input.note,
      file_name: input.fileName,
      asset_path: input.assetPath,
    },
  );
}

export async function uploadAdmissionAsset(
  input: {
    instituteId: string;
    file: File;
    linkedEntityKind?: "admission_document";
    linkedEntityId?: string;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<AssetDto> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const form = new FormData();
  form.set("institute_id", input.instituteId.trim());
  form.set("bucket", "admission-docs");
  form.set("category", "admission_doc");
  form.set("file", input.file);
  form.set("visibility", "private");
  if (input.linkedEntityKind) form.set("linked_entity_kind", input.linkedEntityKind);
  if (input.linkedEntityId) form.set("linked_entity_id", input.linkedEntityId);
  return client.uploadForm<AssetDto>("/api/v1/assets/upload", form);
}

export async function getAdmissionDocumentSignedUrl(
  documentId: string,
  expiresInSec?: number,
  client: ConnectApiClient = getConnectApiClient(),
): Promise<{ signedUrl: string; expiresAt: string }> {
  assertApiMode();
  if (!isInstituteUuid(documentId)) {
    throw new Error("document_id must be a valid UUID");
  }
  const query = expiresInSec ? `?expires_in=${expiresInSec}` : "";
  return client.get<{ signedUrl: string; expiresAt: string }>(
    `/api/v1/admissions/documents/${documentId.trim()}/signed-url${query}`,
  );
}

export async function createAdmissionApplication(
  input: {
    instituteId: string;
    openingId: string;
    studentDisplayName: string;
    payload?: unknown;
    submitNow?: boolean;
  },
  client: ConnectApiClient = getConnectApiClient(),
): Promise<{ id: string; instituteId: string; status: string }> {
  assertApiMode();
  if (!isInstituteUuid(input.instituteId) || !isInstituteUuid(input.openingId)) {
    throw new Error("institute_id and opening_id must be valid UUIDs");
  }
  return client.post("/api/v1/admissions/applications", {
    institute_id: input.instituteId.trim(),
    opening_id: input.openingId.trim(),
    student_display_name: input.studentDisplayName.trim(),
    payload: input.payload,
    submit_now: input.submitNow ?? true,
  });
}
