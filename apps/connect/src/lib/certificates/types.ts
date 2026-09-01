export type IssuedCertificateStatus = "issued" | "revoked" | "superseded";

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
  fileKind: "pdf" | "html" | "pptx" | null;
  createdAt: string;
  updatedAt: string;
};

export type ListIssuedCertificatesParams = {
  instituteId: string;
  studentId?: string;
  status?: IssuedCertificateStatus;
};

export type PublicCertificateVerifyDto = {
  valid: boolean;
  instituteId: string;
  instituteName: string;
  certificateNumber: string;
  title: string;
  recipientName: string;
  category: string | null;
  templateName: string;
  status: string;
  issuedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
};

export type LearnerCertificateRecord = {
  id: string;
  title: string;
  refNo: string;
  issuer: string;
  issuedOn: string;
  category: "academic" | "sports" | "cultural" | "technical";
  description: string;
  studentId: string | null;
  hasDownload: boolean;
  verifyUrl: string;
};
