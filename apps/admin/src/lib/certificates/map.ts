import type { IssuedCertificateDto, IssuedCertificateHistoryItem } from "./types";

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

function fileNameFromDto(dto: IssuedCertificateDto): string {
  if (dto.assetPath?.trim()) {
    const parts = dto.assetPath.split("/");
    return parts[parts.length - 1] || dto.assetPath;
  }
  if (dto.fileKind) return `certificate.${dto.fileKind}`;
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
