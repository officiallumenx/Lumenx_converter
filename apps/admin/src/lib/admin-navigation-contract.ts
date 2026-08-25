import { adminNav } from "@/lib/admin-nav";
import { MODULE_CATALOG } from "@/lib/admin-plan-config";

type ContractSeverity = "error" | "warn";

export type AdminNavContractIssue = {
  severity: ContractSeverity;
  code:
    | "MISSING_IN_MODULE_CATALOG"
    | "MISSING_IN_NAV"
    | "DUPLICATE_NAV_ROUTE"
    | "DUPLICATE_CATALOG_ROUTE";
  route: string;
  detail: string;
};

export type AdminNavContractReport = {
  issues: AdminNavContractIssue[];
  navRoutes: string[];
  catalogRoutes: string[];
};

function normalizeRoute(route: string): string {
  if (!route) return "/";
  if (route === "/") return route;
  return route.endsWith("/") ? route.slice(0, -1) : route;
}

function uniqSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function duplicateRoutes(routes: string[]): string[] {
  const counts = new Map<string, number>();
  for (const route of routes) {
    counts.set(route, (counts.get(route) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([route]) => route);
}

export function buildAdminNavContractReport(): AdminNavContractReport {
  const navRoutes = uniqSorted(
    adminNav.flatMap((group) => group.items.map((item) => normalizeRoute(item.to))),
  );
  const catalogRoutes = uniqSorted(
    MODULE_CATALOG.map((module) => module.route)
      .filter((route): route is string => Boolean(route))
      .map(normalizeRoute),
  );

  const navRouteList = adminNav.flatMap((group) => group.items.map((item) => normalizeRoute(item.to)));
  const catalogRouteList = MODULE_CATALOG.map((module) => module.route)
    .filter((route): route is string => Boolean(route))
    .map(normalizeRoute);

  const issues: AdminNavContractIssue[] = [];

  for (const route of duplicateRoutes(navRouteList)) {
    issues.push({
      severity: "error",
      code: "DUPLICATE_NAV_ROUTE",
      route,
      detail: "Route is duplicated in admin navigation groups.",
    });
  }

  for (const route of duplicateRoutes(catalogRouteList)) {
    issues.push({
      severity: "error",
      code: "DUPLICATE_CATALOG_ROUTE",
      route,
      detail: "Route is duplicated in module catalog definitions.",
    });
  }

  for (const route of navRoutes) {
    if (!catalogRoutes.includes(route)) {
      issues.push({
        severity: "warn",
        code: "MISSING_IN_MODULE_CATALOG",
        route,
        detail: "Navigation route is not represented in MODULE_CATALOG.",
      });
    }
  }

  for (const route of catalogRoutes) {
    if (!navRoutes.includes(route)) {
      issues.push({
        severity: "warn",
        code: "MISSING_IN_NAV",
        route,
        detail: "Module catalog route is not visible in adminNav groups.",
      });
    }
  }

  return { issues, navRoutes, catalogRoutes };
}

let didWarn = false;

export function warnAdminNavContractIfNeeded(): void {
  if (didWarn || !import.meta.env.DEV) return;
  didWarn = true;
  const report = buildAdminNavContractReport();
  if (report.issues.length === 0) return;
  // eslint-disable-next-line no-console
  console.groupCollapsed("[admin-nav-contract] navigation contract issues");
  for (const issue of report.issues) {
    const tag = issue.severity === "error" ? "ERROR" : "WARN";
    // eslint-disable-next-line no-console
    console.log(`${tag} ${issue.code} ${issue.route}: ${issue.detail}`);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}
