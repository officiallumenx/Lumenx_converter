import type { CertificateFieldMapping } from "./field-types";

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  return String(value).trim() === "";
}

/**
 * Required mapping: a missing value is treated as required (invalid).
 * Optional mapping: a missing value is allowed.
 */
export function isCertificateMappingValueMissing(
  mapping: Pick<CertificateFieldMapping, "required">,
  value: unknown,
): boolean {
  if (!mapping.required) return false;
  return isBlank(value);
}

export function certificateMappingHasValue(
  mapping: Pick<CertificateFieldMapping, "required">,
  value: unknown,
): boolean {
  return !isCertificateMappingValueMissing(mapping, value);
}
