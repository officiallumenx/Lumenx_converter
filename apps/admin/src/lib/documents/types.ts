export type DocumentTemplateType =
  | "certificate"
  | "report"
  | "id_card"
  | "document";

export type DocumentTemplateStatus = "draft" | "active" | "archived";

export type DocumentTemplateSource = "system" | "custom" | "imported";

export type DocumentTemplatePreviewAspect = "a4" | "id_card" | "letter";

export type DocumentTemplateLayoutMode = "blocks" | "visual";

export type GeneratedDocumentStatus = "ready" | "archived";

export type GeneratedWorkflowState =
  | "draft"
  | "teacher_review"
  | "admin_review"
  | "published"
  | "rejected";

export type DocumentTemplateDto = {
  id: string;
  ownerScope: "platform" | "institute";
  instituteId: string | null;
  type: DocumentTemplateType;
  name: string;
  description: string | null;
  category: string | null;
  status: DocumentTemplateStatus;
  source: DocumentTemplateSource;
  version: number;
  previewAspect: DocumentTemplatePreviewAspect;
  layoutMode: DocumentTemplateLayoutMode;
  blocks: unknown;
  visualTheme: string | null;
  visualFields: unknown | null;
  tags: unknown;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedDocumentDto = {
  id: string;
  instituteId: string;
  templateId: string;
  type: DocumentTemplateType;
  title: string;
  studentId: string | null;
  teacherId: string | null;
  recipientName: string;
  recipientRef: string | null;
  status: GeneratedDocumentStatus;
  workflowState: GeneratedWorkflowState;
  certificateNumber: string | null;
  portalVisibility: {
    student: boolean;
    parent: boolean;
    teacher: boolean;
  };
  rejectionReason: string | null;
  payload: unknown;
  assetPath: string | null;
  generatedByUserId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListDocumentTemplatesParams = {
  instituteId: string;
  type?: DocumentTemplateType;
  status?: DocumentTemplateStatus;
};

export type ListGeneratedDocumentsParams = {
  instituteId: string;
  type?: DocumentTemplateType;
  workflowState?: GeneratedWorkflowState;
};
