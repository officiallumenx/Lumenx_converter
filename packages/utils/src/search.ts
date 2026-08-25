/** Shared search / sort primitives. */

/** Case-insensitive includes across one or more string fields. Empty query matches all. */
export function matchesSearchQuery(haystacks: readonly string[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return haystacks.some((value) => value.toLowerCase().includes(q));
}

/** Numeric-aware locale compare for class names ("10" after "9"). */
export function sortLocaleNumeric(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

/** Unique values, sorted with {@link sortLocaleNumeric}. */
export function uniqueSortedStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort(sortLocaleNumeric);
}
