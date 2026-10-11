import type { IssuedCertificateDto, IssuedCertificateHistoryItem } from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

/**
 * Display label for history. When `assetPath` is null (hybrid metadata-only
 * issue), do not invent a downloadable filename like `certificate.pptx`.
 */
export function fileNameFromDto(dto: IssuedCertificateDto): string {
  if (dto.assetPath?.trim()) {
    const parts = dto.assetPath.split("/");
    return parts[parts.length - 1] || dto.assetPath;
  }
  if (dto.fileKind === "pptx" || dto.fileKind === "html") {
    return "Ledger only (no server file)";
  }
  return "—";
}

export function issuedCertificateDtoToHistoryItem(
  dto: IssuedCertificateDto,
): IssuedCertificateHistoryItem {
  const categoryName = dto.category?.trim() || "Uncategorized";
  return {
    id: dto.id,
    certificateNumber: dto.certificateNumber,
    sequence: dto.sequence,
    year: dto.year,
    studentId: dto.studentId,
    studentName: dto.recipientName,
    admissionNumber: dto.recipientRef?.trim() || undefined,
    categoryId: categoryName.toLowerCase().replace(/\s+/g, "-"),
    categoryName,
    templateId: dto.templateId,
    templateFamilyId: dto.templateId,
    templateVersion: dto.templateVersion,
    templateName: dto.templateName,
    issuedAt: dto.issuedAt,
    issuedById: dto.issuedByUserId,
    issuedByName: shortRef(dto.issuedByUserId, "User"),
    fileName: fileNameFromDto(dto),
    fileKind: dto.fileKind,
    status: dto.status,
    hasServerFile: Boolean(dto.assetPath?.trim()),
  };
}

export function issuedCertificateDtosToHistoryItems(
  rows: IssuedCertificateDto[],
): IssuedCertificateHistoryItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Certificates API response must be an array");
  }
  return rows.map(issuedCertificateDtoToHistoryItem);
}
