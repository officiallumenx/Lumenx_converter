import type { CertificateTemplate, CertificateTemplateStatus } from "./types";

/** Shape returned by GET /api/v1/certificates/platform-templates */
export type PlatformCertificateTemplateApiDto = {
  id: string;
  familyId: string;
  name: string;
  description: string | null;
  category: string | null;
  status: "draft" | "active" | "archived";
  source: string;
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

function mapStatus(
  status: PlatformCertificateTemplateApiDto["status"],
): CertificateTemplateStatus {
  if (status === "active") return "published";
  if (status === "archived") return "archived";
  return "draft";
}

/**
 * Map DB/API platform template DTO into the Nexus catalog template shape.
 * Does not embed PPTX bytes (use signed-url for file access).
 */
export function mapPlatformDtoToCertificateTemplate(
  dto: PlatformCertificateTemplateApiDto,
): CertificateTemplate {
  const meta = dto.pptxMeta ?? {};
  const format =
    meta.format === "ppt" || meta.format === "pptx" ? meta.format : "pptx";
  const targets = Array.isArray(meta.targets) ? meta.targets : [];
  const mappings = Array.isArray(meta.mappings) ? meta.mappings : [];

  return {
    id: dto.id,
    familyId: dto.familyId,
    name: dto.name,
    categoryId: dto.category || "uncategorized",
    description: dto.description || "",
    version: dto.version,
    status: mapStatus(dto.status),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    publishedAt: dto.status === "active" ? dto.updatedAt : undefined,
    archivedAt: dto.status === "archived" ? dto.updatedAt : undefined,
    file: {
      fileName: dto.fileName || "template.pptx",
      format,
      sizeBytes: dto.fileByteSize ?? 0,
    },
    targets: targets as CertificateTemplate["targets"],
    mappings: mappings as CertificateTemplate["mappings"],
  };
}
