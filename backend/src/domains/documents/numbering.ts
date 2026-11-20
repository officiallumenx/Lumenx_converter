/**
 * Document sequential numbering — separate from certificate CERT/{year}/{seq}.
 * Numbers are assigned at publish time only (not on draft/preview/cancel).
 *
 * Soft-delete policy: historically assigned numbers are never reused
 * (unique index includes soft-deleted rows; allocation seeds from all rows).
 *
 * Gap policy: if allocation succeeds but publication fails after the number is
 * stamped on the draft, the number remains reserved (intentional gap). Retries
 * reuse the stamped number and do not allocate again.
 */

export function formatDocumentNumber(year: number, sequence: number): string {
  return `DOC/${year}/${String(sequence).padStart(4, "0")}`;
}

/** Parse DOC/{year}/{seq} — returns null for custom/foreign formats. */
export function parseDocumentNumber(
  value: string | null | undefined,
): { year: number; sequence: number } | null {
  if (!value) return null;
  const match = /^DOC\/(\d{4})\/(\d+)$/i.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const sequence = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(sequence) || sequence < 1) {
    return null;
  }
  return { year, sequence };
}

const MIN_DOC_YEAR = 2000;
const MAX_DOC_YEAR = 2100;

/** True when value is a preservable DOC/{year}/{seq} within supported year bounds. */
export function isPreservableDocumentNumber(
  value: string | null | undefined,
): boolean {
  const parsed = parseDocumentNumber(value);
  if (!parsed) return false;
  return parsed.year >= MIN_DOC_YEAR && parsed.year <= MAX_DOC_YEAR;
}

/**
 * Resolve a legacy/stamped number for publish or republish.
 * - empty/null → null (caller must allocate)
 * - valid DOC/{year}/{seq} → normalized uppercase DOC form
 * - invalid / out-of-range year → throws with actionable message (never silent renumber)
 */
export function resolvePreservedDocumentNumber(
  value: string | null | undefined,
): string | null {
  const raw = value?.trim() ?? "";
  if (!raw) return null;
  const parsed = parseDocumentNumber(raw);
  if (!parsed) {
    throw new Error(
      `Invalid document number "${raw}". Expected DOC/{year}/{sequence} (for example DOC/2026/0001). Clear or correct the number before publishing.`,
    );
  }
  if (parsed.year < MIN_DOC_YEAR || parsed.year > MAX_DOC_YEAR) {
    throw new Error(
      `Document number year ${parsed.year} is out of range (${MIN_DOC_YEAR}–${MAX_DOC_YEAR}). Historical numbers must use a supported year; the system will not renumber automatically.`,
    );
  }
  return formatDocumentNumber(parsed.year, parsed.sequence);
}

export function nextSequenceFromNumbers(
  numbers: Array<string | null | undefined>,
  year: number,
): number {
  let max = 0;
  for (const value of numbers) {
    const parsed = parseDocumentNumber(value);
    if (!parsed || parsed.year !== year) continue;
    if (parsed.sequence > max) max = parsed.sequence;
  }
  return max + 1;
}

/**
 * Floor used by allocate_document_number: max(reserved sequences) + 1, or 1.
 * reservedSequencesForYear are integer sequences already reserved for that year
 * (including soft-deleted), not full DOC strings.
 */
export function documentNumberSeedFloor(reservedSequencesForYear: number[]): number {
  let max = 0;
  for (const sequence of reservedSequencesForYear) {
    if (!Number.isFinite(sequence) || sequence < 1) continue;
    if (sequence > max) max = sequence;
  }
  return max + 1;
}

/**
 * One atomic step of the proposed document_number_series update.
 *
 * Invariant (matches docs/proposals/document_number_uniqueness.sql):
 * - `seriesNextSequence` is the NEXT integer to issue, or null if no series row.
 * - `v_seed` = max(reserved) + 1 (soft-deleted included by caller).
 * - Issued = GREATEST(seriesNextSequence ?? v_seed, v_seed); store issued + 1.
 *
 * This is a pure model of the SQL RPC for unit tests — not a substitute for
 * staging Postgres concurrency verification.
 */
export function advanceDocumentNumberSeries(input: {
  seriesNextSequence: number | null;
  reservedSequencesForYear: number[];
}): { issuedSequence: number; nextSeriesSequence: number } {
  const vSeed = Math.max(1, documentNumberSeedFloor(input.reservedSequencesForYear));
  const issued =
    input.seriesNextSequence == null
      ? vSeed
      : Math.max(input.seriesNextSequence, vSeed);
  return {
    issuedSequence: issued,
    nextSeriesSequence: issued + 1,
  };
}

/** UTC calendar year used for new DOC/{year}/… allocation. */
export function documentNumberYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

/**
 * Client-supplied generation key for draft idempotency.
 * Format: `{batchId}:{templateId}:{studentOrRecipientKey}` (max 200 chars).
 */
export function isValidGenerationKey(value: string | null | undefined): boolean {
  if (!value) return false;
  const key = value.trim();
  if (key.length < 8 || key.length > 200) return false;
  return /^[A-Za-z0-9_.:-]+$/.test(key);
}

export function buildGenerationKey(parts: {
  batchId: string;
  templateId: string;
  studentId?: string | null;
  recipientRef?: string | null;
}): string {
  const subject =
    parts.studentId?.trim() ||
    parts.recipientRef?.trim() ||
    "no-subject";
  return `${parts.batchId.trim()}:${parts.templateId.trim()}:${subject}`;
}

export function extractGenerationKey(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const key = (payload as Record<string, unknown>).generationKey;
  if (typeof key !== "string") return null;
  return isValidGenerationKey(key) ? key.trim() : null;
}

export function extractClassSection(payload: unknown): {
  classLabel: string | null;
  sectionLabel: string | null;
} {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { classLabel: null, sectionLabel: null };
  }
  const row = payload as Record<string, unknown>;
  const classLabel =
    typeof row.classLabel === "string" && row.classLabel.trim()
      ? row.classLabel.trim()
      : null;
  const sectionLabel =
    typeof row.sectionLabel === "string" && row.sectionLabel.trim()
      ? row.sectionLabel.trim()
      : null;
  return { classLabel, sectionLabel };
}

export function isUniqueNumberConflict(message: string): boolean {
  return /duplicate|unique|certificate_number|document_number/i.test(message);
}

export type AllocateRpcErrorKind = "unavailable" | "error";

/**
 * Classify PostgREST/Postgres RPC failures.
 * Only confirmed missing-function cases are "unavailable" (pre-migration).
 * Permission, network, and unexpected errors are "error" (fail closed).
 */
export function classifyAllocateRpcError(
  message: string,
  code?: string | null,
): AllocateRpcErrorKind {
  const text = `${code ?? ""} ${message}`.toLowerCase();
  if (
    text.includes("pgrst202") ||
    text.includes("42883") ||
    /could not find the function/.test(text) ||
    /function .*allocate_document_number.* does not exist/.test(text) ||
    /unsupported mock rpc:\s*allocate_document_number/.test(text)
  ) {
    return "unavailable";
  }
  return "error";
}

export type AllocateRpcOutcome =
  | { kind: "allocated"; number: string }
  | { kind: "unavailable"; message: string }
  | { kind: "error"; message: string };
