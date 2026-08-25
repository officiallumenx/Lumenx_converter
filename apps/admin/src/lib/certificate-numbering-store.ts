/**
 * Per-institute certificate numbering + issued history ledger.
 * Format is configurable; issued numbers, template version, and identity fields are immutable.
 */
import { readAdminDataScopeKey } from "@/lib/admin-tenant";
import { CONNECT_LEARNER_TO_STUDENT_ID } from "@lumenx/utils";
import {
  DEFAULT_CERTIFICATE_NUMBER_DIGITS,
  DEFAULT_CERTIFICATE_NUMBER_FORMAT,
  certificateNumberFormatError,
  clampCertificateNumberDigits,
  formatCertificateNumber,
  normalizeCertificateNumberFormat,
} from "@lumenx/module-certificates";
import type { CertificateTemplate } from "@lumenx/module-certificates";

export const CERTIFICATE_NUMBERING_CHANGED_EVENT =
  "lumenx-admin-certificate-numbering-changed";

export const SHARED_ISSUED_CERTIFICATES_KEY = "lumenx.shared.issued-certificates.v1";
export const SHARED_ISSUED_CERTIFICATES_MESSAGE = "lumenx-issued-certificates-sync";

const KEY_PREFIX = "lumenx.admin.certificate-numbering.v1";

export type IssuedCertificateStatus = "issued";
export type IssuedCertificateFileKind = "pptx" | "html";

export type IssuedCertificateRecord = {
  id: string;
  certificateNumber: string;
  sequence: number;
  year: number;
  studentId: string;
  studentName: string;
  admissionNumber?: string;
  categoryId: string;
  categoryName: string;
  templateId: string;
  templateFamilyId: string;
  templateVersion: number;
  templateName: string;
  issuedAt: string;
  issuedById: string;
  issuedByName: string;
  fileName: string;
  fileKind: IssuedCertificateFileKind;
  bundleFileName?: string;
  status: IssuedCertificateStatus;
};

export type SharedIssuedCertificateRow = {
  id: string;
  studentId: string;
  aliases: string[];
  title: string;
  categoryName: string;
  templateName: string;
  templateVersion: number;
  certificateNumber: string;
  issuedOn: string;
  issuedBy: string;
  fileName: string;
  status: IssuedCertificateStatus;
};

export type CertificateNumberingState = {
  version: 1;
  format: string;
  digits: number;
  sequenceByYear: Record<string, number>;
  issued: IssuedCertificateRecord[];
};

function storageKey(): string {
  return `${KEY_PREFIX}.${readAdminDataScopeKey()}`;
}

function emptyState(): CertificateNumberingState {
  return {
    version: 1,
    format: DEFAULT_CERTIFICATE_NUMBER_FORMAT,
    digits: DEFAULT_CERTIFICATE_NUMBER_DIGITS,
    sequenceByYear: {},
    issued: [],
  };
}

function normalizeIssuedRecord(row: Partial<IssuedCertificateRecord>): IssuedCertificateRecord | null {
  const certificateNumber = row.certificateNumber?.trim();
  if (!certificateNumber) return null;
  return {
    id: row.id?.trim() || `iss-${certificateNumber}`,
    certificateNumber,
    sequence: typeof row.sequence === "number" ? row.sequence : 0,
    year: typeof row.year === "number" ? row.year : new Date(row.issuedAt ?? Date.now()).getFullYear(),
    studentId: row.studentId ?? "",
    studentName: row.studentName ?? "",
    admissionNumber: row.admissionNumber,
    categoryId: row.categoryId ?? "",
    categoryName: row.categoryName?.trim() || "Uncategorised",
    templateId: row.templateId ?? "",
    templateFamilyId: row.templateFamilyId ?? row.templateId ?? "",
    templateVersion: typeof row.templateVersion === "number" ? row.templateVersion : 1,
    templateName: row.templateName ?? "Certificate",
    issuedAt: row.issuedAt ?? new Date().toISOString(),
    issuedById: row.issuedById ?? "admin",
    issuedByName: row.issuedByName?.trim() || "Admin",
    fileName: row.fileName ?? "",
    fileKind: row.fileKind === "html" ? "html" : "pptx",
    bundleFileName: row.bundleFileName,
    status: "issued",
  };
}

