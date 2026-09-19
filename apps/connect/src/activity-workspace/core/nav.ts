import {
  Home,
  Trophy,
  Sparkles,
  ClipboardCheck,
  NotebookPen,
  Award,
  MessageSquare,
  Bell,
  Megaphone,
  Dumbbell,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { STUDENT_MODULE_COLORS, type StudentModuleColor } from "@/lib/student/nav";
import { ACTIVITY_WORKSPACE_BASE } from "./routes";
import type { ActivityModuleId } from "./types";

export const ACTIVITY_MODULE_ICONS: Record<ActivityModuleId, LucideIcon> = {
  dashboard: Home,
  sports: Trophy,
  "extra-curricular": Sparkles,
  attendance: ClipboardCheck,
  diary: NotebookPen,
  achievements: Award,
  messages: MessageSquare,
  notifications: Bell,
  announcements: Megaphone,
  practice: Dumbbell,
  calendar: CalendarDays,
  profile: UserIcon,
};

/** Shared palette — same semantic colors as student/parent/teacher where routes align. */
export const ACTIVITY_MODULE_COLORS: Record<ActivityModuleId, StudentModuleColor> = {
  dashboard: STUDENT_MODULE_COLORS.blue,
  sports: STUDENT_MODULE_COLORS.amber,
  "extra-curricular": STUDENT_MODULE_COLORS.teal,
  attendance: STUDENT_MODULE_COLORS.green,
  diary: STUDENT_MODULE_COLORS.violet,
  achievements: STUDENT_MODULE_COLORS.gold,
  messages: STUDENT_MODULE_COLORS.cyan,
  notifications: STUDENT_MODULE_COLORS.crimson,
  announcements: STUDENT_MODULE_COLORS.rose,
  practice: STUDENT_MODULE_COLORS.orange,
  calendar: STUDENT_MODULE_COLORS.sky,
  profile: STUDENT_MODULE_COLORS.slate,
};

/**
 * Activity Coordinator workspace — primary navigation (finalized V1 modules).
 * Uses shortLabel where available for mobile / drawer clarity.
 * Built without Array.map so SSR/import-protection mocks cannot throw on `.label`.
 */
export const ACTIVITY_NAV = [
  {
    to: ACTIVITY_WORKSPACE_BASE,
    label: "Home",
    icon: Home,
    moduleColor: STUDENT_MODULE_COLORS.blue,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/sports`,
    label: "Sports",
    icon: Trophy,
    moduleColor: STUDENT_MODULE_COLORS.amber,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/extra-curricular`,
    label: "ECA",
    icon: Sparkles,
    moduleColor: STUDENT_MODULE_COLORS.teal,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/attendance`,
    label: "Attendance",
    icon: ClipboardCheck,
    moduleColor: STUDENT_MODULE_COLORS.green,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/diary`,
    label: "Diary",
    icon: NotebookPen,
    moduleColor: STUDENT_MODULE_COLORS.violet,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/achievements`,
    label: "Achievements",
    icon: Award,
    moduleColor: STUDENT_MODULE_COLORS.gold,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/messages`,
    label: "Messages",
    icon: MessageSquare,
    moduleColor: STUDENT_MODULE_COLORS.cyan,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/notifications`,
    label: "Notifications",
    icon: Bell,
    moduleColor: STUDENT_MODULE_COLORS.crimson,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/announcements`,
    label: "Announcements",
    icon: Megaphone,
    moduleColor: STUDENT_MODULE_COLORS.rose,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/practice`,
    label: "Practice",
    icon: Dumbbell,
    moduleColor: STUDENT_MODULE_COLORS.orange,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/calendar`,
    label: "Calendar",
    icon: CalendarDays,
    moduleColor: STUDENT_MODULE_COLORS.sky,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/profile`,
    label: "Settings",
    icon: UserIcon,
    moduleColor: STUDENT_MODULE_COLORS.slate,
  },
] as const satisfies readonly {
  to: string;
  label: string;
  icon: LucideIcon;
  moduleColor: StudentModuleColor;
}[];

/** Mobile bottom bar — daily coordinator touchpoints (ECA stays in More). */
export const ACTIVITY_MOBILE_PRIMARY = [
  ACTIVITY_WORKSPACE_BASE,
  `${ACTIVITY_WORKSPACE_BASE}/sports`,
  `${ACTIVITY_WORKSPACE_BASE}/diary`,
  `${ACTIVITY_WORKSPACE_BASE}/attendance`,
] as const;

/** Bottom-nav labels — short names for the colored mobile bar. */
export const ACTIVITY_MOBILE_SHORT_LABELS: Record<string, string> = {
  [ACTIVITY_WORKSPACE_BASE]: "Home",
  [`${ACTIVITY_WORKSPACE_BASE}/sports`]: "Sports",
  [`${ACTIVITY_WORKSPACE_BASE}/diary`]: "Diary",
  [`${ACTIVITY_WORKSPACE_BASE}/attendance`]: "Attendance",
};

export function getActivityNavItems() {
  return ACTIVITY_NAV;
}
