import { Skeleton } from "@lumenx/ui";

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="min-w-0 space-y-4" role="status" aria-live="polite" aria-label="Loading content">
      <span className="sr-only">Loading content</span>
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl" />
      ))}
    </div>
  );
}
