import { normalizeDateOnlyInput } from "@/lib/date-only";

/** Normalize a stored DOB for `<input type="date">` (YYYY-MM-DD). */
export function hydrateTeacherDateOfBirthInput(
  raw: string | null | undefined,
): string {
  if (raw == null || !String(raw).trim()) return "";
  return normalizeDateOnlyInput(String(raw)) ?? String(raw).trim();
}

/**
 * Resolve `date_of_birth` for a teacher profile save.
 * - Non-empty form → send that value
 * - Empty form after a non-empty baseline → intentional clear → null
 * - Empty form with empty baseline → omit (`undefined`) so PATCH does not wipe
 */
export function resolveTeacherEditDateOfBirth(opts: {
  formValue: string | null | undefined;
  baselineValue: string | null | undefined;
}): string | null | undefined {
  const form = opts.formValue?.trim() || "";
  const baseline = opts.baselineValue?.trim() || "";
  if (form) return form;
  if (baseline) return null;
  return undefined;
}
