/** Issued certificate ledger types (step 5.2). */

export type IssuedCertificateStatus = "issued" | "revoked" | "superseded";

export type IssuedCertificateFileKind = "pdf" | "html" | "pptx";

export type IssuedCertificateRow = {
  id: string;
  institute_id: string;
  generated_document_id: string | null;
  template_id: string;
  student_id: string | null;
  teacher_id: string | null;
  certificate_number: string;
  sequence: number;
  year: number;
  title: string;
  category: string | null;
  template_name: string;
  template_version: number;
  recipient_name: string;
  recipient_ref: string | null;
  status: IssuedCertificateStatus;
  issued_at: string;
  issued_by_user_id: string;
  revoked_at: string | null;
  revoked_by_user_id: string | null;
  revoke_reason: string | null;
  asset_path: string | null;
  file_kind: IssuedCertificateFileKind | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type IssuedCertificateDto = {
  id: string;
  instituteId: string;
  generatedDocumentId: string | null;
  templateId: string;
  studentId: string | null;
  teacherId: string | null;
  certificateNumber: string;
  sequence: number;
  year: number;
  title: string;
  category: string | null;
  templateName: string;
  templateVersion: number;
  recipientName: string;
  recipientRef: string | null;
  status: IssuedCertificateStatus;
  issuedAt: string;
  issuedByUserId: string;
  revokedAt: string | null;
  revokedByUserId: string | null;
  revokeReason: string | null;
  assetPath: string | null;
  fileKind: IssuedCertificateFileKind | null;
  createdAt: string;
  updatedAt: string;
};

export type ListIssuedCertificatesFilter = {
  instituteId: string;
  studentId?: string;
  status?: IssuedCertificateStatus;
  templateId?: string;
};

export type IssueCertificateInput = {
  instituteId: string;
  /** Preferred path: issue from a published certificate generated_document. */
  generatedDocumentId?: string;
  /** Direct issue (when no generated_document yet). Requires templateId. */
  templateId?: string;
  studentId?: string | null;
  teacherId?: string | null;
  title?: string;
  category?: string | null;
  recipientName?: string;
  recipientRef?: string | null;
  /** Optional override; otherwise CERT/{year}/{paddedSeq}. */
  certificateNumber?: string;
  year?: number;
  assetPath?: string | null;
  fileKind?: IssuedCertificateFileKind | null;
};

export type RevokeCertificateInput = {
  reason: string;
  /** Defaults to revoked; use superseded when replacing with a new issue. */
  status?: "revoked" | "superseded";
};
