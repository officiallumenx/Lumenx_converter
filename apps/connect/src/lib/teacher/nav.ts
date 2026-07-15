import {
  Home,
  LayoutGrid,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Bell,
  ShieldAlert,
  User as UserIcon,
  CalendarDays,
  MessageSquare,
  FileText,
  PenLine,
  Wallet,
  Trophy,
  CalendarOff,
  Bus,
} from "lucide-react";

/**
 * Teacher portal — ordered by daily workflow priority.
 * Dashboard first, Settings last.
 */
export const TEACHER_NAV = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/leave", label: "Leave", icon: CalendarOff },
  { to: "/assignments", label: "Assignments", icon: BookOpen },
  { to: "/marks", label: "Marks", icon: GraduationCap },
  { to: "/exams", label: "Exams", icon: FileText },
  { to: "/students", label: "Students", icon: Users },
  { to: "/classes", label: "My Classes", icon: LayoutGrid },
  { to: "/remarks", label: "Remarks", icon: PenLine },
  { to: "/timetable", label: "Timetable", icon: Calendar },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/fees", label: "Fees", icon: Wallet },
  { to: "/transport", label: "Transport", icon: Bus },
  { to: "/sports", label: "Sports", icon: Trophy },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert },
  { to: "/profile", label: "Settings", icon: UserIcon },
] as const;

export function getTeacherNavItems(hasTransport = false) {
  return TEACHER_NAV.filter((item) => item.to !== "/transport" || hasTransport);
}

/** Mobile bottom bar — highest-touch modules. */
export const TEACHER_MOBILE_PRIMARY = ["/", "/attendance", "/leave", "/assignments"] as const;