function normalizeState(raw: unknown): CertificateNumberingState {
  const empty = emptyState();
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<CertificateNumberingState>;
  const issued = Array.isArray(data.issued)
    ? data.issued
        .map((row) => normalizeIssuedRecord(row as Partial<IssuedCertificateRecord>))
        .filter((row): row is IssuedCertificateRecord => Boolean(row))
    : [];
  return {
    version: 1,
    format: normalizeCertificateNumberFormat(data.format ?? empty.format),
    digits: clampCertificateNumberDigits(data.digits),
    sequenceByYear:
      data.sequenceByYear && typeof data.sequenceByYear === "object" ? { ...data.sequenceByYear } : {},
    issued,
  };
}

function aliasesForStudentId(studentId: string): string[] {
  return Object.entries(CONNECT_LEARNER_TO_STUDENT_ID)
    .filter(([, canonical]) => canonical === studentId)
    .map(([alias]) => alias);
}

function publishSharedIssuedCertificates(issued: IssuedCertificateRecord[]): void {
  if (typeof localStorage === "undefined") return;
  const snapshot = {
    updatedAt: new Date().toISOString(),
    certificates: issued.map(
      (row): SharedIssuedCertificateRow => ({
        id: row.id,
        studentId: row.studentId,
        aliases: aliasesForStudentId(row.studentId),
        title: row.templateName,
        categoryName: row.categoryName,
        templateName: row.templateName,
        templateVersion: row.templateVersion,
        certificateNumber: row.certificateNumber,
        issuedOn: row.issuedAt,
        issuedBy: row.issuedByName,
        fileName: row.fileName,
        status: row.status,
      }),
    ),
  };
  try {
    localStorage.setItem(SHARED_ISSUED_CERTIFICATES_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private mode.
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SHARED_ISSUED_CERTIFICATES_MESSAGE));
  }
}

function readState(): CertificateNumberingState {
  if (typeof localStorage === "undefined") return emptyState();
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return emptyState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

function writeState(next: CertificateNumberingState): CertificateNumberingState {
  const snapshot: CertificateNumberingState = {
    version: 1,
    format: next.format,
    digits: next.digits,
    sequenceByYear: { ...next.sequenceByYear },
    issued: next.issued.map((row) => ({ ...row })),
  };
  try {
    localStorage.setItem(storageKey(), JSON.stringify(snapshot));
  } catch {
    // Ignore quota / private mode.
  }
  publishSharedIssuedCertificates(snapshot.issued);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CERTIFICATE_NUMBERING_CHANGED_EVENT));
  }
  return snapshot;
}

