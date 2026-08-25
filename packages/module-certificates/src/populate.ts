import type { CertificateFieldMapping, CertificateFieldSource } from "./field-types";
import { getCertificateCatalogField } from "./field-catalog";
import { isCertificateNumberDataField } from "./numbering";

export type CertificateSourceValues = Record<string, unknown>;

/** Values available to fill mapped certificate fields. Never writes back to records. */
export type CertificatePopulateContext = Partial<
  Record<CertificateFieldSource, CertificateSourceValues>
>;

export type CertificateFieldFillStatus = "complete" | "required-missing" | "optional-missing";

export type CertificateFieldValueSource = "record" | "issuance" | "empty";

export type PopulatedCertificateMapping = {
  targetId: string;
  displayName: string;
  dataFieldId: string;
  required: boolean;
  value: string;
  /** True when no usable value is present (record or issuance). */
  missing: boolean;
  status: CertificateFieldFillStatus;
  source: CertificateFieldValueSource;
};

/** studentId → targetId → issuance-only value */
export type CertificateIssuanceOverrides = Record<string, Record<string, string>>;

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  return String(value).trim() === "";
}

function fieldKey(dataFieldId: string, source: CertificateFieldSource): string {
  const prefix = `${source}.`;
  return dataFieldId.startsWith(prefix) ? dataFieldId.slice(prefix.length) : dataFieldId;
}

function lookupValue(
  dataFieldId: string,
  context: CertificatePopulateContext,
): unknown {
  const field = getCertificateCatalogField(dataFieldId);
  if (!field) return undefined;
  const bag = context[field.source];
  if (!bag) return undefined;
  return bag[fieldKey(field.dataField, field.source)];
}

function toDisplayValue(value: unknown): string {
  if (isBlank(value)) return "";
  return String(value).trim();
}

export function certificateFieldFillStatus(
  required: boolean,
  value: unknown,
): CertificateFieldFillStatus {
  if (!isBlank(value)) return "complete";
  return required ? "required-missing" : "optional-missing";
}

function fromValue(
  mapping: CertificateFieldMapping,
  value: string,
  source: CertificateFieldValueSource,
): PopulatedCertificateMapping {
  const missing = isBlank(value);
  return {
    targetId: mapping.targetId,
    displayName: mapping.displayName,
    dataFieldId: mapping.dataFieldId,
    required: mapping.required,
    value: missing ? "" : value,
    missing,
    status: certificateFieldFillStatus(mapping.required, value),
    source: missing ? "empty" : source,
  };
}

/** Fill Nexus mappings from the given source bags. Does not mutate source records. */
export function populateCertificateMappings(
  mappings: CertificateFieldMapping[],
  context: CertificatePopulateContext,
): PopulatedCertificateMapping[] {
  return mappings.map((mapping) =>
    fromValue(mapping, toDisplayValue(lookupValue(mapping.dataFieldId, context)), "record"),
  );
}

/**
 * Overlay issuance-only values onto populated mappings.
 * Record values always win when present. Manual values never write back.
 */
export function applyCertificateIssuanceOverrides(
  mappings: CertificateFieldMapping[],
  populated: PopulatedCertificateMapping[],
  overrides: Record<string, string> | undefined,
): PopulatedCertificateMapping[] {
  const byTarget = new Map(populated.map((item) => [item.targetId, item]));
  return mappings.map((mapping) => {
    const auto = byTarget.get(mapping.targetId);
    if (auto && !auto.missing) return auto;
    const manual = toDisplayValue(overrides?.[mapping.targetId]);
    if (manual) return fromValue(mapping, manual, "issuance");
    return auto ?? fromValue(mapping, "", "empty");
  });
}

/** Required empty fields block issuing. Certificate numbers are assigned at issue. */
export function certificateRequiredFieldsComplete(
  fields: PopulatedCertificateMapping[],
): boolean {
  return fields.every(
    (field) =>
      isCertificateNumberDataField(field.dataFieldId) || field.status !== "required-missing",
  );
}

/** Stamp an allocated number onto mapped certificate-number boxes. Does not write student records. */
export function applyCertificateNumberToFields(
  fields: PopulatedCertificateMapping[],
  certificateNumber: string,
): PopulatedCertificateMapping[] {
  const value = certificateNumber.trim();
  if (!value) return fields;
  return fields.map((field) => {
    if (!isCertificateNumberDataField(field.dataFieldId)) return field;
    return {
      ...field,
      value,
      missing: false,
      status: "complete",
      source: "issuance",
    };
  });
}

/** Mapped + issuance values to stamp onto a template copy. Skips empty fields. */
export function certificateFillValuesFromFields(
  fields: PopulatedCertificateMapping[],
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (!field.missing && field.value.trim()) values[field.targetId] = field.value;
  }
  return values;
}

/** Copy an issuance-only value onto many students. Does not write student records. */
export function copyCertificateIssuanceValue(
  overrides: CertificateIssuanceOverrides,
  studentIds: string[],
  targetId: string,
  value: string,
): CertificateIssuanceOverrides {
  const next: CertificateIssuanceOverrides = { ...overrides };
  for (const studentId of studentIds) {
    next[studentId] = {
      ...(next[studentId] ?? {}),
      [targetId]: value,
    };
  }
  return next;
}
