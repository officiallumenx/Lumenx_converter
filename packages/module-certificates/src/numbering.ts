/** Institute certificate number format. Sequential {NUMBER} is required for uniqueness. */

export const CERTIFICATE_NUMBER_DATA_FIELD = "institute.certificateNumber";

export const DEFAULT_CERTIFICATE_NUMBER_FORMAT = "CERT/{YEAR}/{NUMBER}";
export const DEFAULT_CERTIFICATE_NUMBER_DIGITS = 6;
export const MIN_CERTIFICATE_NUMBER_DIGITS = 3;
export const MAX_CERTIFICATE_NUMBER_DIGITS = 8;

export function isCertificateNumberDataField(dataFieldId: string): boolean {
  return dataFieldId === CERTIFICATE_NUMBER_DATA_FIELD;
}

export function clampCertificateNumberDigits(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_CERTIFICATE_NUMBER_DIGITS;
  return Math.min(
    MAX_CERTIFICATE_NUMBER_DIGITS,
    Math.max(MIN_CERTIFICATE_NUMBER_DIGITS, Math.round(n)),
  );
}

export function normalizeCertificateNumberFormat(format: string): string {
  const trimmed = format.trim();
  return trimmed || DEFAULT_CERTIFICATE_NUMBER_FORMAT;
}

export function certificateNumberFormatError(format: string): string | null {
  const normalized = normalizeCertificateNumberFormat(format);
  if (!/\{NUMBER\}/i.test(normalized)) {
    return "Format must include {NUMBER} so each certificate can get a unique sequence.";
  }
  return null;
}

export function formatCertificateNumber(input: {
  format: string;
  year: number;
  sequence: number;
  digits?: number;
}): string {
  const digits = clampCertificateNumberDigits(input.digits);
  const padded = String(Math.max(1, Math.floor(input.sequence))).padStart(digits, "0");
  return normalizeCertificateNumberFormat(input.format)
    .replace(/\{YEAR\}/gi, String(input.year))
    .replace(/\{NUMBER\}/gi, padded);
}

export function previewCertificateNumber(
  format: string,
  digits?: number,
  sequence = 1,
  at = new Date(),
): string {
  return formatCertificateNumber({
    format,
    digits,
    sequence,
    year: at.getFullYear(),
  });
}
