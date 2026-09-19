/**
 * Safe lookup for UI meta maps.
 * Never use `MAP[key].label` — unknown API/demo enums make `MAP[key]` undefined.
 */
export function safeMeta<T>(
  map: Record<string, T>,
  key: string | null | undefined,
  fallback: T,
): T {
  if (key != null && Object.prototype.hasOwnProperty.call(map, key)) {
    const value = map[key];
    if (value !== undefined) return value;
  }
  return fallback;
}

export function safeMetaLabel(
  map: Record<string, { label: string }>,
  key: string | null | undefined,
  fallbackLabel: string,
): string {
  return safeMeta(map, key, { label: fallbackLabel }).label;
}
