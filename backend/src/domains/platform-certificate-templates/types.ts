/** Platform-owned Nexus PPTX certificate templates (DB source of truth). */

export type PlatformTemplateStatus = "draft" | "active" | "archived";

export type PlatformCertificateTemplateRow = {
  id: string;
  owner_scope: "platform";
  institute_id: null;
  type: "certificate";
  name: string;
  description: string | null;
  category: string | null;
  status: PlatformTemplateStatus;
  source: "system" | "custom" | "imported";
  version: number;
  family_id: string;
  preview_aspect: string;
  layout_mode: "pptx";
  blocks: unknown;
  visual_theme: string | null;
  visual_fields: unknown | null;
  tags: unknown;
  asset_path: string | null;
  file_name: string | null;
  file_byte_size: number | null;
  file_content_type: string | null;
  pptx_meta: Record<string, unknown>;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PlatformCertificateTemplateDto = {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: PlatformTemplateStatus;
  source: "system" | "custom" | "imported";
  version: number;
  layoutMode: "pptx";
  fileName: string | null;
  fileByteSize: number | null;
  fileContentType: string | null;
  assetPath: string | null;
  hasFile: boolean;
  pptxMeta: Record<string, unknown>;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlatformCertificateTemplateInput = {
  name: string;
  description?: string | null;
  category?: string | null;
  pptxMeta?: Record<string, unknown>;
  /** Optional stable family; defaults to new template id. */
  familyId?: string;
};

export type UpdatePlatformCertificateTemplateInput = {
  name?: string;
  description?: string | null;
  category?: string | null;
  pptxMeta?: Record<string, unknown>;
};

export type ImportPlatformCertificateTemplateInput = {
  name: string;
  description?: string | null;
  category?: string | null;
  version?: number;
  familyId?: string;
  status?: "draft" | "active" | "archived";
  pptxMeta?: Record<string, unknown>;
  /** Base64 PPTX/PPT bytes (opt-in import; not from production browser automatically). */
  fileBase64?: string;
  fileName?: string;
  contentType?: string;
};

export const PLATFORM_CERTIFICATE_TEMPLATE_BUCKET = "certificate-templates";
export const PLATFORM_CERTIFICATE_MAX_BYTES = 5 * 1024 * 1024;

export const PLATFORM_CERTIFICATE_ALLOWED_CONTENT_TYPES = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/octet-stream",
] as const;
