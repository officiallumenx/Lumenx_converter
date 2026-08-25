import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@lumenx/ui";

/** Friendly empty surface for Activity Coordinator screens. */
export function ActivityEmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
  className,
  compact,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  /** Tighter padding for inside panels. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "activity-empty-state flex flex-col items-center gap-3",
        compact && "gap-2 py-5 px-3",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-muted/70 text-muted-foreground",
          compact ? "size-9" : "size-11",
        )}
      >
        <Icon className={compact ? "size-4" : "size-5"} aria-hidden />
      </span>
      <div className="space-y-1 px-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <p className="mx-auto max-w-[16rem] text-xs leading-relaxed sm:max-w-xs">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-0.5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
