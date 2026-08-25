export type AdminModuleColor = {
  primary: string;
  iconBackground: string;
};

/** Same palette as Connect student/teacher module colors. */
export const ADMIN_MODULE_COLORS = {
  blue: { primary: "#2563EB", iconBackground: "#DBEAFE" },
  green: { primary: "#10B981", iconBackground: "#D1FAE5" },
  purple: { primary: "#8B5CF6", iconBackground: "#F3E8FF" },
  indigo: { primary: "#4F46E5", iconBackground: "#E0E7FF" },
  orange: { primary: "#F97316", iconBackground: "#FFEDD5" },
  red: { primary: "#EF4444", iconBackground: "#FEE2E2" },
  cyan: { primary: "#06B6D4", iconBackground: "#CFFAFE" },
  gold: { primary: "#EAB308", iconBackground: "#FEF3C7" },
  teal: { primary: "#14B8A6", iconBackground: "#CCFBF1" },
  slate: { primary: "#475569", iconBackground: "#E2E8F0" },
  navy: { primary: "#1E40AF", iconBackground: "#C7D2FE" },
  amber: { primary: "#D97706", iconBackground: "#FFFBEB" },
  sky: { primary: "#0EA5E9", iconBackground: "#E0F2FE" },
  violet: { primary: "#7C3AED", iconBackground: "#EDE9FE" },
  fuchsia: { primary: "#A855F7", iconBackground: "#FAE8FF" },
  rose: { primary: "#F43F5E", iconBackground: "#FFE4E6" },
  crimson: { primary: "#E11D48", iconBackground: "#FFE4E6" },
  scarlet: { primary: "#DC2626", iconBackground: "#FECACA" },
  deepOrange: { primary: "#EA580C", iconBackground: "#FFF7ED" },
} as const satisfies Record<string, AdminModuleColor>;

type AdminHue = keyof typeof ADMIN_MODULE_COLORS;

const ADMIN_ROUTE_COLORS: Record<string, AdminHue> = {
  "/": "blue",
  "/analytics": "indigo",
  "/students": "navy",
  "/teachers": "purple",
  "/parents": "rose",
  "/accounts": "slate",
  "/classes": "teal",
  "/academic-management": "violet",
  "/subjects": "fuchsia",
  "/timetable": "sky",
  "/student-attendance": "green",
  "/attendance": "teal",
  "/teacher-attendance": "amber",
  "/exams": "red",
  "/marks": "indigo",
  "/homework": "purple",
  "/diary": "violet",
  "/notifications": "crimson",
  "/announcements": "gold",
  "/alerts": "rose",
  "/complaints": "scarlet",
  "/permissions": "slate",
  "/modules": "indigo",
  "/subscription": "gold",
  "/storage": "cyan",
  "/settings": "slate",
  "/transport": "orange",
  "/leave": "amber",
  "/fees": "deepOrange",
  "/admissions": "green",
  "/careers": "navy",
  "/institute": "blue",
  "/templates": "fuchsia",
  "/calendar": "sky",
  "/events": "gold",
  "/reports": "cyan",
  "/teacher-performance": "amber",
};

function matchRouteColor(pathname: string): AdminHue {
  const keys = Object.keys(ADMIN_ROUTE_COLORS).sort((a, b) => b.length - a.length);
  const key = keys.find((k) =>
    k === "/" ? pathname === "/" : pathname === k || pathname.startsWith(`${k}/`),
  );
  return ADMIN_ROUTE_COLORS[key ?? "/"] ?? "blue";
}

export function getAdminModuleColor(pathname: string): AdminModuleColor {
  return ADMIN_MODULE_COLORS[matchRouteColor(pathname)];
}

export function getAdminModuleColorForPath(to: string): AdminModuleColor {
  return ADMIN_MODULE_COLORS[ADMIN_ROUTE_COLORS[to] ?? "blue"];
}

export function adminModuleLightChip(color: AdminModuleColor) {
  return "var(--color-muted)";
}

export function adminModuleLightSurface(color: AdminModuleColor) {
  return "var(--color-surface)";
}

export function adminMobileNavIconStyle(color: AdminModuleColor, active: boolean) {
  if (active) {
    return { color: "#FFFFFF", backgroundColor: color.primary };
  }
  return { color: color.primary, backgroundColor: adminModuleLightChip(color) };
}

export function adminMoreTileStyle(color: AdminModuleColor, active: boolean) {
  if (active) {
    return {
      borderColor: color.primary,
      boxShadow: `0 0 0 1px ${color.primary}`,
      backgroundColor: adminModuleLightSurface(color),
    };
  }
  return {
    borderColor: `${color.primary}28`,
  };
}

export function adminSidebarAccentStyle(color: AdminModuleColor, active: boolean) {
  if (!active) return undefined;
  return {
    boxShadow: `inset 3px 0 0 ${color.primary}`,
    background: "var(--color-sidebar-accent)",
  };
}
