import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
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
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import { cn } from "@lumenx/ui";

const MODULES: {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/sports`,
    label: "Sports",
    description: "Section → teams → students",
    icon: Trophy,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/extra-curricular`,
    label: "Extra-Curricular",
    description: "Section → teams → students",
    icon: Sparkles,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/attendance`,
    label: "Attendance",
    description: "Class-wise or team-wise",
    icon: ClipboardCheck,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/achievements`,
    label: "Achievements",
    description: "Filter Sports or ECA",
    icon: Award,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/messages`,
    label: "Messages",
    description: "Team-wise by Sports / ECA",
    icon: MessageSquare,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/notifications`,
    label: "Notifications",
    description: "Activity alerts only",
    icon: Bell,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/announcements`,
    label: "Announcements",
    description: "Send & receive",
    icon: Megaphone,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/certificates`,
    label: "Certificates",
    description: "By team with student names",
    icon: FileText,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/practice`,
    label: "Practice",
    description: "Assign by team & date",
    icon: Dumbbell,
  },
  {
    to: `${ACTIVITY_WORKSPACE_BASE}/calendar`,
    label: "Calendar",
    description: "Personal reminders",
    icon: CalendarDays,
  },
  {
    to: "/profile",
    label: "Settings",
    description: "Profile & role switch",
    icon: UserIcon,
  },
];

export function ActivityModuleGrid({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        return (
          <Link
            key={mod.to}
            to={mod.to}
            className="flex min-h-[6.5rem] flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
          >
            <Icon className="size-5 text-primary" aria-hidden />
            <span className="mt-2 font-medium text-sm">{mod.label}</span>
            <span className="mt-1 text-[10px] leading-snug text-muted-foreground">
              {mod.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
