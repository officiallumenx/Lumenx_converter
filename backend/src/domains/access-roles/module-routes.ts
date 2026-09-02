/** Canonical Admin module routes for ACL — keep in sync with apps/admin admin-nav. */
export const ADMIN_MODULE_ROUTES = [
  "/students",
  "/teachers",
  "/parents",
  "/classes",
  "/subjects",
  "/timetable",
  "/student-attendance",
  "/attendance",
  "/teacher-attendance",
  "/exams",
  "/marks",
  "/homework",
  "/diary",
  "/fees",
  "/transport",
  "/leave",
  "/events",
  "/announcements",
  "/notifications",
  "/calendar",
  "/admissions",
  "/documents",
  "/certificates",
  "/messages",
  "/activity",
  "/assets",
  "/storage",
  "/careers",
  "/complaints",
  "/reports",
  "/analytics",
  "/accounts",
  "/permissions",
  "/settings",
  "/alerts",
  "/staff-attendance",
  "/recycle",
] as const;

export type AdminModuleRoute = (typeof ADMIN_MODULE_ROUTES)[number];

export function isAdminModuleRoute(route: string): route is AdminModuleRoute {
  return (ADMIN_MODULE_ROUTES as readonly string[]).includes(route);
}

export function allPermissions(
  permission: "full" | "read" | "none",
): Record<string, "full" | "read" | "none"> {
  return Object.fromEntries(ADMIN_MODULE_ROUTES.map((route) => [route, permission]));
}

export function permissionsFor(
  routes: readonly string[],
  fallback: "full" | "read" | "none" = "none",
): Record<string, "full" | "read" | "none"> {
  const selected = new Set(routes);
  return Object.fromEntries(
    ADMIN_MODULE_ROUTES.map((route) => [
      route,
      selected.has(route) ? "full" : fallback,
    ]),
  );
}
