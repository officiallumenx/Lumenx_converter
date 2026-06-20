import type { ReactNode } from "react";
import { Skeleton } from "@lumenx/ui";

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-5 w-72 max-w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
