import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

/**
 * Horizontally scrollable filter/chip row — better on narrow phones.
 * Presentation only; does not change filter logic.
 */
export function ActivityFilterBar({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? <p className="activity-stat-label mb-2">{label}</p> : null}
      <div className="activity-filter-bar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {children}
      </div>
    </div>
  );
}
