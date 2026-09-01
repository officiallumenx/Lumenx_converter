import type { IssuedCertificateDto, LearnerCertificateRecord } from "./types";
import { buildCertificateVerifyUrl } from "./verify-url";

function mapCategory(raw: string | null): LearnerCertificateRecord["category"] {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("sport")) return "sports";
  if (value.includes("cultural") || value.includes("arts")) return "cultural";
  if (value.includes("tech")) return "technical";
  return "academic";
}

function formatIssuedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function issuedCertificateDtoToLearnerRecord(
  row: IssuedCertificateDto,
  origin = "",
): LearnerCertificateRecord {
  return {
    id: row.id,
    title: row.title,
    refNo: row.certificateNumber,
    issuer: row.templateName,
    issuedOn: formatIssuedDate(row.issuedAt),
    category: mapCategory(row.category),
    description: `${row.templateName} · awarded to ${row.recipientName}`,
    studentId: row.studentId,
    hasDownload: Boolean(row.assetPath),
    verifyUrl: buildCertificateVerifyUrl(origin, row.instituteId, row.certificateNumber),
  };
}

export function issuedCertificateDtosToLearnerRecords(
  rows: IssuedCertificateDto[],
  origin = "",
): LearnerCertificateRecord[] {
  return rows
    .filter((row) => row.status === "issued")
    .map((row) => issuedCertificateDtoToLearnerRecord(row, origin));
}
