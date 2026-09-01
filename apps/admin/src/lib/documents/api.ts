/**
 * Documents templates + generated API repository — API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  DocumentTemplateDto,
  GeneratedDocumentDto,
  ListDocumentTemplatesParams,
  ListGeneratedDocumentsParams,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Documents API is only available in API auth mode");
  }
}

export { assertApiMode };

export async function listDocumentTemplates(
  params: ListDocumentTemplatesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<DocumentTemplateDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.type) query.set("type", params.type);
  if (params.status) query.set("status", params.status);
  return client.get<DocumentTemplateDto[]>(
    `/api/v1/documents/templates?${query.toString()}`,
  );
}

export async function listGeneratedDocuments(
  params: ListGeneratedDocumentsParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<GeneratedDocumentDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const query = new URLSearchParams();
  query.set("institute_id", params.instituteId.trim());
  if (params.type) query.set("type", params.type);
  if (params.workflowState) query.set("workflow_state", params.workflowState);
  return client.get<GeneratedDocumentDto[]>(
    `/api/v1/documents/generated?${query.toString()}`,
  );
}

export async function getGeneratedDocumentSignedUrl(
  generatedId: string,
  expiresInSec?: number,
  client: AdminApiClient = getAdminApiClient(),
): Promise<{ signedUrl: string; expiresAt: string }> {
  assertApiMode();
  if (!isInstituteUuid(generatedId)) {
    throw new Error("generated_document_id must be a valid UUID");
  }
  const query = expiresInSec ? `?expires_in=${expiresInSec}` : "";
  return client.get<{ signedUrl: string; expiresAt: string }>(
    `/api/v1/documents/generated/${generatedId.trim()}/signed-url${query}`,
  );
}
