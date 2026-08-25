import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@lumenx/ui";

export function EmptyState({
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
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-border bg-muted/40 px-5 py-8 text-center",
        compact && "gap-2 px-3 py-5",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-primary/10 text-primary",
          compact ? "size-10" : "size-12",
        )}
      >
        <Icon className={compact ? "size-5" : "size-6"} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-display text-sm font-semibold text-foreground sm:text-base">{title}</p>
        {description ? (
          <p className="mx-auto max-w-[16rem] text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
