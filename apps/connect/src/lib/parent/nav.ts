import {
  Home,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Calendar,
  Wallet,
  MessageSquare,
  Bell,
  User as UserIcon,
  CalendarDays,
  Trophy,
  Users,
  ShieldAlert,
  Siren,
  Sparkles,
  FileText,
  CalendarOff,
  Bus,
  History,
  Award,
} from "lucide-react";
import { STUDENT_MODULE_COLORS } from "@/lib/student/nav";

const SETTINGS = {
  to: "/profile",
  label: "Settings",
  icon: UserIcon,
  moduleColor: STUDENT_MODULE_COLORS.slate,
} as const;

/**
 * Parent portal — ordered by daily usage priority.
 * Dashboard first, Settings always last (via getParentNav).
 * Module colors match the student portal palette for the same routes.
 */
export const PARENT_NAV = [
  { to: "/", label: "Home", icon: Home, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/alerts", label: "Alerts", icon: Siren, moduleColor: STUDENT_MODULE_COLORS.rose },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, moduleColor: STUDENT_MODULE_COLORS.green },
  { to: "/transport", label: "Transport", icon: Bus, moduleColor: STUDENT_MODULE_COLORS.orange },
  { to: "/leave", label: "Leave", icon: CalendarOff, moduleColor: STUDENT_MODULE_COLORS.amber },
  { to: "/assignments", label: "Homework", icon: BookOpen, moduleColor: STUDENT_MODULE_COLORS.purple },
  { to: "/marks", label: "Marks", icon: GraduationCap, moduleColor: STUDENT_MODULE_COLORS.indigo },
  { to: "/academic-history", label: "Academic History", icon: History, moduleColor: STUDENT_MODULE_COLORS.violet },
  { to: "/achievements", label: "Achievements", icon: Award, moduleColor: STUDENT_MODULE_COLORS.gold },
  { to: "/certificates", label: "Certificates", icon: FileText, moduleColor: STUDENT_MODULE_COLORS.fuchsia },
  { to: "/exams", label: "Exams", icon: GraduationCap, moduleColor: STUDENT_MODULE_COLORS.red },
  { to: "/fees", label: "Fees", icon: Wallet, moduleColor: STUDENT_MODULE_COLORS.deepOrange },
  { to: "/messages", label: "Messages", icon: MessageSquare, moduleColor: STUDENT_MODULE_COLORS.cyan },
  { to: "/timetable", label: "Timetable", icon: Calendar, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/id-card", label: "ID Card", icon: FileText, moduleColor: STUDENT_MODULE_COLORS.slate },
  { to: "/notifications", label: "Notifications", icon: Bell, moduleColor: STUDENT_MODULE_COLORS.crimson },
] as const;

/** Lower-frequency modules — inserted before Settings. */
export const PARENT_MORE_NAV = [
  { to: "/events", label: "Events", icon: CalendarDays, moduleColor: STUDENT_MODULE_COLORS.sky },
  { to: "/teachers", label: "Teachers", icon: Users, moduleColor: STUDENT_MODULE_COLORS.navy },
  { to: "/sports", label: "Sports", icon: Trophy, moduleColor: STUDENT_MODULE_COLORS.amber },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert, moduleColor: STUDENT_MODULE_COLORS.scarlet },
] as const;

/** On-behalf student modules — before Settings when enabled. */
export const PARENT_DELEGATED_NAV = [
  { to: "/growth", label: "Growth", icon: Sparkles, moduleColor: STUDENT_MODULE_COLORS.teal },
] as const;

export function getParentNav(studentIncludedMode: boolean) {
  type ParentNavItem =
    | (typeof PARENT_NAV)[number]
    | (typeof PARENT_MORE_NAV)[number]
    | (typeof PARENT_DELEGATED_NAV)[number]
    | typeof SETTINGS;
  const items: ParentNavItem[] = [
    ...PARENT_NAV,
    ...PARENT_MORE_NAV.filter(
      (m) => !(PARENT_NAV as readonly { readonly to: string }[]).some((n) => n.to === m.to),
    ),
  ];
  if (studentIncludedMode) {
    for (const d of PARENT_DELEGATED_NAV) {
      if (!items.some((n) => n.to === d.to)) items.push(d);
    }
  }
  return [...items, SETTINGS];
}

/** Mobile bottom bar — Transport instead of Timetable for parents. */
export const PARENT_MOBILE_PRIMARY = ["/", "/attendance", "/assignments", "/transport"] as const;
/** When student-included mode is on, Growth replaces Transport in the primary bar. */
export const PARENT_MOBILE_PRIMARY_DELEGATED = ["/", "/attendance", "/assignments", "/growth"] as const;

/** Bottom-nav labels — short names for the colored mobile bar. */
export const PARENT_MOBILE_SHORT_LABELS: Record<string, string> = {
  "/": "Home",
  "/attendance": "Attendance",
  "/assignments": "Homework",
  "/transport": "Transport",
  "/growth": "Growth",
};

export function getParentNavItem(path: string) {
  return [...PARENT_NAV, ...PARENT_MORE_NAV, ...PARENT_DELEGATED_NAV, SETTINGS].find(
    (item) => item.to === path,
  );
}

export function isParentRouteActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}
