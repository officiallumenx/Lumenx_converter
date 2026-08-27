/** Documents / templates foundation types (template + generated_document). */

export type TemplateOwnerScope = "platform" | "institute";

export type TemplateType =
  | "certificate"
  | "report"
  | "id_card"
  | "document";

export type TemplateStatus = "draft" | "active" | "archived";

export type TemplateSource = "system" | "custom" | "imported";

export type TemplatePreviewAspect = "a4" | "id_card" | "letter";

export type TemplateLayoutMode = "blocks" | "visual";

export type GeneratedDocumentStatus = "ready" | "archived";

export type GeneratedWorkflowState =
  | "draft"
  | "teacher_review"
  | "admin_review"
  | "published"
  | "rejected";

export type TemplateRow = {
  id: string;
  owner_scope: TemplateOwnerScope;
  institute_id: string | null;
  type: TemplateType;
  name: string;
  description: string | null;
  category: string | null;
  status: TemplateStatus;
  source: TemplateSource;
  version: number;
  preview_aspect: TemplatePreviewAspect;
  layout_mode: TemplateLayoutMode;
  blocks: unknown;
  visual_theme: string | null;
  visual_fields: unknown | null;
  tags: unknown;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type TemplateDto = {
  id: string;
  ownerScope: TemplateOwnerScope;
  instituteId: string | null;
  type: TemplateType;
  name: string;
  description: string | null;
  category: string | null;
  status: TemplateStatus;
  source: TemplateSource;
  version: number;
  previewAspect: TemplatePreviewAspect;
  layoutMode: TemplateLayoutMode;
  blocks: unknown;
  visualTheme: string | null;
  visualFields: unknown | null;
  tags: unknown;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GeneratedDocumentRow = {
  id: string;
  institute_id: string;
  template_id: string;
  type: TemplateType;
  title: string;
  student_id: string | null;
  teacher_id: string | null;
  recipient_name: string;
  recipient_ref: string | null;
  status: GeneratedDocumentStatus;
  workflow_state: GeneratedWorkflowState;
  certificate_number: string | null;
  portal_student: boolean;
  portal_parent: boolean;
  portal_teacher: boolean;
  rejection_reason: string | null;
  payload: unknown;
  asset_path: string | null;
  generated_by_user_id: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type GeneratedDocumentDto = {
  id: string;
  instituteId: string;
  templateId: string;
  type: TemplateType;
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

export type ListTemplatesFilter = {
  instituteId: string;
  type?: TemplateType;
  status?: TemplateStatus;
  ownerScope?: TemplateOwnerScope;
};

export type CreateTemplateInput = {
  instituteId: string;
  type: TemplateType;
  name: string;
  description?: string | null;
  category?: string | null;
  source?: TemplateSource;
  previewAspect?: TemplatePreviewAspect;
  layoutMode?: TemplateLayoutMode;
  blocks?: unknown;
  visualTheme?: string | null;
  visualFields?: unknown | null;
  tags?: unknown;
  activateNow?: boolean;
};

export type UpdateTemplateInput = {
  name?: string;
  description?: string | null;
  category?: string | null;
  previewAspect?: TemplatePreviewAspect;
  layoutMode?: TemplateLayoutMode;
  blocks?: unknown;
  visualTheme?: string | null;
  visualFields?: unknown | null;
  tags?: unknown;
};

export type ListGeneratedFilter = {
  instituteId: string;
  type?: TemplateType;
  workflowState?: GeneratedWorkflowState;
  studentId?: string;
  templateId?: string;
};

export type CreateGeneratedInput = {
  instituteId: string;
  templateId: string;
  title?: string;
  studentId?: string | null;
  teacherId?: string | null;
  recipientName: string;
  recipientRef?: string | null;
  certificateNumber?: string | null;
  payload?: unknown;
};

export type TransitionGeneratedInput = {
  workflowState: GeneratedWorkflowState;
  rejectionReason?: string | null;
};
