import { cn } from "@lumenx/ui";
import type { ActivityTimelineItem } from "@/activity-workspace/hub/timeline";
import { ActivityCategoryIcon } from "./ActivitySessionCard";

export function ActivityTimelineItem({ item }: { item: ActivityTimelineItem }) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <div className="grid size-8 place-items-center rounded-full border border-border bg-card shadow-soft">
          <ActivityCategoryIcon category={item.category} className="size-3.5 text-primary" />
        </div>
        <div className="mt-1 w-px flex-1 bg-border" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-medium">{item.action}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{item.timeAgo}</p>
      </div>
    </li>
  );
}
