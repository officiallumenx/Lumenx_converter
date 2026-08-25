import { Skeleton } from "@lumenx/ui";
import { cn } from "@lumenx/ui";

type Variant = "page" | "list" | "form" | "dashboard";

/**
 * Loading placeholders tuned for Activity screens (lighter than a full dashboard).
 */
export function PageSkeleton({
  rows = 4,
  variant = "page",
  className,
}: {
  rows?: number;
  variant?: Variant;
  className?: string;
}) {
  if (variant === "list") {
    return (
      <div className={cn("min-w-0 space-y-3", className)} aria-busy="true" aria-label="Loading">
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: Math.min(rows + 2, 6) }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className={cn("min-w-0 space-y-4", className)} aria-busy="true" aria-label="Loading">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={cn("min-w-0 space-y-5", className)} aria-busy="true" aria-label="Loading">
        <Skeleton className="h-28 w-full rounded-3xl sm:h-32" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0 space-y-4", className)} aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40 rounded-lg sm:w-56" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-2xl sm:h-32" />
      ))}
    </div>
  );
}
