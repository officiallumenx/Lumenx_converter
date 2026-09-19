/**
 * Match Admin `normalizeSchoolClassName` / `classIdentityKey` so Grade 8,
 * Class 8, and "8" resolve as the same fee scope.
 */

const CLASS_PREFIX = /^(?:grade|class|std|standard|year)\s+/i;

export function classIdentityKey(raw: string): string {
  let value = (raw ?? "").trim().replace(/\s+/g, " ");
  if (!value) return "";
  value = value.replace(/[-_]+/g, " ");
  for (let i = 0; i < 3; i++) {
    value = value.replace(CLASS_PREFIX, "").trim();
  }
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Map each class id → all sibling ids that share the same identity key. */
export function buildClassSiblingMap(
  rows: Array<{ id: string; name?: string | null; code?: string | null }>,
): Map<string, string[]> {
  const byKey = new Map<string, string[]>();
  for (const row of rows) {
    const label = row.name?.trim() || row.code?.trim() || row.id;
    const key = classIdentityKey(label) || row.id;
    const bucket = byKey.get(key) ?? [];
    if (!bucket.includes(row.id)) bucket.push(row.id);
    byKey.set(key, bucket);
  }
  const byId = new Map<string, string[]>();
  for (const ids of byKey.values()) {
    for (const id of ids) byId.set(id, ids);
  }
  return byId;
}

export function siblingClassIds(
  siblingMap: Map<string, string[]> | undefined,
  classId: string,
): string[] {
  const siblings = siblingMap?.get(classId);
  if (siblings && siblings.length > 0) return siblings;
  return [classId];
}
