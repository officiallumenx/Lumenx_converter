/** Connect reader for Admin-issued certificate history. Does not regenerate from newer Nexus versions. */

import { resolveCanonicalStudentId } from "@lumenx/utils";
import type { StudentCertificateRecord } from "@/lib/student/mock-data";

export const SHARED_ISSUED_CERTIFICATES_KEY = "lumenx.shared.issued-certificates.v1";
export const SHARED_ISSUED_CERTIFICATES_MESSAGE = "lumenx-issued-certificates-sync";

type SharedIssuedCertificateRow = {
  id: string;
  studentId: string;
  aliases?: string[];
  title: string;
  categoryName: string;
  templateName: string;
  templateVersion: number;
  certificateNumber: string;
  issuedOn: string;
  issuedBy: string;
  fileName?: string;
  status?: string;
};

type SharedIssuedCertificateSnapshot = {
  updatedAt: string;
  certificates: SharedIssuedCertificateRow[];
};

function readSnapshot(): SharedIssuedCertificateSnapshot | null {
  try {
    const raw = localStorage.getItem(SHARED_ISSUED_CERTIFICATES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SharedIssuedCertificateSnapshot;
    if (!Array.isArray(parsed.certificates)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function portalCategory(
  name: string,
): StudentCertificateRecord["category"] {
  const value = name.toLowerCase();
  if (value.includes("sport")) return "sports";
  if (value.includes("cultural") || value.includes("art")) return "cultural";
  if (value.includes("tech") || value.includes("science")) return "technical";
  return "academic";
}

function formatIssuedOn(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toStudentRecord(row: SharedIssuedCertificateRow): StudentCertificateRecord {
  return {
    id: row.id,
    title: row.title || row.templateName,
    category: portalCategory(row.categoryName),
    issuedOn: formatIssuedOn(row.issuedOn),
    issuer: row.issuedBy || "Admin",
    refNo: row.certificateNumber,
    description: `${row.categoryName} · ${row.templateName} v${row.templateVersion}${
      row.fileName ? ` · ${row.fileName}` : ""
    }`,
  };
}

function matchesLearner(row: SharedIssuedCertificateRow, learnerId: string): boolean {
  const canonical = resolveCanonicalStudentId(learnerId);
  if (row.studentId === learnerId || row.studentId === canonical) return true;
  return (row.aliases ?? []).includes(learnerId) || (row.aliases ?? []).includes(canonical);
}

export function issuedCertificatesForLearner(learnerId: string): StudentCertificateRecord[] {
  const snapshot = readSnapshot();
  if (!snapshot) return [];
  return snapshot.certificates
    .filter((row) => matchesLearner(row, learnerId))
    .map(toStudentRecord);
}

/** Admin-issued records first, then existing portal demo rows that are not the same number. */
export function mergeIssuedCertificates(
  learnerId: string,
  existing: StudentCertificateRecord[],
): StudentCertificateRecord[] {
  const issued = issuedCertificatesForLearner(learnerId);
  if (issued.length === 0) return existing;
  const issuedRefs = new Set(issued.map((row) => row.refNo.toLowerCase()));
  return [...issued, ...existing.filter((row) => !issuedRefs.has(row.refNo.toLowerCase()))];
}
