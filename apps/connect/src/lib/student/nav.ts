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

const SETTINGS = { to: "/profile", label: "Settings", icon: UserIcon } as const;

/**
 * Student portal — ordered by daily usage priority.
 * Dashboard first, Settings always last.
 */
export const STUDENT_NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/transport", label: "Transport", icon: Bus },
  { to: "/assignments", label: "Assignments", icon: BookOpen },
  { to: "/marks", label: "Marks", icon: GraduationCap },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/exams", label: "Exams", icon: GraduationCap },
  { to: "/alerts", label: "Alerts", icon: Siren },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/academic-history", label: "Academic History", icon: History },
] as const;

/** Lower-frequency modules — before Settings in the full list. */
export const STUDENT_MORE_NAV = [
  { to: "/achievements", label: "Achievements", icon: Trophy },
  { to: "/growth", label: "Growth", icon: Sparkles },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/fees", label: "Fees", icon: Wallet },
  { to: "/sports", label: "Sports", icon: Trophy },
  { to: "/teachers", label: "Teachers", icon: Users },
  { to: "/certificates", label: "Certificates", icon: FileText },
  { to: "/id-card", label: "ID Card", icon: FileText },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert },
] as const;

/** Full sidebar list — priority order, Settings pinned last. */
export const STUDENT_ALL_NAV = [
  ...STUDENT_NAV,
  ...STUDENT_MORE_NAV.filter((m) => !STUDENT_NAV.some((n) => n.to === m.to)),
  SETTINGS,
] as const;

/** Mobile bottom bar — highest-touch modules. */
export const STUDENT_MOBILE_PRIMARY = ["/", "/attendance", "/assignments", "/timetable"] as const;
