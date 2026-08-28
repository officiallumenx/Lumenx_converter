export type IssuedCertificateStatus = "issued" | "revoked" | "superseded";

export type IssuedCertificateFileKind = "pdf" | "html" | "pptx";

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

export type ListIssuedCertificatesParams = {
  instituteId: string;
  studentId?: string;
  status?: IssuedCertificateStatus;
  templateId?: string;
};

export type IssuedCertificateHistoryItem = {
  id: string;
  certificateNumber: string;
  sequence: number;
  year: number;
  studentId: string | null;
  studentName: string;
  admissionNumber?: string;
  categoryId: string;
  categoryName: string;
  templateId: string;
  templateFamilyId: string;
  templateVersion: number;
  templateName: string;
  issuedAt: string;
  issuedById: string;
  issuedByName: string;
  fileName: string;
  fileKind: IssuedCertificateFileKind | null;
  bundleFileName?: string;
  status: IssuedCertificateStatus;
};