function newIssuedId(): string {
  return `iss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function usedNumbers(state: CertificateNumberingState): Set<string> {
  return new Set(state.issued.map((row) => row.certificateNumber));
}

function nextUniqueNumbers(
  state: CertificateNumberingState,
  count: number,
  at: Date,
): Array<{ sequence: number; year: number; certificateNumber: string }> {
  const year = at.getFullYear();
  const yearKey = String(year);
  const used = usedNumbers(state);
  let sequence = state.sequenceByYear[yearKey] ?? 0;
  const out: Array<{ sequence: number; year: number; certificateNumber: string }> = [];
  let guard = 0;

  while (out.length < count) {
    sequence += 1;
    guard += 1;
    if (guard > 10_000) {
      throw new Error("Could not allocate a unique certificate number");
    }
    const certificateNumber = formatCertificateNumber({
      format: state.format,
      digits: state.digits,
      year,
      sequence,
    });
    if (used.has(certificateNumber)) continue;
    used.add(certificateNumber);
    out.push({ sequence, year, certificateNumber });
  }

  return out;
}

function sortIssuedNewest(rows: IssuedCertificateRecord[]): IssuedCertificateRecord[] {
  return [...rows].sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime(),
  );
}

export function loadCertificateNumbering(): Pick<CertificateNumberingState, "format" | "digits"> {
  const state = readState();
  return { format: state.format, digits: state.digits };
}

export function listIssuedCertificates(): IssuedCertificateRecord[] {
  return sortIssuedNewest(readState().issued);
}

export function listIssuedCertificatesForStudent(studentId: string): IssuedCertificateRecord[] {
  const id = studentId.trim().toLowerCase();
  return sortIssuedNewest(
    readState().issued.filter((row) => row.studentId.trim().toLowerCase() === id),
  );
}

/** Next numbers for preview only. Does not consume the sequence. */
export function peekCertificateNumbers(count: number, at = new Date()): string[] {
  if (count <= 0) return [];
  const state = readState();
  return nextUniqueNumbers(state, count, at).map((item) => item.certificateNumber);
}

export function saveCertificateNumberFormat(
  format: string,
  digits: number,
): { format: string; digits: number } {
  const error = certificateNumberFormatError(format);
  if (error) throw new Error(error);
  const state = readState();
  const next = writeState({
    ...state,
    format: normalizeCertificateNumberFormat(format),
    digits: clampCertificateNumberDigits(digits),
    issued: state.issued,
  });
  return { format: next.format, digits: next.digits };
}

export type AllocateCertificateIssueRow = {
  studentId: string;
  studentName: string;
  admissionNumber?: string;
};

/**
 * Consume sequential numbers and append issued records.
 * Existing records (number, template version, identity) are never rewritten.
 */
export function allocateIssuedCertificates(input: {
  template: Pick<CertificateTemplate, "id" | "familyId" | "version" | "name" | "categoryId">;
  categoryName: string;
  issuedBy: { id: string; name: string };
  rows: AllocateCertificateIssueRow[];
  at?: Date;
}): IssuedCertificateRecord[] {
  if (input.rows.length === 0) return [];
  const at = input.at ?? new Date();
  const state = readState();
  const allocated = nextUniqueNumbers(state, input.rows.length, at);
  const issuedAt = at.toISOString();
  const created: IssuedCertificateRecord[] = input.rows.map((row, index) => {
    const slot = allocated[index]!;
    return {
      id: newIssuedId(),
      certificateNumber: slot.certificateNumber,
      sequence: slot.sequence,
      year: slot.year,
      studentId: row.studentId,
      studentName: row.studentName,
      admissionNumber: row.admissionNumber,
      categoryId: input.template.categoryId,
      categoryName: input.categoryName.trim() || "Uncategorised",
      templateId: input.template.id,
      templateFamilyId: input.template.familyId,
      templateVersion: input.template.version,
      templateName: input.template.name,
      issuedAt,
      issuedById: input.issuedBy.id,
      issuedByName: input.issuedBy.name.trim() || "Admin",
      fileName: "",
      fileKind: "pptx",
      status: "issued",
    };
  });

  const last = allocated[allocated.length - 1];
  writeState({
    ...state,
    sequenceByYear: last
      ? { ...state.sequenceByYear, [String(last.year)]: last.sequence }
      : state.sequenceByYear,
    issued: [...state.issued, ...created],
  });
  return created;
}

/** Attach generated file names only. Does not change numbers or template versions. */
export function attachIssuedCertificateFiles(
  patches: Array<{
    id: string;
    fileName: string;
    fileKind: IssuedCertificateFileKind;
    bundleFileName?: string;
  }>,
): IssuedCertificateRecord[] {
  if (patches.length === 0) return [];
  const byId = new Map(patches.map((patch) => [patch.id, patch]));
  const state = readState();
  const updated: IssuedCertificateRecord[] = [];
  writeState({
    ...state,
    issued: state.issued.map((row) => {
      const patch = byId.get(row.id);
      if (!patch) return row;
      const next = {
        ...row,
        fileName: patch.fileName,
        fileKind: patch.fileKind,
        bundleFileName: patch.bundleFileName,
      };
      updated.push(next);
      return next;
    }),
  });
  return updated;
}

export function subscribeCertificateNumbering(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onChange();
  window.addEventListener(CERTIFICATE_NUMBERING_CHANGED_EVENT, handler);
  window.addEventListener("storage", handler);
  window.addEventListener("lumenx-demo-profile-change", handler);
  return () => {
    window.removeEventListener(CERTIFICATE_NUMBERING_CHANGED_EVENT, handler);
    window.removeEventListener("storage", handler);
    window.removeEventListener("lumenx-demo-profile-change", handler);
  };
}
