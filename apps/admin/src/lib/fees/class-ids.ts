/** Helpers for fee writes when multiple class rows share one display label. */

export type ClassIdsByLabel = Record<string, string[]>;

/** Prefer multi-id map; fall back to legacy single-id map. */
export function idsForClassLabel(
  classKey: string,
  classIdsByLabel: ClassIdsByLabel = {},
  classIdByLabel: Record<string, string> = {},
): string[] {
  const multi = classIdsByLabel[classKey];
  if (multi && multi.length > 0) {
    return [...new Set(multi.filter(Boolean))];
  }
  const single = classIdByLabel[classKey];
  return single ? [single] : [];
}

/** Fan one amount out to every sibling class UUID for a label. */
export function expandAmountAcrossClassIds(
  classKey: string,
  amount: number,
  classIdsByLabel: ClassIdsByLabel = {},
  classIdByLabel: Record<string, string> = {},
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of idsForClassLabel(classKey, classIdsByLabel, classIdByLabel)) {
    out[id] = amount;
  }
  return out;
}

/** Collapse first id per label for callers that still expect a single map. */
export function firstClassIdByLabel(classIdsByLabel: ClassIdsByLabel): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [label, ids] of Object.entries(classIdsByLabel)) {
    const first = ids.find(Boolean);
    if (first) out[label] = first;
  }
  return out;
}
