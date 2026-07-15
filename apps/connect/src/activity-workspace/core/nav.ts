import {
  Home,
  Trophy,
  Sparkles,
  ClipboardCheck,
  Award,
  MessageSquare,
  Bell,
  Megaphone,
  FileText,
  Dumbbell,
  CalendarDays,
  User as UserIcon,
} from "lucide-react";
import { ACTIVITY_WORKSPACE_BASE } from "./routes";

/**
 * Activity Coordinator workspace — primary navigation.
 */
export const ACTIVITY_NAV = [
  { to: ACTIVITY_WORKSPACE_BASE, label: "Dashboard", icon: Home },
  { to: `${ACTIVITY_WORKSPACE_BASE}/sports`, label: "Sports", icon: Trophy },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/extra-curricular`,
    label: "Extra-Curricular",
    icon: Sparkles,
  },
  { to: `${ACTIVITY_WORKSPACE_BASE}/attendance`, label: "Attendance", icon: ClipboardCheck },
  { to: `${ACTIVITY_WORKSPACE_BASE}/achievements`, label: "Achievements", icon: Award },
  { to: `${ACTIVITY_WORKSPACE_BASE}/messages`, label: "Messages", icon: MessageSquare },
  { to: `${ACTIVITY_WORKSPACE_BASE}/notifications`, label: "Notifications", icon: Bell },
  { to: `${ACTIVITY_WORKSPACE_BASE}/announcements`, label: "Announcements", icon: Megaphone },
  { to: `${ACTIVITY_WORKSPACE_BASE}/certificates`, label: "Certificates", icon: FileText },
  { to: `${ACTIVITY_WORKSPACE_BASE}/practice`, label: "Practice", icon: Dumbbell },
  { to: `${ACTIVITY_WORKSPACE_BASE}/calendar`, label: "Calendar", icon: CalendarDays },
  { to: "/profile", label: "Settings", icon: UserIcon },
] as const;

/** Mobile bottom bar — highest-touch modules. */
export const ACTIVITY_MOBILE_PRIMARY = [
  ACTIVITY_WORKSPACE_BASE,
  `${ACTIVITY_WORKSPACE_BASE}/sports`,
  `${ACTIVITY_WORKSPACE_BASE}/extra-curricular`,
  `${ACTIVITY_WORKSPACE_BASE}/messages`,
] as const;

export function getActivityNavItems() {
  return ACTIVITY_NAV;
}
