import type { AdmissionDocumentDto } from "./api/types";
import type { ApplicationDocument, DocumentType } from "./types";

const DOC_LABELS: Record<DocumentType, string> = {
  birth_certificate: "Birth certificate",
  transfer_certificate: "Transfer certificate",
  marks_memo: "Marks memo",
  student_photo: "Student photo",
  parent_id: "Parent ID",
  additional: "Additional document",
};

export function admissionDocTypeToPortal(type: AdmissionDocumentDto["docType"]): DocumentType {
  return type;
}

export function admissionDocumentDtoToPortal(
  dto: AdmissionDocumentDto,
): ApplicationDocument {
  return {
    id: dto.id,
    type: admissionDocTypeToPortal(dto.docType),
    label: dto.label?.trim() || DOC_LABELS[admissionDocTypeToPortal(dto.docType)],
    fileName: dto.fileName ?? undefined,
    status: mapPortalStatus(dto.status),
    uploadedAt: dto.updatedAt.slice(0, 10),
    note: dto.note ?? undefined,
    assetPath: dto.assetPath ?? undefined,
    assetId: undefined,
    verificationTimeline: [
      {
        id: `vt-${dto.id}`,
        status: dto.status,
        at: dto.updatedAt,
      },
    ],
  };
}

function mapPortalStatus(
  status: AdmissionDocumentDto["status"],
): ApplicationDocument["status"] {
  return status;
}

export function portalDocTypeToApi(type: DocumentType): AdmissionDocumentDto["docType"] {
  return type;
}

export function formatDocCountSummary(docs: AdmissionDocumentDto[]): string {
  if (docs.length === 0) return "0/0";
  const verified = docs.filter((d) => d.status === "verified").length;
  return `${verified}/${docs.length}`;
}

export { DOC_LABELS as ADMISSION_DOC_LABELS };
