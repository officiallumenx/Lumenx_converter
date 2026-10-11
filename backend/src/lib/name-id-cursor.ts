/**
 * Stable (sortName, id) cursor for Admin directory pagination.
 * Tie-break on id so inserts with the same display name cannot duplicate/skip rows.
 */

export type NameIdCursor = {
  name: string;
  id: string;
};

export const LIST_PAGE_DEFAULT_LIMIT = 100;
export const LIST_PAGE_MAX_LIMIT = 200;

export function clampListLimit(limit: number | undefined): number {
  return Math.min(
    Math.max(1, limit ?? LIST_PAGE_DEFAULT_LIMIT),
    LIST_PAGE_MAX_LIMIT,
  );
}

export function encodeNameIdCursor(cursor: NameIdCursor): string {
  return Buffer.from(
    JSON.stringify({ n: cursor.name, i: cursor.id }),
    "utf8",
  ).toString("base64url");
}

export function decodeNameIdCursor(
  raw: string | null | undefined,
): NameIdCursor | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw.trim(), "base64url").toString("utf8"),
    ) as { n?: unknown; i?: unknown };
    if (typeof parsed.n !== "string" || typeof parsed.i !== "string") return null;
    if (!parsed.i.trim()) return null;
    return { name: parsed.n, id: parsed.i.trim() };
  } catch {
    return null;
  }
}

/** PostgREST filter: (nameCol, id) > (cursor.name, cursor.id) */
export function nameIdCursorOrFilter(
  cursor: NameIdCursor,
  nameCol: string,
): string {
  const safeName = cursor.name.replace(/"/g, "");
  const nameLit = `"${safeName}"`;
  const idLit = cursor.id;
  return `${nameCol}.gt.${nameLit},and(${nameCol}.eq.${nameLit},id.gt.${idLit})`;
}

export function nextNameIdCursorFromRows<T extends { id: string }>(
  rows: T[],
  limit: number,
  nameOf: (row: T) => string,
): { items: T[]; nextCursor: string | null; hasMore: boolean } {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  if (!hasMore || items.length === 0) {
    return { items, nextCursor: null, hasMore: false };
  }
  const last = items[items.length - 1]!;
  return {
    items,
    nextCursor: encodeNameIdCursor({ name: nameOf(last), id: last.id }),
    hasMore: true,
  };
}
