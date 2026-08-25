import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

/** Consistent outer spacing for Activity Coordinator screens. */
export function ActivityPageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("activity-page min-w-0 space-y-5 sm:space-y-6", className)}>
      {children}
    </div>
  );
}
