/**
 * Admissions documents — API mode bridge with demo fallback.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import type { ApplicationDocument, DocumentType } from "./types";
import {
  createAdmissionDocument,
  listAdmissionDocuments,
  updateAdmissionDocument,
  uploadAdmissionAsset,
  getAdmissionDocumentSignedUrl,
} from "./api";
import {
  ADMISSION_DOC_LABELS,
  admissionDocumentDtoToPortal,
  portalDocTypeToApi,
} from "./map-documents";
import { uploadDocument as uploadDocumentDemo } from "./repositories";

export async function loadApplicationDocuments(
  applicationId: string,
): Promise<ApplicationDocument[]> {
  if (!isApiAuthMode()) return [];
  const rows = await listAdmissionDocuments(applicationId);
  return rows.map(admissionDocumentDtoToPortal);
}

export async function uploadApplicationDocument(input: {
  applicationId: string;
  instituteId: string;
  type: DocumentType;
  file: File;
}): Promise<ApplicationDocument> {
  if (!isApiAuthMode()) {
    return uploadDocumentDemo(input.applicationId, input.type, input.file.name);
  }

  const asset = await uploadAdmissionAsset({
    instituteId: input.instituteId,
    file: input.file,
    linkedEntityKind: "admission_document",
  });

  const label = ADMISSION_DOC_LABELS[input.type];
  const existing = await listAdmissionDocuments(input.applicationId);
  const match = existing.find((d) => d.docType === portalDocTypeToApi(input.type));

  if (match) {
    const updated = await updateAdmissionDocument(match.id, {
      fileName: input.file.name,
      assetPath: asset.objectPath,
      status: "uploaded",
    });
    return admissionDocumentDtoToPortal(updated);
  }

  const created = await createAdmissionDocument(input.applicationId, {
    docType: portalDocTypeToApi(input.type),
    label,
    fileName: input.file.name,
    assetPath: asset.objectPath,
  });
  return admissionDocumentDtoToPortal(created);
}

export async function verifyApplicationDocument(input: {
  documentId: string;
  status: "verified" | "rejected" | "resubmission_required" | "under_review";
  note?: string;
}): Promise<ApplicationDocument> {
  if (!isApiAuthMode()) {
    throw new Error("Document verification requires API auth mode");
  }
  const updated = await updateAdmissionDocument(input.documentId, {
    status: input.status,
    note: input.note,
  });
  return admissionDocumentDtoToPortal(updated);
}

export async function openAdmissionDocumentPreview(input: {
  documentId: string;
}): Promise<string | null> {
  if (!isApiAuthMode()) return null;
  const { signedUrl } = await getAdmissionDocumentSignedUrl(input.documentId);
  return signedUrl;
}
