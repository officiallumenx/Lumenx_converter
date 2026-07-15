import { Skeleton } from "@lumenx/ui";

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300" role="status" aria-live="polite" aria-label="Loading content">
      <span className="sr-only">Loading content</span>
      <Skeleton className="h-10 w-48 rounded-xl" />
      <Skeleton className="h-5 w-72 max-w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}
