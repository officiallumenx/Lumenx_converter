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

const SETTINGS = { to: "/profile", label: "Settings", icon: UserIcon } as const;

/**
 * Parent portal — ordered by daily usage priority.
 * Dashboard first, Settings always last (via getParentNav).
 */
export const PARENT_NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/alerts", label: "Alerts", icon: Siren },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/transport", label: "Transport", icon: Bus },
  { to: "/leave", label: "Leave", icon: CalendarOff },
  { to: "/assignments", label: "Homework", icon: BookOpen },
  { to: "/marks", label: "Marks", icon: GraduationCap },
  { to: "/academic-history", label: "Academic History", icon: History },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/certificates", label: "Certificates", icon: FileText },
  { to: "/exams", label: "Exams", icon: GraduationCap },
  { to: "/fees", label: "Fees", icon: Wallet },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/id-card", label: "ID Card", icon: FileText },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

/** Lower-frequency modules — inserted before Settings. */
export const PARENT_MORE_NAV = [
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/teachers", label: "Teachers", icon: Users },
  { to: "/sports", label: "Sports", icon: Trophy },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert },
] as const;

/** On-behalf student modules — before Settings when enabled. */
export const PARENT_DELEGATED_NAV = [{ to: "/growth", label: "Growth", icon: Sparkles }] as const;

export function getParentNav(studentIncludedMode: boolean) {
  const items = [
    ...PARENT_NAV,
    ...PARENT_MORE_NAV.filter((m) => !PARENT_NAV.some((n) => n.to === m.to)),
  ];
  if (studentIncludedMode) {
    for (const d of PARENT_DELEGATED_NAV) {
      if (!items.some((n) => n.to === d.to)) items.push(d);
    }
  }
  return [...items, SETTINGS];
}

/** Mobile bottom bar — highest-touch modules. */
export const PARENT_MOBILE_PRIMARY = ["/", "/alerts", "/attendance", "/assignments"] as const;
export const PARENT_MOBILE_PRIMARY_DELEGATED = ["/", "/alerts", "/attendance", "/growth"] as const;
