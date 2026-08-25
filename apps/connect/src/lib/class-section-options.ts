/** Shared class / section option derivation for teacher portal filters. */

import { sortLocaleNumeric, uniqueSortedStrings } from "@lumenx/utils";

export function uniqueSortedClassNames(
  items: ReadonlyArray<{ className: string }>,
): string[] {
  return uniqueSortedStrings(items.map((item) => item.className));
}

export function sectionsForClassName(
  items: ReadonlyArray<{ className: string; section: string }>,
  className: string | "all",
): string[] {
  const pool =
    className === "all" ? items : items.filter((item) => item.className === className);
  return [...new Set(pool.map((item) => item.section))].sort(sortLocaleNumeric);
}
