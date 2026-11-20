/**
 * Per-class periods helpers for subject edit forms.
 * Legacy subjects with empty maps use the catalog periodsPerWeek default.
 */

export type ClassPeriodsMap = Record<string, number>;

export function parseClassPeriods(raw: unknown): ClassPeriodsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: ClassPeriodsMap = {};
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const key = code.trim();
    const n = typeof value === "number" ? value : Number(value);
    if (!key || !Number.isFinite(n) || n < 1) continue;
    out[key] = Math.floor(n);
  }
  return out;
}

export function periodsForClass(
  map: ClassPeriodsMap,
  classCode: string,
  fallback: number,
): number {
  const key = classCode.trim();
  const n = map[key];
  if (typeof n === "number" && n >= 1) return n;
  return Math.max(1, fallback || 1);
}

/** Build map from selected class codes + per-class inputs; omit unchecked. */
export function buildClassPeriodsMap(
  selectedCodes: string[],
  periodsByCode: Record<string, string | number>,
  fallback: number,
): ClassPeriodsMap {
  const out: ClassPeriodsMap = {};
  for (const code of selectedCodes) {
    const key = code.trim();
    if (!key) continue;
    const raw = periodsByCode[key];
    const n = typeof raw === "number" ? raw : Number(raw);
    out[key] = Number.isFinite(n) && n >= 1 ? Math.floor(n) : Math.max(1, fallback || 1);
  }
  return out;
}

/** Changing one class must not rewrite another — isolation check for tests. */
export function isolateClassPeriodUpdate(
  previous: ClassPeriodsMap,
  classCode: string,
  periods: number,
): ClassPeriodsMap {
  const key = classCode.trim();
  if (!key || periods < 1) return { ...previous };
  return { ...previous, [key]: Math.floor(periods) };
}
