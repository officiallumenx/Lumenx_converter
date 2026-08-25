import {
  Home,
  ClipboardCheck,
  GraduationCap,
  Calendar,
  History,
  Trophy,
  FileText,
  Bell,
  User as UserIcon,
  Sparkles,
  BookOpen,
  CalendarDays,
  Wallet,
  Users,
  MessageSquare,
  ShieldAlert,
  Siren,
  Bus,
} from "lucide-react";

export type StudentModuleColor = {
  primary: string;
  iconBackground: string;
};

export const STUDENT_MODULE_COLORS = {
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
  /** Differentiated variants for modules that share a semantic family */
  amber: { primary: "#D97706", iconBackground: "#FFFBEB" },
  sky: { primary: "#0EA5E9", iconBackground: "#E0F2FE" },
  violet: { primary: "#7C3AED", iconBackground: "#EDE9FE" },
  fuchsia: { primary: "#A855F7", iconBackground: "#FAE8FF" },
  rose: { primary: "#F43F5E", iconBackground: "#FFE4E6" },
  crimson: { primary: "#E11D48", iconBackground: "#FFE4E6" },
  scarlet: { primary: "#DC2626", iconBackground: "#FECACA" },
  deepOrange: { primary: "#EA580C", iconBackground: "#FFF7ED" },
} as const satisfies Record<string, StudentModuleColor>;

/** Semantic accent for notifications (used on dashboard and notification UI). */
export const STUDENT_NOTIFICATION_COLOR = STUDENT_MODULE_COLORS.crimson;

/** Inline styles for a module-colored icon chip */
export function studentModuleIconStyle(color: StudentModuleColor) {
  return { color: color.primary, backgroundColor: color.iconBackground };
}

export function isStudentRouteActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

/** Very light module tint for card surfaces — mixes with theme card color. */
export function studentModuleLightSurface(color: StudentModuleColor) {
  return `color-mix(in srgb, ${color.primary} 10%, var(--card))`;
}

/** Slightly stronger tint for icon chips on compact cards. */
export function studentModuleLightChip(color: StudentModuleColor) {
  return `color-mix(in srgb, ${color.primary} 20%, var(--card))`;
}

/** Light module shade for cards; subtle ring when selected. */
export function studentModuleCardStyle(color: StudentModuleColor, selected = false) {
  const surface = studentModuleLightSurface(color);
  if (selected) {
    return {
      backgroundColor: surface,
      borderColor: color.primary,
      boxShadow: `0 0 0 1px ${color.primary}, 0 4px 12px ${color.primary}14`,
    };
  }
  return {
    backgroundColor: surface,
    borderColor: `color-mix(in srgb, ${color.primary} 28%, var(--border))`,
  };
}


const SETTINGS = {
  to: "/profile",
  label: "Settings",
  icon: UserIcon,
  moduleColor: STUDENT_MODULE_COLORS.slate,
} as const;

/**
 * Student portal — ordered by daily usage priority.
 * Home first, Settings always last.
 */
export const STUDENT_NAV = [
  { to: "/", label: "Home", icon: Home, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, moduleColor: STUDENT_MODULE_COLORS.green },
  { to: "/transport", label: "Transport", icon: Bus, moduleColor: STUDENT_MODULE_COLORS.orange },
  { to: "/assignments", label: "Homework", icon: BookOpen, moduleColor: STUDENT_MODULE_COLORS.purple },
  { to: "/marks", label: "Marks", icon: GraduationCap, moduleColor: STUDENT_MODULE_COLORS.indigo },
  { to: "/timetable", label: "Timetable", icon: Calendar, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/exams", label: "Exams", icon: GraduationCap, moduleColor: STUDENT_MODULE_COLORS.red },
  { to: "/alerts", label: "Alerts", icon: Siren, moduleColor: STUDENT_MODULE_COLORS.rose },
  { to: "/notifications", label: "Notifications", icon: Bell, moduleColor: STUDENT_MODULE_COLORS.crimson },
  { to: "/messages", label: "Messages", icon: MessageSquare, moduleColor: STUDENT_MODULE_COLORS.cyan },
  { to: "/academic-history", label: "Academic History", icon: History, moduleColor: STUDENT_MODULE_COLORS.violet },
] as const;

/** Lower-frequency modules — before Settings in the full list. */
export const STUDENT_MORE_NAV = [
  { to: "/achievements", label: "Achievements", icon: Trophy, moduleColor: STUDENT_MODULE_COLORS.gold },
  { to: "/growth", label: "Growth", icon: Sparkles, moduleColor: STUDENT_MODULE_COLORS.teal },
  { to: "/events", label: "Events", icon: CalendarDays, moduleColor: STUDENT_MODULE_COLORS.sky },
  { to: "/fees", label: "Fees", icon: Wallet, moduleColor: STUDENT_MODULE_COLORS.deepOrange },
  { to: "/sports", label: "Sports", icon: Trophy, moduleColor: STUDENT_MODULE_COLORS.amber },
  { to: "/teachers", label: "Teachers", icon: Users, moduleColor: STUDENT_MODULE_COLORS.navy },
  { to: "/certificates", label: "Certificates", icon: FileText, moduleColor: STUDENT_MODULE_COLORS.fuchsia },
  { to: "/id-card", label: "ID Card", icon: FileText, moduleColor: STUDENT_MODULE_COLORS.slate },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert, moduleColor: STUDENT_MODULE_COLORS.scarlet },
] as const;

/** Full sidebar list — priority order, Settings pinned last. */
export const STUDENT_ALL_NAV = [
  ...STUDENT_NAV,
  ...STUDENT_MORE_NAV,
  SETTINGS,
] as const;

/** Mobile bottom bar — highest-touch modules. */
export const STUDENT_MOBILE_PRIMARY = ["/", "/attendance", "/assignments", "/timetable"] as const;

/** Bottom-nav labels — full names; layout allows 2 lines so they are not clipped. */
export const STUDENT_MOBILE_SHORT_LABELS: Record<string, string> = {
  "/": "Home",
  "/attendance": "Attendance",
  "/assignments": "Homework",
  "/timetable": "Timetable",
};

/** Icon chip for student mobile bottom nav — white item, color on icon only. */
export function studentMobileNavIconStyle(color: StudentModuleColor, active: boolean) {
  if (active) {
    return { color: "#FFFFFF", backgroundColor: color.primary };
  }
  return { color: color.primary, backgroundColor: studentModuleLightChip(color) };
}

/** More-menu tile: white surface, module accent on icon / border when active. */
export function studentMoreTileStyle(color: StudentModuleColor, active: boolean) {
  if (active) {
    return {
      borderColor: color.primary,
      boxShadow: `0 0 0 1px ${color.primary}`,
    };
  }
  return {
    borderColor: `${color.primary}28`,
  };
}

export function getStudentNavItem(path: string) {
  return STUDENT_ALL_NAV.find((item) => item.to === path);
}

export function getStudentModuleColor(pathname: string): StudentModuleColor {
  const item = STUDENT_ALL_NAV.find(({ to }) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`),
  );
  return item?.moduleColor ?? STUDENT_MODULE_COLORS.blue;
}
