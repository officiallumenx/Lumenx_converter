export type TemplateKind = "certificate" | "report" | "id_card" | "document";

export type TemplateSource = "system" | "custom" | "imported";

export type TemplateStatus = "active" | "archived" | "draft";

export type PreviewDevice = "desktop" | "tablet" | "mobile" | "print";

export type TemplateBlockType =
  | "header"
  | "footer"
  | "logo"
  | "seal"
  | "signature"
  | "section"
  | "text"
  | "variable"
  | "image"
  | "table"
  | "qr"
  | "barcode"
  | "watermark";

export type TemplateBlock = {
  id: string;
  type: TemplateBlockType;
  label: string;
  content?: string;
  variable?: string;
};

/** Rich visual certificate / ID layouts (Canva-style) — one theme per document type */
export type VisualThemeId =
  | "achievement_elegant"
  | "bonafide_ornate"
  | "conduct_classic"
  | "sports_medal"
  | "science_modern"
  | "participation_colorful"
  | "transfer_official"
  | "report_card_modern"
  | "annual_report_formal"
  | "marksheet_grid"
  | "student_id_blue"
  | "teacher_id_professional";

export type VisualTemplateFields = {
  titleMain: string;
  titleSub: string;
  presentationLine: string;
  bodyText: string;
  showStudentPhoto: boolean;
  studentPhotoUrl: string;
  signatoryLeftName: string;
  signatoryLeftTitle: string;
  signatoryRightName: string;
  signatoryRightTitle: string;
  /** Optional per-template logo override (data URL or https URL). Omit to use institute logo. */
  logoOverrideUrl?: string;
  /** Document / certificate number prefix. e.g. "LXA/CERT/2026/" */
  documentNumberPrefix?: string;
  /** Validity in days from issue date. 0 = no expiry. */
  validityDays?: number;
};

export type TemplateRecord = {
  id: string;
  name: string;
  kind: TemplateKind;
  categoryId: string;
  source: TemplateSource;
  status: TemplateStatus;
  tags: string[];
  favorite: boolean;
  usageCount: number;
  version: number;
  updatedAt: string;
  createdAt: string;
  description: string;
  blocks: TemplateBlock[];
  previewAspect: "a4" | "id_card" | "letter";
  layoutMode?: "blocks" | "visual";
  visualTheme?: VisualThemeId;
  visualFields?: VisualTemplateFields;
};

// ─── Publishing workflow ──────────────────────────────────────────────────────

export type WorkflowState =
  | "draft"           // just generated, awaiting review/publish
  | "teacher_review"  // report only: waiting for teacher sign-off
  | "admin_review"    // report only: waiting for admin approval
  | "published"       // visible in portals
  | "rejected";       // rejected at any stage

export type WorkflowEvent = {
  state: WorkflowState;
  actor: string;
  at: string;
  comment?: string;
};

export type PortalVisibility = {
  student: boolean;
  parent: boolean;
  teacher: boolean;
};

export type MockNotification = {
  id: string;
  documentId: string;
  documentName: string;
  recipientName: string;
  recipientPortal: "student" | "parent" | "teacher";
  channel: "in_app" | "email" | "sms";
  sentAt: string;
  readAt: string | null;
};

// ─── Generated document ───────────────────────────────────────────────────────

export type GeneratedDocument = {
  id: string;
  templateId: string;
  templateName: string;
  kind: TemplateKind;
  recipientName: string;
  recipientRef: string;
  generatedAt: string;
  generatedBy: string;
  batchId?: string;
  status: "ready" | "archived";
  certificateNumber?: string;

  // Publishing workflow
  workflowState: WorkflowState;
  workflowHistory: WorkflowEvent[];
  publishedAt: string | null;
  portalVisibility: PortalVisibility;
  notificationsSent: boolean;
  notificationCount: number;
  rejectionReason: string | null;
  notifications: MockNotification[];

  // ── Version management ─────────────────────────────────────────────────────
  /** Groups all versions of the same logical document (same recipient + purpose). */
  documentGroupId: string;
  /** Version number — 1, 2, 3… Increments each time a corrected version is published. */
  versionNumber: number;
  /** True for the version currently visible in portals. Only one per group. */
  isCurrentVersion: boolean;
  /** Human-readable summary of what changed in this version (empty for v1). */
  versionChanges: string;
  /** Admin-internal note attached to this version. */
  versionNote: string;
};

// ─── Version diff (for compare feature) ──────────────────────────────────────

export type VersionDiffField = {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  changed: boolean;
};

export type VersionDiff = {
  older: GeneratedDocument;
  newer: GeneratedDocument;
  fields: VersionDiffField[];
};

export type TemplateActivity = {
  id: string;
  action: "created" | "duplicated" | "generated" | "imported" | "archived" | "edited";
  templateName: string;
  detail?: string;
  at: string;
  actor: string;
};

export type TemplateCategoryGroup = {
  id: string;
  label: string;
  items: { id: string; label: string }[];
};

export type TemplateVariable = {
  key: string;
  label: string;
  sample: string;
};

export type TemplateHubView =
  | "dashboard"
  | "library"
  | "certificates"
  | "reports"
  | "id_cards"
  | "documents"
  | "builder"
  | "imports"
  | "generate"
  | "generated"
  | "categories"
  | "settings";

export type ImportStep = "upload" | "detect" | "map" | "preview" | "save";

export type TemplateImportJob = {
  id: string;
  fileName: string;
  format: "docx" | "pdf" | "png" | "jpg" | "jpeg";
  step: ImportStep;
  uploadedAt: string;
  mappedVariables: string[];
};
