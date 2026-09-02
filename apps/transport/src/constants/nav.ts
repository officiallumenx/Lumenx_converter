import {
  Bell,
  Bus,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  Grid2X2,
  Home,
  MapPinned,
  Settings,
  Siren,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import { MODULE_COLORS, type ModuleColor } from "@/theme/colors";

export const ROUTES = {
  login: "/login",
  home: "/",
  attendance: "/attendance",
  notifications: "/notifications",
  emergency: "/emergency",
  more: "/more",
  busInformation: "/more/bus-information",
  routeSetup: "/more/route-setup",
  profile: "/more/profile",
  settings: "/more/settings",
  support: "/more/support",
  schoolCalendar: "/more/calendar",
} as const;

export type AppRoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export interface PrimaryNavItem {
  id: keyof Pick<typeof ROUTES, "home" | "attendance" | "notifications" | "emergency" | "more">;
  label: string;
  path: AppRoutePath;
  icon: LucideIcon;
  /** Icon / logo color from the theme colors table. */
  moduleColor: ModuleColor;
}

/**
 * Bottom navigation — 5 primary tabs.
 * Colors assigned from `MODULE_COLORS` (theme colors table).
 */
export const PRIMARY_NAV: PrimaryNavItem[] = [
  { id: "home", label: "Home", path: ROUTES.home, icon: Home, moduleColor: MODULE_COLORS.primary },
  {
    id: "attendance",
    label: "Attendance",
    path: ROUTES.attendance,
    icon: ClipboardCheck,
    moduleColor: MODULE_COLORS.success,
  },
  {
    id: "notifications",
    label: "Notifications",
    path: ROUTES.notifications,
    icon: Bell,
    moduleColor: MODULE_COLORS.warning,
  },
  {
    id: "emergency",
    label: "Emergency",
    path: ROUTES.emergency,
    icon: Siren,
    moduleColor: MODULE_COLORS.danger,
  },
  { id: "more", label: "More", path: ROUTES.more, icon: Grid2X2, moduleColor: MODULE_COLORS.slate },
];

export interface MoreNavItem {
  id: string;
  label: string;
  description: string;
  path: AppRoutePath;
  icon: LucideIcon;
  moduleColor: ModuleColor;
}

/** Destinations listed inside the More hub. */
export const MORE_NAV: MoreNavItem[] = [
  {
    id: "bus-information",
    label: "Bus Information",
    description: "Your bus, route, and stops",
    path: ROUTES.busInformation,
    icon: Bus,
    moduleColor: MODULE_COLORS.transport,
  },
  {
    id: "route-setup",
    label: "Route Setup",
    description: "Add stops, assign students, wait for Admin",
    path: ROUTES.routeSetup,
    icon: MapPinned,
    moduleColor: MODULE_COLORS.transport,
  },
  {
    id: "school-calendar",
    label: "School Calendar",
    description: "Institute events, holidays, and notices",
    path: ROUTES.schoolCalendar,
    icon: CalendarDays,
    moduleColor: MODULE_COLORS.primary,
  },
  {
    id: "profile",
    label: "Profile",
    description: "Driver photo and account details",
    path: ROUTES.profile,
    icon: UserRound,
    moduleColor: MODULE_COLORS.primary,
  },
  {
    id: "settings",
    label: "Settings",
    description: "Theme and notification preferences",
    path: ROUTES.settings,
    icon: Settings,
    moduleColor: MODULE_COLORS.slate,
  },
  {
    id: "support",
    label: "Support",
    description: "Help, FAQ, and contacts",
    path: ROUTES.support,
    icon: CircleHelp,
    moduleColor: MODULE_COLORS.transport,
  },
];

/** Resolve which primary tab is active for a given pathname. */
export function getActivePrimaryNavId(pathname: string): PrimaryNavItem["id"] {
  if (pathname === ROUTES.home) return "home";
  if (pathname.startsWith(ROUTES.attendance)) return "attendance";
  if (pathname.startsWith(ROUTES.notifications)) return "notifications";
  if (pathname.startsWith(ROUTES.emergency)) return "emergency";
  if (pathname.startsWith(ROUTES.more)) return "more";
  return "home";
}

export function getPrimaryNavItem(id: PrimaryNavItem["id"]): PrimaryNavItem | undefined {
  return PRIMARY_NAV.find((item) => item.id === id);
}

export function getPageTitle(pathname: string): string {
  const primary = PRIMARY_NAV.find((item) => item.path === pathname);
  if (primary) return primary.label;

  const more = MORE_NAV.find((item) => item.path === pathname);
  if (more) return more.label;

  if (pathname === ROUTES.more) return "More";
  return "Transport";
}
