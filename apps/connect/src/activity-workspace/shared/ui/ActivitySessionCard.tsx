import {
  Trophy,
  CalendarDays,
  Medal,
  Users,
  Wrench,
  ClipboardCheck,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import type { ActivityCategoryId } from "@/activity-workspace/hub/categories";
import type { ActivityDisplayStatus } from "@/activity-workspace/hub/activity-types";
import { getActivityCategoryLabel } from "@/activity-workspace/hub/categories";
import type { TodayActivity } from "@/lib/activity/types";

const CATEGORY_META: Record<
  ActivityCategoryId,
  { icon: LucideIcon; tone: string }
> = {
  sports: { icon: Trophy, tone: "bg-primary/10 text-primary" },
  events: { icon: CalendarDays, tone: "bg-success/10 text-success" },
  competitions: { icon: Medal, tone: "bg-warning/15 text-warning-foreground" },
  clubs: { icon: Users, tone: "bg-primary/10 text-primary" },
  workshops: { icon: Wrench, tone: "bg-muted text-foreground" },
};

const STATUS_LABEL: Record<ActivityDisplayStatus, string> = {
  ongoing: "In progress",
  upcoming: "Upcoming",
  completed: "Completed",
};

const STATUS_VARIANT: Record<ActivityDisplayStatus, string> = {
  ongoing: "border-primary/30 bg-primary/5 text-primary",
  upcoming: "border-border bg-muted/30 text-muted-foreground",
  completed: "border-success/30 bg-success/5 text-success",
};

export function ActivitySessionCard({ activity }: { activity: TodayActivity }) {
  const meta = CATEGORY_META[activity.category];
  const Icon = meta.icon;

  return (
    <li className="activity-list-row flex min-w-0 items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/20">
      <div
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-lg",
          meta.tone,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{activity.title}</span>
          <Badge variant="outline" className={cn("text-[10px] capitalize", STATUS_VARIANT[activity.status])}>
            {STATUS_LABEL[activity.status]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {activity.time} · {activity.venue}
        </p>
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          {getActivityCategoryLabel(activity.category)} · {activity.participantCount} participants
        </p>
      </div>
    </li>
  );
}

export function ActivityCategoryIcon({
  category,
  className,
}: {
  category: ActivityCategoryId | "certificates" | "attendance";
  className?: string;
}) {
  const icons: Record<ActivityCategoryId | "certificates" | "attendance", LucideIcon> = {
    sports: Trophy,
    events: CalendarDays,
    competitions: Medal,
    clubs: Users,
    workshops: Wrench,
    certificates: FileText,
    attendance: ClipboardCheck,
  };
  const Icon = icons[category];
  return <Icon className={className} />;
}
