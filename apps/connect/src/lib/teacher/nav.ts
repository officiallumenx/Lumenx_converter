import {
  Home,
  LayoutGrid,
  ClipboardCheck,
  GraduationCap,
  BookOpen,
  NotebookPen,
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
  CalendarOff,
  Bus,
} from "lucide-react";
import { STUDENT_MODULE_COLORS } from "@/lib/student/nav";

/**
 * Teacher portal — ordered by daily workflow priority.
 * Dashboard first, Settings last.
 * Module colors match the shared palette for the same routes.
 */
export const TEACHER_NAV = [
  { to: "/", label: "Dashboard", icon: Home, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, moduleColor: STUDENT_MODULE_COLORS.green },
  { to: "/diary", label: "Diary Book", icon: NotebookPen, moduleColor: STUDENT_MODULE_COLORS.amber },
  { to: "/assignments", label: "Homework", icon: BookOpen, moduleColor: STUDENT_MODULE_COLORS.purple },
  { to: "/leave", label: "Leave", icon: CalendarOff, moduleColor: STUDENT_MODULE_COLORS.orange },
  { to: "/marks", label: "Marks", icon: GraduationCap, moduleColor: STUDENT_MODULE_COLORS.indigo },
  { to: "/exams", label: "Exams", icon: FileText, moduleColor: STUDENT_MODULE_COLORS.red },
  { to: "/students", label: "Students", icon: Users, moduleColor: STUDENT_MODULE_COLORS.navy },
  { to: "/classes", label: "My Classes", icon: LayoutGrid, moduleColor: STUDENT_MODULE_COLORS.teal },
  { to: "/remarks", label: "Remarks", icon: PenLine, moduleColor: STUDENT_MODULE_COLORS.violet },
  { to: "/timetable", label: "Timetable", icon: Calendar, moduleColor: STUDENT_MODULE_COLORS.blue },
  { to: "/messages", label: "Messages", icon: MessageSquare, moduleColor: STUDENT_MODULE_COLORS.cyan },
  { to: "/notifications", label: "Notifications", icon: Bell, moduleColor: STUDENT_MODULE_COLORS.crimson },
  { to: "/events", label: "Events", icon: CalendarDays, moduleColor: STUDENT_MODULE_COLORS.sky },
  { to: "/fees", label: "Fees", icon: Wallet, moduleColor: STUDENT_MODULE_COLORS.deepOrange },
  { to: "/transport", label: "Transport", icon: Bus, moduleColor: STUDENT_MODULE_COLORS.orange },
  { to: "/complaints", label: "Complaints", icon: ShieldAlert, moduleColor: STUDENT_MODULE_COLORS.scarlet },
  { to: "/profile", label: "Settings", icon: UserIcon, moduleColor: STUDENT_MODULE_COLORS.slate },
] as const;

export function getTeacherNavItems(hasTransport = false) {
  return TEACHER_NAV.filter((item) => item.to !== "/transport" || hasTransport);
}

/** Mobile bottom bar — highest-touch modules (Leave moved to More). */
export const TEACHER_MOBILE_PRIMARY = ["/", "/attendance", "/diary", "/assignments"] as const;

/** Bottom-nav labels — short names for the colored mobile bar. */
export const TEACHER_MOBILE_SHORT_LABELS: Record<string, string> = {
  "/": "Home",
  "/attendance": "Attendance",
  "/diary": "Diary",
  "/assignments": "Homework",
};
