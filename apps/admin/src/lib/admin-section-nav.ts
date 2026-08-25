import type { AdminNavGroup, AdminNavItem } from "@/lib/admin-nav";

export function isRouteActive(pathname: string, route: string): boolean {
  return route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`);
}

export function getAdminSectionForPath(
  pathname: string,
  groups: readonly AdminNavGroup[],
): string | null {
  for (const group of groups) {
    if (group.items.some((item) => isRouteActive(pathname, item.to))) {
      return group.label;
    }
  }
  return groups[0]?.label ?? null;
}

export function getAdminSectionItems(
  sectionLabel: string | null,
  groups: readonly AdminNavGroup[],
): readonly AdminNavItem[] {
  if (!sectionLabel) return [];
  return groups.find((group) => group.label === sectionLabel)?.items ?? [];
}
